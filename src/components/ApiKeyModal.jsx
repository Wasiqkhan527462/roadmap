import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { OPENROUTER_MODELS, GROQ_MODELS, OLLAMA_MODELS, validateApiKey, testModel } from '../services/aiService';
import './ApiKeyModal.css';

export default function ApiKeyModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useApp();
  const [localKey, setLocalKey] = useState(settings.apiKey);
  const [localProvider, setLocalProvider] = useState(settings.provider);
  const [localModel, setLocalModel] = useState(settings.model);
  const [localOllamaUrl, setLocalOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434/v1');
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null); // null | 'valid' | 'invalid'
  const [modelTest, setModelTest] = useState(null); // null | { status: 'testing'|'ok'|'error'|'paid', msg: string }

  useEffect(() => {
    if (isOpen) {
      setLocalProvider(settings.provider);
      setLocalModel(settings.model);
      setLocalOllamaUrl(settings.ollamaUrl || 'http://localhost:11434/v1');
      setLocalKey(settings.provider === 'groq'
        ? (settings.groqKey || '')
        : settings.provider === 'ollama'
        ? (settings.ollamaKey || '')
        : (settings.openrouterKey || settings.apiKey || ''));
      setValidationStatus(null);
      setModelTest(null);
    }
  }, [isOpen, settings]);

  const models = localProvider === 'groq'
    ? GROQ_MODELS
    : localProvider === 'ollama'
    ? OLLAMA_MODELS
    : OPENROUTER_MODELS;

  const handleProviderChange = (p) => {
    setLocalProvider(p);
    const defaultM = p === 'groq'
      ? GROQ_MODELS[0].id
      : p === 'ollama'
      ? OLLAMA_MODELS[0].id
      : OPENROUTER_MODELS[0].id;
    setLocalModel(defaultM);

    const defaultK = p === 'groq'
      ? (settings.groqKey || '')
      : p === 'ollama'
      ? (settings.ollamaKey || '')
      : (settings.openrouterKey || settings.apiKey || '');
    setLocalKey(defaultK);
    setValidationStatus(null);
    setModelTest(null);
  };

  const handleModelChange = (e) => {
    setLocalModel(e.target.value);
    setModelTest(null);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationStatus(null);
    const valid = await validateApiKey(localProvider, localKey.trim(), localOllamaUrl.trim());
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidating(false);
  };

  const handleTestModel = async () => {
    if (!localModel) return;
    setModelTest({ status: 'testing', msg: 'Testing model access…' });
    const result = await testModel(localProvider, localKey.trim(), localModel, localOllamaUrl.trim());
    if (result.ok) {
      setModelTest({ status: 'ok', msg: '✓ Model is accessible and responding!' });
    } else if (result.paid) {
      setModelTest({ status: 'paid', msg: `💳 Paid model: ${result.error}` });
    } else {
      setModelTest({ status: 'error', msg: `✕ ${result.error}` });
    }
  };

  const handleSave = () => {
    const keyField = localProvider === 'groq'
      ? 'groqKey'
      : localProvider === 'ollama'
      ? 'ollamaKey'
      : 'openrouterKey';

    updateSettings({
      provider: localProvider,
      apiKey: localKey.trim(),
      [keyField]: localKey.trim(),
      ollamaUrl: localOllamaUrl.trim(),
      model: localModel,
    });
    onClose();
  };

  const selectedModelMeta = models.find(m => m.id === localModel);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="modal-panel glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="modal-header">
              <div className="modal-icon">⚙️</div>
              <div>
                <h2 className="modal-title">AI Configuration</h2>
                <p className="modal-subtitle">Connect your AI provider or local Ollama model</p>
              </div>
              <button id="modal-close-btn" className="modal-close" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              {/* Provider Toggle */}
              <div className="form-group">
                <label className="form-label">AI Provider</label>
                <div className="provider-toggle">
                  <button
                    id="provider-groq-btn"
                    className={`provider-btn ${localProvider === 'groq' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('groq')}
                  >
                    <span className="provider-icon">⚡</span>
                    Groq
                    <span className="provider-badge">Ultra-fast</span>
                  </button>
                  <button
                    id="provider-ollama-btn"
                    className={`provider-btn ${localProvider === 'ollama' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('ollama')}
                  >
                    <span className="provider-icon">🦙</span>
                    Ollama
                    <span className="provider-badge">Local/Cloud</span>
                  </button>
                  <button
                    id="provider-openrouter-btn"
                    className={`provider-btn ${localProvider === 'openrouter' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('openrouter')}
                  >
                    <span className="provider-icon">🌐</span>
                    OpenRouter
                    <span className="provider-badge">Multi-model</span>
                  </button>
                </div>
              </div>

              {/* OLLAMA URL INPUT */}
              {localProvider === 'ollama' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="ollama-url-input">
                    Ollama Endpoint URL
                  </label>
                  <input
                    id="ollama-url-input"
                    type="text"
                    className="input-field"
                    placeholder="http://localhost:11434/v1"
                    value={localOllamaUrl}
                    onChange={e => setLocalOllamaUrl(e.target.value)}
                  />
                  <p className="form-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Default is <code>http://localhost:11434/v1</code>. Ensure <code>ollama serve</code> is running.
                  </p>
                </div>
              )}

              {/* API Key */}
              <div className="form-group">
                <label className="form-label" htmlFor="api-key-input">
                  {localProvider === 'ollama' ? 'API Key (Optional)' : 'API Key'}
                  {localProvider !== 'ollama' && (
                    <a
                      href={localProvider === 'groq' ? 'https://console.groq.com/keys' : 'https://openrouter.ai/keys'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="get-key-link"
                    >
                      Get free key →
                    </a>
                  )}
                </label>
                <div className="key-input-row">
                  <input
                    id="api-key-input"
                    type="password"
                    className={`input-field key-input ${validationStatus === 'valid' ? 'valid' : validationStatus === 'invalid' ? 'invalid' : ''}`}
                    placeholder={
                      localProvider === 'ollama'
                        ? 'Optional for local Ollama; required for protected cloud endpoints…'
                        : `Enter your ${localProvider === 'groq' ? 'Groq' : 'OpenRouter'} API key…`
                    }
                    value={localKey}
                    onChange={e => { setLocalKey(e.target.value); setValidationStatus(null); }}
                  />
                  <button
                    id="validate-key-btn"
                    className="btn btn-ghost validate-btn"
                    onClick={handleValidate}
                    disabled={validating}
                  >
                    {validating ? <span className="spinner" /> : 'Test Connection'}
                  </button>
                </div>
                {validationStatus === 'valid' && (
                  <p className="validation-msg valid">✓ Connection verified!</p>
                )}
                {validationStatus === 'invalid' && (
                  <p className="validation-msg invalid">✕ Connection failed — check URL/key and retry</p>
                )}
              </div>

              {/* Model Selection + Test */}
              <div className="form-group">
                <label className="form-label" htmlFor="model-select">
                  Model
                  {selectedModelMeta && (
                    <span className={`model-free-badge ${selectedModelMeta.free ? 'free' : 'paid'}`}>
                      {selectedModelMeta.free ? '🆓 Free' : '💳 Paid'}
                    </span>
                  )}
                </label>
                <div className="model-select-row">
                  <select
                    id="model-select"
                    className="input-field select-field"
                    value={localModel}
                    onChange={handleModelChange}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    id="test-model-btn"
                    className="btn btn-ghost validate-btn"
                    onClick={handleTestModel}
                    disabled={modelTest?.status === 'testing'}
                    title="Send a 1-token ping to verify this model is accessible"
                  >
                    {modelTest?.status === 'testing'
                      ? <span className="spinner" />
                      : '🧪 Test'}
                  </button>
                </div>

                {/* Model Test Result */}
                <AnimatePresence>
                  {modelTest && modelTest.status !== 'testing' && (
                    <motion.div
                      className={`model-test-result ${modelTest.status}`}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {modelTest.msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="modal-info">
                <span>🔒</span>
                <span>Your configuration is stored locally in your browser. It is never sent to our servers.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button id="modal-cancel-btn" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                id="modal-save-btn"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={localProvider !== 'ollama' && !localKey.trim()}
              >
                Save Configuration
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
