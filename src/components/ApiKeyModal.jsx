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
  const [ollamaMode, setOllamaMode] = useState(settings.ollamaMode || 'cloud'); // 'cloud' | 'local'
  const [localOllamaUrl, setLocalOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434/v1');
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null); // null | 'valid' | 'invalid'
  const [modelTest, setModelTest] = useState(null); // null | { status: 'testing'|'ok'|'error'|'paid', msg: string }

  useEffect(() => {
    if (isOpen) {
      setLocalProvider(settings.provider);
      setLocalModel(settings.model);
      setOllamaMode(settings.ollamaMode || 'cloud');
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
    const targetUrl = ollamaMode === 'cloud' ? 'https://ollama.com/v1' : localOllamaUrl.trim();
    const valid = await validateApiKey(localProvider, localKey.trim(), targetUrl);
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidating(false);
  };

  const handleTestModel = async () => {
    if (!localModel) return;
    setModelTest({ status: 'testing', msg: 'Testing model access…' });
    const targetUrl = ollamaMode === 'cloud' ? 'https://ollama.com/v1' : localOllamaUrl.trim();
    const result = await testModel(localProvider, localKey.trim(), localModel, targetUrl);
    if (result.ok) {
      setModelTest({ status: 'ok', msg: result.msg || '✓ Model is accessible and responding!' });
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
      ollamaMode,
      ollamaUrl: ollamaMode === 'cloud' ? 'https://ollama.com/v1' : localOllamaUrl.trim(),
      model: localModel,
    });
    onClose();
  };

  const selectedModelMeta = models.find(m => m.id === localModel);
  const isSaveDisabled =
    (localProvider === 'groq' || localProvider === 'openrouter' || (localProvider === 'ollama' && ollamaMode === 'cloud'))
    && !localKey.trim();

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
                <p className="modal-subtitle">Connect your AI provider or Ollama Cloud / Local models</p>
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
                    <span className="provider-badge">Cloud/Local</span>
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

              {/* OLLAMA SUB-TOGGLE: CLOUD VS LOCAL */}
              {localProvider === 'ollama' && (
                <div className="form-group">
                  <label className="form-label">Ollama Mode</label>
                  <div className="provider-toggle" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <button
                      type="button"
                      className={`provider-btn ${ollamaMode === 'cloud' ? 'active' : ''}`}
                      onClick={() => setOllamaMode('cloud')}
                    >
                      <span className="provider-icon">☁️</span>
                      Ollama Cloud
                      <span className="provider-badge">API Key</span>
                    </button>
                    <button
                      type="button"
                      className={`provider-btn ${ollamaMode === 'local' ? 'active' : ''}`}
                      onClick={() => setOllamaMode('local')}
                    >
                      <span className="provider-icon">💻</span>
                      Local Server
                      <span className="provider-badge">Advanced</span>
                    </button>
                  </div>
                  {ollamaMode === 'cloud' && (
                    <div className="form-hint" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      ☁️ <strong>Ollama Cloud:</strong> No URL needed! Enter your Ollama API key below.
                    </div>
                  )}
                </div>
              )}

              {/* LOCAL OLLAMA URL INPUT */}
              {localProvider === 'ollama' && ollamaMode === 'local' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="ollama-url-input">
                    Ollama Local Server URL
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
                    Default: <code>http://localhost:11434/v1</code>. Ensure <code>ollama serve</code> is running.
                  </p>
                </div>
              )}

              {/* API Key */}
              <div className="form-group">
                <label className="form-label" htmlFor="api-key-input">
                  {localProvider === 'ollama'
                    ? ollamaMode === 'cloud' ? 'Ollama Cloud API Key' : 'API Key (Optional)'
                    : 'API Key'}
                  {localProvider === 'groq' && (
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="get-key-link">
                      Get free key →
                    </a>
                  )}
                  {localProvider === 'openrouter' && (
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="get-key-link">
                      Get free key →
                    </a>
                  )}
                  {localProvider === 'ollama' && ollamaMode === 'cloud' && (
                    <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="get-key-link">
                      Get Ollama key →
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
                        ? ollamaMode === 'cloud'
                          ? 'Enter your Ollama Cloud API Key…'
                          : 'Optional for local server…'
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
                  <p className="validation-msg valid">✓ Key / Connection verified!</p>
                )}
                {validationStatus === 'invalid' && (
                  <p className="validation-msg invalid">✕ Connection failed — check API key and retry</p>
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
                disabled={isSaveDisabled}
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
