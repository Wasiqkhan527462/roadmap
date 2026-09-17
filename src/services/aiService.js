import axios from 'axios';
import { buildSystemPrompt, buildUserPrompt } from './systemPrompt';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OLLAMA_DEFAULT_URL = 'http://localhost:11434/v1';

// Default model options per provider — free-tier
export const OPENROUTER_MODELS = [
  { id: 'openrouter/auto',                   label: '✨ Auto Router (Recommended)', free: true  },
  { id: 'google/gemma-2-9b-it:free',         label: 'Gemma 2 9B (Free)',            free: true  },
  { id: 'deepseek/deepseek-r1:free',         label: 'DeepSeek R1 (Free)',            free: true  },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (Paid)',         free: false },
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Free)', free: true },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B Instant (Free)',    free: true },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B (Free)',            free: true },
];

export const OLLAMA_MODELS = [
  { id: 'llama3.2',    label: 'Llama 3.2 (3B - Fast & Free)', free: true },
  { id: 'llama3.1:8b', label: 'Llama 3.1 (8B - Balanced)',    free: true },
  { id: 'qwen2.5',     label: 'Qwen 2.5 (Free)',               free: true },
  { id: 'gemma2',      label: 'Gemma 2 (Free)',                free: true },
  { id: 'mistral',     label: 'Mistral (Free)',                free: true },
];

// Models that must NOT use response_format: json_object
const NO_JSON_FORMAT = [
  'openrouter/auto',
  'deepseek/deepseek-r1',
  'mixtral-8x7b-32768',
];

// OpenRouter fallback for auto-retry on parse/empty failure
const OR_FALLBACK = 'openrouter/auto';
// Groq fallback
const GROQ_FALLBACK = 'llama-3.1-8b-instant';
// Ollama fallback
const OLLAMA_FALLBACK = 'llama3.2';

/** Build request headers */
function buildHeaders(provider, apiKey) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Roadster — AI Learning Roadmap';
  }
  return headers;
}

/** Resolve the correct key from settings */
function resolveKey(settings) {
  if (settings.provider === 'groq') return settings.groqKey || settings.apiKey || '';
  if (settings.provider === 'ollama') return settings.ollamaKey || settings.apiKey || 'ollama';
  return settings.openrouterKey || settings.apiKey || '';
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
 * Validate that the roadmap has sufficient phases for the requested level.
 * Throws a sentinel error so the caller can retry.
 */
function validateRoadmap(roadmap, userProfile) {
  const phases = roadmap?.phases;
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error('__incomplete_roadmap__');
  }

  const levelStr = (userProfile?.targetLevel || '').toLowerCase();
  let minPhases = 3;
  if (levelStr.includes('basic') || levelStr.includes('beginner')) {
    minPhases = 3;
  } else if (levelStr.includes('intermediate')) {
    minPhases = 4;
  } else if (levelStr.includes('advanced')) {
    minPhases = 5;
  } else {
    minPhases = 5;
  }

  if (phases.length < minPhases) {
    console.warn(`[Roadster] Incomplete roadmap for target level "${userProfile?.targetLevel}": received ${phases.length} phase(s), expected at least ${minPhases}. Retrying…`);
    throw new Error('__incomplete_roadmap__');
  }
  return roadmap;
}

/** Make one completion API call and return parsed + validated roadmap JSON */
async function callModel(baseURL, headers, model, topic, userProfile) {
  const useJsonMode = !NO_JSON_FORMAT.some(m => model.includes(m));
  const isGroq = baseURL.includes('groq');

  const payload = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(topic, userProfile) },
    ],
    temperature: 0.7,
    max_tokens: isGroq ? 8000 : 8000,
    ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await axios.post(
    `${baseURL}/chat/completions`,
    payload,
    { headers, timeout: 120000 } // 120s timeout
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
  return validateRoadmap(roadmap, userProfile);
}


