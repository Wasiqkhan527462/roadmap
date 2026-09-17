import axios from 'axios';
import { buildSystemPrompt, buildUserPrompt } from './systemPrompt';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Default model options per provider — free-tier
export const OPENROUTER_MODELS = [
  { id: 'google/gemma-3-27b-it:free',        label: 'Gemma 3 27B (Free)',             free: true  },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)',              free: true  },
  { id: 'deepseek/deepseek-r1:free',          label: 'DeepSeek R1 (Free)',             free: true  },
  { id: 'openrouter/auto',                    label: '✨ Auto Router (Best free)',      free: true  },
  { id: 'meta-llama/llama-3.3-70b-instruct',  label: 'Llama 3.3 70B (Paid)',          free: false },
  { id: 'qwen/qwen3-30b-a3b',                 label: 'Qwen3 30B (Paid)',              free: false },
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Free)', free: true },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B Instant (Free)',    free: true },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B (Free)',            free: true },
];

// Models that must NOT use response_format: json_object
const NO_JSON_FORMAT = [
  'openrouter/auto',
  'deepseek/deepseek-r1',
  'mixtral-8x7b-32768',
  'mistral-7b-instruct',
];

// OpenRouter fallback for auto-retry on parse/empty failure
const OR_FALLBACK = 'mistralai/mistral-7b-instruct:free';
// Groq fallback
const GROQ_FALLBACK = 'llama-3.1-8b-instant';

/** Build request headers */
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

/** Resolve the correct key from settings */
function resolveKey(settings) {
  return settings.provider === 'groq'
    ? (settings.groqKey || settings.apiKey)
    : (settings.openrouterKey || settings.apiKey);
}

/**
 * Extract text content from a completion response choice.
 * Handles: standard content, DeepSeek reasoning_content, concatenated fields.
 */
function extractContent(choice) {
  if (!choice) return null;
  const msg = choice.message || {};

  // Standard field
  if (msg.content && msg.content.trim()) return msg.content.trim();

  // DeepSeek R1 returns reasoning in reasoning_content, answer in content
  // Sometimes content is empty and the answer is in reasoning_content
  if (msg.reasoning_content && msg.reasoning_content.trim()) {
    return msg.reasoning_content.trim();
  }

  // Some models put it in delta (streaming fallback)
  if (choice.delta?.content && choice.delta.content.trim()) {
    return choice.delta.content.trim();
  }

  return null;
}

/**
 * Multi-strategy JSON parser — 7 extraction methods.
 */
function parseJsonRobust(raw) {
  // 1️⃣ Strip DeepSeek <think>...</think> blocks
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2️⃣ Strip control characters
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3️⃣ Direct parse
  try { return JSON.parse(text); } catch (_) {}

  // 4️⃣ Markdown code fence
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch (_) {} }

  // 5️⃣ Strip prose before/after JSON
  const stripped = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
  if (stripped) { try { return JSON.parse(stripped); } catch (_) {} }

  // 6️⃣ Brace-depth scan
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }

  console.error('[Roadster] All parse strategies failed. Snippet:\n', text.slice(0, 600));
  throw new Error('__parse_failed__');
}

/**
 * Validate that the roadmap has at least 5 phases.
 * Throws a sentinel error so the caller can retry.
 */
function validateRoadmap(roadmap) {
  const phases = roadmap?.phases;
  if (!Array.isArray(phases) || phases.length < 5) {
    console.warn(`[Roadster] Incomplete roadmap: only ${phases?.length ?? 0} phase(s). Retrying…`);
    throw new Error('__incomplete_roadmap__');
  }
  return roadmap;
}

/** Make one completion API call and return parsed + validated roadmap JSON */
async function callModel(baseURL, headers, model, topic, userProfile) {
  const useJsonMode = !NO_JSON_FORMAT.some(m => model.includes(m));
  // Groq supports up to 32k completion tokens; OpenRouter free models are more limited
  const isGroq = baseURL.includes('groq');

  const payload = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(topic, userProfile) },
    ],
    temperature: 0.7,
    max_tokens: isGroq ? 16000 : 8000,
    ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await axios.post(
    `${baseURL}/chat/completions`,
    payload,
    { headers, timeout: 90000 }
  );

  const choice = response.data.choices?.[0];
  const finishReason = choice?.finish_reason;
  const content = extractContent(choice);

  console.debug('[Roadster] Model:', model,
    '| finish_reason:', finishReason,
    '| content length:', content?.length ?? 0,
    '| snippet:', content?.slice(0, 150));

  if (finishReason === 'length') {
    console.warn('[Roadster] Response truncated (finish_reason: length). Increasing max_tokens may help.');
  }

  if (!content) {
    console.error('[Roadster] Empty content. Full response:', JSON.stringify(response.data, null, 2).slice(0, 800));
    throw new Error('__empty_response__');
  }

  const roadmap = parseJsonRobust(content);
  return validateRoadmap(roadmap);
}


/** Handle standard HTTP API errors */
function handleApiError(err) {
  const status = err.response?.status;
  const apiMsg = err.response?.data?.error?.message || '';

  if (status === 401) throw new Error('Invalid API key. Please check your credentials in Settings.');
  if (status === 402) throw new Error('This model requires credits. Switch to a free model in Settings.');
  if (status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  if (status === 503 || status === 500) throw new Error('AI provider server error. Try a different model in Settings.');
  if (apiMsg) throw new Error(apiMsg);
  throw err;
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
 * Generate a personalized learning roadmap.
 * Auto-retries with a fallback model on empty/parse failures.
 */
export async function generateRoadmap(topic, userProfile, settings) {
  const { provider = 'groq', model } = settings;
  const apiKey = resolveKey(settings);

  if (!apiKey) throw new Error('API key is required. Click "Add API Key" to configure.');

  const baseURL       = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const selectedModel = model || (provider === 'groq' ? GROQ_MODELS[0].id : OPENROUTER_MODELS[0].id);
  const fallbackModel = provider === 'groq' ? GROQ_FALLBACK : OR_FALLBACK;
  const headers       = buildHeaders(provider, apiKey);

  const RETRYABLE = ['__parse_failed__', '__empty_response__'];

  // ── Primary attempt ──
  try {
    return await callModel(baseURL, headers, selectedModel, topic, userProfile);
  } catch (primaryErr) {
    const isRetryable = RETRYABLE.includes(primaryErr.message);

    // Auto-retry with fallback on empty/parse issues (but not on same model)
    if (isRetryable && selectedModel !== fallbackModel) {
      console.warn(`[Roadster] Primary model "${selectedModel}" failed (${primaryErr.message}). Retrying with "${fallbackModel}"…`);
      try {
        return await callModel(baseURL, headers, fallbackModel, topic, userProfile);
      } catch (fallbackErr) {
        if (fallbackErr.message === '__empty_response__') {
          throw new Error('Both models returned empty responses. The API may be rate-limiting — please wait 30 seconds and try again.');
        }
        if (fallbackErr.message === '__parse_failed__') {
          throw new Error('Could not parse AI response. Please try again or switch model in Settings.');
        }
        handleApiError(fallbackErr);
      }
    }

    if (primaryErr.message === '__empty_response__') {
      throw new Error('AI model returned an empty response. Try switching to a different model in Settings, or wait a moment and retry.');
    }
    if (primaryErr.message === '__parse_failed__') {
      throw new Error('Could not parse AI response as JSON. Please try again or switch model in Settings.');
    }

    handleApiError(primaryErr);
  }
}

/** Validate an API key */
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
