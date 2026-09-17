import axios from 'axios';
import { buildSystemPrompt, buildUserPrompt } from './systemPrompt';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Default model options per provider — free-tier / auto routing
export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)', free: true },
  { id: 'openrouter/auto', label: '✨ Auto Router (Best available free model)', free: true },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)', free: true },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (Free)', free: true },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)', free: true },
  { id: 'qwen/qwen3-30b-a3b', label: 'Qwen3 30B (Paid)', free: false },
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Free)', free: true },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Free)', free: true },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Free)', free: true },
];

// Models that must NOT use response_format: json_object
const NO_JSON_FORMAT = [
  'openrouter/auto',
  'deepseek/deepseek-r1',
  'mixtral-8x7b-32768',
  'mistral-7b-instruct',
];

// Fallback model used for auto-retry on parse failure
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/** Build request headers for a given provider + key */
function buildHeaders(provider, apiKey) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Roadster — AI Learning Roadmap';
  }
  return headers;
}

/** Resolve the correct key from settings based on provider */
function resolveKey(settings) {
  return settings.provider === 'groq'
    ? (settings.groqKey || settings.apiKey)
    : (settings.openrouterKey || settings.apiKey);
}

/**
 * Multi-strategy JSON parser — tries 7 extraction methods before giving up.
 * Handles: DeepSeek <think> blocks, markdown fences, prose preamble,
 * brace scanning, control characters, truncated JSON.
 */
function parseJsonRobust(raw) {
  // 1️⃣ Strip DeepSeek <think>...</think> reasoning blocks
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2️⃣ Strip invisible / control characters that break JSON.parse
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3️⃣ Direct parse (works when response_format: json_object is honoured)
  try { return JSON.parse(text); } catch (_) {}

  // 4️⃣ Extract from ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
  }

  // 5️⃣ Strip prose before first { or [ and after last } or ]
  const stripped = text
    .replace(/^[^{[]*/, '')
    .replace(/[^}\]]*$/, '');
  if (stripped) {
    try { return JSON.parse(stripped); } catch (_) {}
  }

  // 6️⃣ Brace-depth scan — find outermost complete { ... }
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }

  // 7️⃣ Nothing worked — log raw for debugging and throw descriptive error
  console.error('[Roadster] All parse strategies failed. Raw snippet:\n', text.slice(0, 600));
  throw new Error('__parse_failed__');
}

/**
 * Make one completion call and return the parsed JSON result.
 */
async function callModel(baseURL, headers, model, topic, userProfile) {
  const useJsonMode = !NO_JSON_FORMAT.some(m => model.includes(m));

  const payload = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(topic, userProfile) },
    ],
    temperature: 0.7,
    max_tokens: 6000,
    ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await axios.post(`${baseURL}/chat/completions`, payload, { headers, timeout: 90000 });
  const content = response.data.choices?.[0]?.message?.content;

  if (!content) throw new Error('Empty response from AI model. Please try again.');

  console.debug('[Roadster] Model:', model, '| snippet:', content.slice(0, 200));

  return parseJsonRobust(content);
}

/**
 * Test whether a specific model is accessible with the given API key.
 */
export async function testModel(provider, apiKey, modelId) {
  const baseURL = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const headers = buildHeaders(provider, apiKey);

  try {
    await axios.post(
      `${baseURL}/chat/completions`,
      { model: modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 },
      { headers, timeout: 12000 }
    );
    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || '';
    const isPaidOnly =
      status === 402 ||
      /payment|billing|credit|insufficient|free.*unavailable|not available for free/i.test(msg);

    if (status === 401) return { ok: false, error: 'Invalid API key.' };
    if (status === 429) return { ok: false, error: 'Rate limit hit — try again in a moment.' };
    if (isPaidOnly)     return { ok: false, error: 'This model requires a paid account.', paid: true };
    return { ok: false, error: msg || 'Model is unavailable.' };
  }
}

/**
 * Generate a personalized learning roadmap using AI.
 * Automatically retries with a stable fallback model if parsing fails.
 */
export async function generateRoadmap(topic, userProfile, settings) {
  const { provider = 'openrouter', model } = settings;
  const apiKey = resolveKey(settings);

  if (!apiKey) throw new Error('API key is required. Click "Add API Key" to configure.');

  const baseURL       = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const selectedModel = model || (provider === 'groq' ? GROQ_MODELS[0].id : OPENROUTER_MODELS[0].id);
  const headers       = buildHeaders(provider, apiKey);

  const handleApiError = (err) => {
    const status = err.response?.status;
    const apiMsg = err.response?.data?.error?.message;
    if (status === 401) throw new Error('Invalid API key. Please check your credentials.');
    if (status === 402) throw new Error('This model requires credits. Switch to a free model in Settings.');
    if (status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    if (status === 500) throw new Error('The AI provider had a server error. Please try a different model.');
    if (apiMsg)         throw new Error(apiMsg);
    throw err;
  };

  // ── Primary attempt ──
  try {
    return await callModel(baseURL, headers, selectedModel, topic, userProfile);
  } catch (err) {
    // If it's a parse failure and we're on openrouter, retry with the reliable fallback
    if (
      err.message === '__parse_failed__' &&
      provider === 'openrouter' &&
      selectedModel !== FALLBACK_MODEL
    ) {
      console.warn('[Roadster] Parse failed, retrying with fallback model:', FALLBACK_MODEL);
      try {
        return await callModel(baseURL, headers, FALLBACK_MODEL, topic, userProfile);
      } catch (fallbackErr) {
        if (fallbackErr.message === '__parse_failed__') {
          throw new Error('Could not parse AI response as JSON. Please try again or switch to a different model in Settings.');
        }
        handleApiError(fallbackErr);
      }
    }

    // If parse failed with no fallback available
    if (err.message === '__parse_failed__') {
      throw new Error('Could not parse AI response as JSON. Please try again or switch model in Settings.');
    }

    handleApiError(err);
  }
}

/** Validate an API key by hitting the models list endpoint. */
export async function validateApiKey(provider, apiKey) {
  const baseURL = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  if (provider === 'openrouter') headers['HTTP-Referer'] = window.location.origin;
  try {
    await axios.get(`${baseURL}/models`, { headers, timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}
