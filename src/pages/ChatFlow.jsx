import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { generateRoadmap } from '../services/aiService';
import ApiKeyModal from '../components/ApiKeyModal';
import './ChatFlow.css';

const QUESTIONS = [
  {
    id: 'background',
    step: 1,
    icon: '🎓',
    title: `What's your educational background?`,
    subtitle: 'Tell us about your education, degrees, or prior knowledge relevant to this topic.',
    placeholder: 'e.g. Computer Science degree, self-taught developer, biology graduate…',
    type: 'textarea',
    exampleOptions: [
      'High school / No formal degree',
      'Computer Science / Engineering degree',
      'Non-technical degree (Business, Arts, etc.)',
      'Self-taught with some online courses',
    ],
  },
  {
    id: 'career',
    step: 2,
    icon: '💼',
    title: 'What is your current career situation?',
    subtitle: 'Share your job role, industry, or experience level to help us tailor the path.',
    placeholder: 'e.g. Frontend developer with 2 years experience, student, marketing manager…',
    type: 'textarea',
    exampleOptions: [
      'Student / No professional experience',
      'Entry-level professional (0-2 years)',
      'Mid-level professional (3-6 years)',
      'Senior professional / Manager',
    ],
  },
  {
    id: 'timePerWeek',
    step: 3,
    icon: '⏱️',
    title: 'How much time can you dedicate weekly?',
    subtitle: 'This helps us estimate your roadmap duration and phase lengths.',
    placeholder: '',
    type: 'time-select',
    timeOptions: [
      { value: '3', label: '1–3 hours', sublabel: 'Casual learner', icon: '🌱' },
      { value: '7', label: '4–7 hours', sublabel: 'Part-time', icon: '📘' },
      { value: '14', label: '8–14 hours', sublabel: 'Dedicated', icon: '🚀' },
      { value: '20', label: '15+ hours', sublabel: 'Intensive', icon: '🔥' },
    ],
  },
  {
    id: 'learningStyle',
    step: 4,
    icon: '🧠',
    title: `What's your preferred learning approach?`,
    subtitle: `We'll structure your roadmap phases to match how you learn best.`,
    placeholder: '',
    type: 'style-select',
    styleOptions: [
      {
        value: 'Theory first, then practical',
        icon: '📖',
        title: 'Theory First',
        desc: 'Understand concepts deeply before applying them',
      },
      {
        value: 'Practical examples first, theory later',
        icon: '🛠️',
        title: 'Practical First',
        desc: 'Dive in and build things, fill in theory gaps as needed',
      },
      {
        value: 'Mixed — theory and practice interleaved',
        icon: '🔄',
        title: 'Mixed Approach',
        desc: 'Alternate between concepts and hands-on exercises',
      },
    ],
  },
];

const slideVariants = {
  enter: { opacity: 0, x: 60, scale: 0.97 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -60, scale: 0.97 },
};

