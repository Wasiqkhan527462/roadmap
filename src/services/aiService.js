import axios from 'axios';
import { buildSystemPrompt, buildUserPrompt } from './systemPrompt';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Default model options per provider — free-tier / auto routing
export const OPENROUTER_MODELS = [
  { id: 'openrouter/auto', label: '✨ Auto Router (Best available free model)', free: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)', free: true },
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
 * Test whether a specific model is accessible with the given API key.
 * Sends a minimal 1-token request and returns a status result.
 * @param {string} provider - 'openrouter' | 'groq'
 * @param {string} apiKey
 * @param {string} modelId
 * @returns {Promise<{ ok: boolean, error?: string, paid?: boolean }>}
 */
export async function testModel(provider, apiKey, modelId) {
  const baseURL = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const headers = buildHeaders(provider, apiKey);

  try {
    await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: modelId,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      },
      { headers, timeout: 12000 }
    );
    return { ok: true };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || '';

    // Detect paid-only / billing errors
    const isPaidOnly =
      status === 402 ||
      /payment|billing|credit|insufficient|free.*unavailable|not available for free/i.test(msg);

    if (status === 401) return { ok: false, error: 'Invalid API key.' };
    if (status === 429) return { ok: false, error: 'Rate limit hit — try again in a moment.' };
    if (isPaidOnly) return { ok: false, error: 'This model requires a paid account.', paid: true };

    return { ok: false, error: msg || 'Model is unavailable.' };
  }
}

/**
 * Generate a personalized learning roadmap using AI
 * @param {string} topic - Learning topic
 * @param {object} userProfile - { background, career, timePerWeek, learningStyle }
 * @param {object} settings - { provider: 'openrouter'|'groq', apiKey, model }
 * @returns {Promise<object>} Parsed roadmap JSON
 */
export async function generateRoadmap(topic, userProfile, settings) {
  const { provider = 'openrouter', model } = settings;
  const apiKey = resolveKey(settings);

  if (!apiKey) throw new Error('API key is required');

  const baseURL = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const selectedModel = model || (provider === 'groq' ? GROQ_MODELS[0].id : OPENROUTER_MODELS[0].id);
  const headers = buildHeaders(provider, apiKey);

  const payload = {
    model: selectedModel,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(topic, userProfile) },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  // openrouter/auto doesn't support response_format — rely on markdown fallback parser
  if (selectedModel === 'openrouter/auto') {
    delete payload.response_format;
  }

  try {
    const response = await axios.post(`${baseURL}/chat/completions`, payload, { headers });
    const content = response.data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response from AI model');

    // Parse JSON — handle cases where model still wraps in markdown
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    return parsed;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('Invalid API key. Please check your credentials.');
    }
    if (err.response?.status === 402) {
      throw new Error('This model requires credits. Switch to a free model in Settings.');
    }
    if (err.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    if (err.response?.data?.error?.message) {
      throw new Error(err.response.data.error.message);
    }
    throw err;
  }
}

// Validate API key by making a cheap models list call
export async function validateApiKey(provider, apiKey) {
  const baseURL = provider === 'groq' ? GROQ_BASE_URL : OPENROUTER_BASE_URL;
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
  }
  try {
    await axios.get(`${baseURL}/models`, { headers, timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}
