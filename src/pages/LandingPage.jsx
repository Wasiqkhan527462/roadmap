import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';
import './LandingPage.css';

const EXAMPLE_TOPICS = [
  'Machine Learning', 'Web Development', 'Data Science',
  'iOS Development', 'Cybersecurity', 'DevOps & Cloud',
  'UI/UX Design', 'Blockchain', 'Digital Marketing', 'Python Programming',
];

const FEATURES = [
  {
    icon: '🎯',
    title: 'Personalized Path',
    desc: 'Tailored to your background, career goals, and available time',
  },
  {
    icon: '🤖',
    title: 'AI-Powered',
    desc: 'Built with state-of-the-art language models for smart recommendations',
  },
  {
    icon: '📈',
    title: 'Phase-by-Phase',
    desc: 'Structured milestones with real projects and curated resources',
  },
];

export default function LandingPage() {
  const { setView, setTopic, settings } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputValue.trim()) {
      setFiltered(
        EXAMPLE_TOPICS.filter(t =>
          t.toLowerCase().includes(inputValue.toLowerCase())
        )
      );
      setShowTopicDropdown(true);
    } else {
      setShowTopicDropdown(false);
      setFiltered([]);
    }
  }, [inputValue]);

  const handleStart = (topic) => {
    const t = topic || inputValue.trim();
    if (!t) return;
    if (!settings.apiKey) {
      setShowModal(true);
      return;
    }
    setTopic(t);
    setView('chat');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div className="landing-page">
      <ApiKeyModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="container nav-inner">
          <div className="nav-logo">
            <span className="logo-icon">🗺️</span>
            <span className="logo-text gradient-text">Roadster</span>
          </div>
          <button
            id="settings-btn"
            className="btn btn-ghost nav-settings-btn"
            onClick={() => setShowModal(true)}
          >
            <span>⚙️</span>
            {settings.apiKey ? 'API Connected' : 'Add API Key'}
            {settings.apiKey && <span className="connected-dot" />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-main container">
        <motion.div
          className="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="badge badge-indigo hero-badge">
              <span>✨</span> AI-Powered Learning Roadmaps
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Learn Anything,{' '}
            <span className="gradient-text">Your Way</span>
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Enter a subject and get a personalized, AI-crafted learning roadmap — built around your background, schedule, and learning style.
          </motion.p>

          {/* Search Input */}
          <motion.div
            className="search-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="search-box glass-card">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                id="topic-input"
                type="text"
                className="search-input"
                placeholder="Enter a topic (e.g. Machine Learning, React, Cybersecurity…)"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              <button
                id="start-btn"
                className="btn btn-primary search-btn"
                onClick={() => handleStart()}
                disabled={!inputValue.trim()}
              >
                Generate Roadmap
                <span>→</span>
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {showTopicDropdown && filtered.length > 0 && (
              <motion.div
                className="topic-dropdown glass-card"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {filtered.map(t => (
                  <button
                    key={t}
                    className="topic-option"
                    onClick={() => {
                      setInputValue(t);
                      setShowTopicDropdown(false);
                      handleStart(t);
                    }}
                  >
                    <span className="topic-option-icon">📚</span>
                    {t}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Example chips */}
          <motion.div
            className="example-chips"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="chips-label">Try:</span>
            {EXAMPLE_TOPICS.slice(0, 6).map((t, i) => (
              <button
                key={t}
                id={`chip-${i}`}
                className="chip"
                onClick={() => handleStart(t)}
              >
                {t}
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          className="features-grid"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Steps preview */}
        <motion.div
          className="steps-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {['Enter your topic', 'Answer 4 quick questions', 'Get your AI roadmap'].map((step, i) => (
            <div key={step} className="step-item">
              <div className="step-num">{i + 1}</div>
              <span className="step-text">{step}</span>
              {i < 2 && <span className="step-arrow">→</span>}
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
