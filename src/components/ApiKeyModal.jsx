import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { OPENROUTER_MODELS, GROQ_MODELS, validateApiKey, testModel } from '../services/aiService';
import './ApiKeyModal.css';

export default function ApiKeyModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useApp();
  const [localKey, setLocalKey] = useState(settings.apiKey);
  const [localProvider, setLocalProvider] = useState(settings.provider);
  const [localModel, setLocalModel] = useState(settings.model);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null); // null | 'valid' | 'invalid'
  const [modelTest, setModelTest] = useState(null); // null | { status: 'testing'|'ok'|'error'|'paid', msg: string }

  useEffect(() => {
    if (isOpen) {
      setLocalProvider(settings.provider);
      setLocalModel(settings.model);
      setLocalKey(settings.provider === 'groq'
        ? (settings.groqKey || '')
        : (settings.openrouterKey || settings.apiKey || ''));
      setValidationStatus(null);
      setModelTest(null);
    }
  }, [isOpen, settings]);

  const models = localProvider === 'groq' ? GROQ_MODELS : OPENROUTER_MODELS;

  const handleProviderChange = (p) => {
    setLocalProvider(p);
    setLocalModel(p === 'groq' ? GROQ_MODELS[0].id : OPENROUTER_MODELS[0].id);
    setLocalKey(p === 'groq' ? (settings.groqKey || '') : (settings.openrouterKey || settings.apiKey || ''));
    setValidationStatus(null);
    setModelTest(null);
  };

  const handleModelChange = (e) => {
    setLocalModel(e.target.value);
    setModelTest(null); // reset test result when model changes
  };

  const handleValidate = async () => {
    if (!localKey.trim()) return;
    setValidating(true);
    setValidationStatus(null);
    const valid = await validateApiKey(localProvider, localKey.trim());
    setValidationStatus(valid ? 'valid' : 'invalid');
    setValidating(false);
  };

  const handleTestModel = async () => {
    if (!localKey.trim() || !localModel) return;
    setModelTest({ status: 'testing', msg: 'Testing model access…' });
    const result = await testModel(localProvider, localKey.trim(), localModel);
    if (result.ok) {
      setModelTest({ status: 'ok', msg: '✓ Model is accessible and responding!' });
    } else if (result.paid) {
      setModelTest({ status: 'paid', msg: `💳 Paid model: ${result.error}` });
    } else {
      setModelTest({ status: 'error', msg: `✕ ${result.error}` });
    }
  };

  const handleSave = () => {
    const keyField = localProvider === 'groq' ? 'groqKey' : 'openrouterKey';
    updateSettings({
      provider: localProvider,
      apiKey: localKey.trim(),
      [keyField]: localKey.trim(),
      model: localModel,
    });
    onClose();
  };

  // Find currently selected model meta
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
                <p className="modal-subtitle">Connect your AI provider to generate roadmaps</p>
              </div>
              <button id="modal-close-btn" className="modal-close" onClick={onClose}>✕</button>
            </div>

            <div className="modal-body">
              {/* Provider Toggle */}
              <div className="form-group">
                <label className="form-label">AI Provider</label>
                <div className="provider-toggle">
                  <button
                    id="provider-openrouter-btn"
                    className={`provider-btn ${localProvider === 'openrouter' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('openrouter')}
                  >
                    <span className="provider-icon">🌐</span>
                    OpenRouter
                    <span className="provider-badge">Multi-model</span>
                  </button>
                  <button
                    id="provider-groq-btn"
                    className={`provider-btn ${localProvider === 'groq' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('groq')}
                  >
                    <span className="provider-icon">⚡</span>
                    Groq
                    <span className="provider-badge">Ultra-fast</span>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="form-group">
                <label className="form-label" htmlFor="api-key-input">
                  API Key
                  <a
                    href={localProvider === 'groq' ? 'https://console.groq.com/keys' : 'https://openrouter.ai/keys'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="get-key-link"
                  >
                    Get free key →
                  </a>
                </label>
                <div className="key-input-row">
                  <input
                    id="api-key-input"
                    type="password"
                    className={`input-field key-input ${validationStatus === 'valid' ? 'valid' : validationStatus === 'invalid' ? 'invalid' : ''}`}
                    placeholder={`Enter your ${localProvider === 'groq' ? 'Groq' : 'OpenRouter'} API key…`}
                    value={localKey}
                    onChange={e => { setLocalKey(e.target.value); setValidationStatus(null); }}
                  />
                  <button
                    id="validate-key-btn"
                    className="btn btn-ghost validate-btn"
                    onClick={handleValidate}
                    disabled={!localKey.trim() || validating}
                  >
                    {validating ? <span className="spinner" /> : 'Test Key'}
                  </button>
                </div>
                {validationStatus === 'valid' && (
                  <p className="validation-msg valid">✓ API key is valid</p>
                )}
                {validationStatus === 'invalid' && (
                  <p className="validation-msg invalid">✕ Invalid API key — check and retry</p>
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
                    disabled={!localKey.trim() || modelTest?.status === 'testing'}
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
                      {modelTest.status === 'paid' && (
                        <span className="model-test-hint">
                          {' '}— Try <strong>Auto Router</strong> or a model tagged Free.
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="modal-info">
                <span>🔒</span>
                <span>Your API key is stored locally in your browser. It is never sent to our servers.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button id="modal-cancel-btn" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                id="modal-save-btn"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!localKey.trim()}
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