/** Handle standard HTTP API errors */
function handleApiError(err) {
  const status = err.response?.status;
  const apiMsg = err.response?.data?.error?.message || '';

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    throw new Error('Request timed out. The AI provider is experiencing high traffic. Please try again or switch model in Settings.');
  }

  if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
    throw new Error('Could not connect to Ollama. Ensure Ollama server is running (e.g. `ollama serve`).');
  }

  if (status === 401) throw new Error('Invalid API key. Please check your credentials in Settings.');
  if (status === 402) throw new Error('This model requires credits. Switch to a free model in Settings.');
  if (status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  if (status === 503 || status === 500) throw new Error('AI provider server error. Try a different model in Settings.');
  if (apiMsg) throw new Error(apiMsg);
  throw err;
}

/**
 * Test whether a specific model is accessible.
 */
export async function testModel(provider, apiKey, modelId, customUrl) {
  let baseURL;
  if (provider === 'groq') {
    baseURL = GROQ_BASE_URL;
  } else if (provider === 'ollama') {
    baseURL = (customUrl || OLLAMA_DEFAULT_URL).replace(/\/+$/, '');
  } else {
    baseURL = OPENROUTER_BASE_URL;
  }

  const headers = buildHeaders(provider, apiKey);

  try {
    await axios.post(
      `${baseURL}/chat/completions`,
      { model: modelId, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 },
      { headers, timeout: 15000 }
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
    if (provider === 'ollama' && (err.code === 'ECONNREFUSED' || msg.includes('Network Error'))) {
      return { ok: false, error: 'Could not connect to Ollama endpoint. Ensure Ollama is running (`ollama serve`).' };
    }
    return { ok: false, error: msg || 'Model is unavailable.' };
  }
}

/** Validate an API key or provider endpoint */
export async function validateApiKey(provider, apiKey, customUrl) {
  let baseURL;
  if (provider === 'groq') {
    baseURL = GROQ_BASE_URL;
  } else if (provider === 'ollama') {
    baseURL = (customUrl || OLLAMA_DEFAULT_URL).replace(/\/+$/, '');
  } else {
    baseURL = OPENROUTER_BASE_URL;
  }

  const headers = buildHeaders(provider, apiKey);

  try {
    await axios.get(`${baseURL}/models`, { headers, timeout: 8000 });
    return true;
  } catch {
    if (provider === 'ollama') {
      try {
        const rootUrl = baseURL.replace(/\/v1\/?$/, '');
        await axios.get(`${rootUrl}/api/tags`, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Generate a personalized learning roadmap.
 * Auto-retries with a fallback model on empty/parse/timeout failures.
 */
export async function generateRoadmap(topic, userProfile, settings) {
  const { provider = 'groq', model } = settings;
  const apiKey = resolveKey(settings);

  if (!apiKey && provider !== 'ollama') {
    throw new Error('API key is required. Click "Add API Key" to configure.');
  }

  let baseURL;
  if (provider === 'groq') {
    baseURL = GROQ_BASE_URL;
  } else if (provider === 'ollama') {
    baseURL = (settings.ollamaUrl || OLLAMA_DEFAULT_URL).replace(/\/+$/, '');
  } else {
    baseURL = OPENROUTER_BASE_URL;
  }

  let selectedModel = model;
  if (!selectedModel || selectedModel.includes('mistral') || selectedModel.includes('gemma-3')) {
    selectedModel = provider === 'groq' ? GROQ_MODELS[0].id : provider === 'ollama' ? OLLAMA_MODELS[0].id : OPENROUTER_MODELS[0].id;
  }

  const fallbackModel = provider === 'groq' ? GROQ_FALLBACK : provider === 'ollama' ? OLLAMA_FALLBACK : OR_FALLBACK;
  const headers       = buildHeaders(provider, apiKey);

  const isTimeoutErr = (err) => err.code === 'ECONNABORTED' || err.message?.includes('timeout');
  const isRetryable = (err) =>
    ['__parse_failed__', '__empty_response__', '__incomplete_roadmap__'].includes(err.message) || isTimeoutErr(err);

  // ── Primary attempt ──
  try {
    return await callModel(baseURL, headers, selectedModel, topic, userProfile);
  } catch (primaryErr) {
    if (isRetryable(primaryErr) && selectedModel !== fallbackModel) {
      console.warn(`[Roadster] Primary model "${selectedModel}" failed (${primaryErr.message}). Auto-retrying with fallback model "${fallbackModel}"…`);
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