export default function ChatFlow() {
  const { topic, setView, setRoadmap, setIsGenerating, userProfile, setUserProfile, settings } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ background: '', career: '', timePerWeek: '', learningStyle: '' });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const textareaRef = useRef(null);

  const q = QUESTIONS[step];

  useEffect(() => {
    if (q.type === 'textarea' && textareaRef.current) {
      textareaRef.current.focus();
      setInputText(answers[q.id] || '');
    }
  }, [step]);

  const LOADING_MESSAGES = [
    `Analyzing your profile for ${topic}…`,
    'Designing your personalized learning path…',
    'Curating the best resources and projects…',
    'Crafting phase milestones…',
    'Almost ready — finalizing your roadmap!',
  ];

  const handleAnswer = async (value) => {
    const updated = { ...answers, [q.id]: value };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setInputText('');
      setStep(s => s + 1);
    } else {
      // All questions answered — generate roadmap
      if (!settings.apiKey) {
        setShowModal(true);
        return;
      }
      setIsLoading(true);
      setError('');
      setIsGenerating(true);
      setUserProfile(updated);

      // Cycle loading messages
      let msgIdx = 0;
      setLoadingMsg(LOADING_MESSAGES[0]);
      const interval = setInterval(() => {
        msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[msgIdx]);
      }, 2000);

      try {
        const roadmap = await generateRoadmap(topic, updated, settings);
        clearInterval(interval);
        setRoadmap(roadmap);
        setIsGenerating(false);
        setView('roadmap');
      } catch (err) {
        clearInterval(interval);
        setError(err.message || 'Failed to generate roadmap. Please try again.');
        setIsGenerating(false);
        setIsLoading(false);
      }
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    handleAnswer(inputText.trim());
  };

  const handleBack = () => {
    if (step === 0) {
      setView('landing');
    } else {
      setStep(s => s - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="chat-page loading-page">
        <motion.div
          className="loading-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="loading-orb">
            <div className="orb-inner" />
            <div className="orb-ring" />
            <div className="orb-ring ring-2" />
          </div>
          <h2 className="loading-title gradient-text">Crafting Your Roadmap</h2>
          <p className="loading-subtitle">{loadingMsg}</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          {error && (
            <div className="error-box">
              <span>⚠️</span> {error}
              <button className="btn btn-ghost retry-btn" onClick={() => { setIsLoading(false); setError(''); }}>
                Retry
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <ApiKeyModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Header */}
      <header className="chat-header">
        <div className="container chat-header-inner">
          <button id="back-btn" className="btn btn-ghost back-btn" onClick={handleBack}>
            ← Back
          </button>
          <div className="chat-topic-pill">
            <span>📚</span> {topic}
          </div>
          <div className="chat-step-indicator">
            {step + 1} / {QUESTIONS.length}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-bar-track">
        <motion.div
          className="progress-bar-fill"
          initial={false}
          animate={{ width: `${((step) / QUESTIONS.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>

      {/* Main Chat Area */}
      <main className="chat-main container">
        <div className="chat-layout">
          {/* Step Sidebar */}
          <div className="step-sidebar">
            {QUESTIONS.map((sq, i) => (
              <div
                key={sq.id}
                className={`step-bubble ${i === step ? 'active' : i < step ? 'done' : 'pending'}`}
              >
                {/* Vertical connector line */}
                {i < QUESTIONS.length - 1 && <div className="step-connector" />}

                {/* Icon circle */}
                <div className="step-icon">
                  {i < step ? '✓' : sq.icon}
                </div>

                {/* Label */}
                <div className="step-info">
                  <div className="step-num-label">Step {i + 1}</div>
                  <div className="step-bubble-label">{sq.title.replace('?', '')}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Question Card */}
          <div className="question-area">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="question-card glass-card"
              >
                <div className="question-icon-wrap">
                  <span className="question-icon">{q.icon}</span>
                  <span className="badge badge-violet">Question {q.step} of {QUESTIONS.length}</span>
                </div>

                <h2 className="question-title">{q.title}</h2>
                <p className="question-subtitle">{q.subtitle}</p>

                {/* TEXTAREA type */}
                {q.type === 'textarea' && (
                  <div className="input-section">
                    {q.exampleOptions && (
                      <div className="quick-options">
                        <span className="quick-label">Quick select:</span>
                        <div className="quick-chips">
                          {q.exampleOptions.map(opt => (
                            <button
                              key={opt}
                              className="quick-chip"
                              onClick={() => setInputText(opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      id={`answer-textarea-${q.id}`}
                      className="input-field chat-textarea"
                      placeholder={q.placeholder}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextSubmit();
                        }
                      }}
                      rows={3}
                    />
                    <div className="textarea-actions">
                      <span className="textarea-hint">Press Enter to continue or Shift+Enter for new line</span>
                      <button
                        id={`continue-btn-${q.id}`}
                        className="btn btn-primary"
                        onClick={handleTextSubmit}
                        disabled={!inputText.trim()}
                      >
                        Continue <span>→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TIME SELECT */}
                {q.type === 'time-select' && (
                  <div className="option-grid">
                    {q.timeOptions.map(opt => (
                      <motion.button
                        key={opt.value}
                        id={`time-option-${opt.value}`}
                        className="option-card"
                        onClick={() => handleAnswer(opt.label)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="option-card-icon">{opt.icon}</span>
                        <span className="option-card-label">{opt.label}</span>
                        <span className="option-card-sub">{opt.sublabel}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* STYLE SELECT */}
                {q.type === 'style-select' && (
                  <div className="style-options">
                    {q.styleOptions.map(opt => (
                      <motion.button
                        key={opt.value}
                        id={`style-option-${opt.value.replace(/\s+/g, '-').toLowerCase()}`}
                        className="style-card"
                        onClick={() => handleAnswer(opt.value)}
                        whileHover={{ x: 6 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <span className="style-card-icon">{opt.icon}</span>
                        <div>
                          <div className="style-card-title">{opt.title}</div>
                          <div className="style-card-desc">{opt.desc}</div>
                        </div>
                        <span className="style-card-arrow">→</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div
                className="error-box"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
