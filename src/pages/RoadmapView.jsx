import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import './RoadmapView.css';

const COLOR_MAP = {
  indigo: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', dot: '#6366f1', badge: 'badge-indigo' },
  violet: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', dot: '#8b5cf6', badge: 'badge-violet' },
  cyan:   { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.3)',   dot: '#06b6d4', badge: 'badge-cyan' },
  emerald:{ bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  dot: '#10b981', badge: 'badge-emerald' },
  amber:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  dot: '#f59e0b', badge: '' },
  rose:   { bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.3)',   dot: '#f43f5e', badge: '' },
};

const TYPE_ICONS = {
  concept: '💡', tool: '🔧', framework: '🏗️', project: '🚀', practice: '✏️',
};

const RESOURCE_ICONS = {
  course: '🎓', book: '📚', documentation: '📄', video: '🎥', article: '📰', tool: '🛠️',
};

function PhaseCard({ phase, index, isExpanded, onToggle }) {
  const colors = COLOR_MAP[phase.color] || COLOR_MAP.indigo;

  return (
    <motion.div
      className="phase-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
    >
      {/* Timeline connector */}
      <div className="phase-timeline">
        <div className="phase-dot" style={{ background: colors.dot, boxShadow: `0 0 16px ${colors.dot}60` }} />
        <div className="phase-line" />
      </div>

      {/* Card Content */}
      <div
        className="phase-body glass-card"
        style={{ borderColor: colors.border, background: colors.bg }}
      >
        {/* Phase Header */}
        <button
          id={`phase-toggle-${phase.id}`}
          className="phase-header"
          onClick={() => onToggle(phase.id)}
        >
          <div className="phase-header-left">
            <span className="phase-num">Phase {phase.id}</span>
            <span className="phase-icon-large">{phase.icon}</span>
            <div>
              <h3 className="phase-title">{phase.title}</h3>
              <span className="phase-duration">⏱ {phase.duration}</span>
            </div>
          </div>
          <div className="phase-header-right">
            <span className={`badge ${colors.badge}`} style={
              !colors.badge ? { background: `${colors.bg}`, borderColor: colors.border, color: colors.dot } : {}
            }>
              {phase.topics?.length || 0} topics
            </span>
            <span className={`chevron ${isExpanded ? 'open' : ''}`}>⌄</span>
          </div>
        </button>

        {/* Phase Description */}
        <p className="phase-description">{phase.description}</p>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="phase-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="phase-sections">
                {/* Topics */}
                {phase.topics?.length > 0 && (
                  <div className="phase-section">
                    <h4 className="section-title">📋 Topics</h4>
                    <div className="topics-grid">
                      {phase.topics.map((topic, i) => (
                        <div key={i} className="topic-item">
                          <span className="topic-type-icon">{TYPE_ICONS[topic.type] || '📌'}</span>
                          <div>
                            <div className="topic-name">{topic.name}</div>
                            <div className="topic-desc">{topic.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project */}
                {phase.project && (
                  <div className="phase-section">
                    <h4 className="section-title">🚀 Hands-on Project</h4>
                    <div className="project-card">
                      <div className="project-header">
                        <span className="project-title">{phase.project.title}</span>
                      </div>
                      <p className="project-desc">{phase.project.description}</p>
                      {phase.project.skills?.length > 0 && (
                        <div className="project-skills">
                          {phase.project.skills.map((s, i) => (
                            <span key={i} className="skill-tag">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {phase.resources?.length > 0 && (
                  <div className="phase-section">
                    <h4 className="section-title">📚 Resources</h4>
                    <div className="resources-list">
                      {phase.resources.map((r, i) => (
                        <a
                          key={i}
                          href={r.url !== '#' ? r.url : undefined}
                          target={r.url !== '#' ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className={`resource-item ${r.url === '#' ? 'no-link' : ''}`}
                        >
                          <span className="resource-icon">{RESOURCE_ICONS[r.type] || '📎'}</span>
                          <div className="resource-info">
                            <span className="resource-title">{r.title}</span>
                            <span className="resource-type">{r.type}</span>
                          </div>
                          {r.free && <span className="free-badge">FREE</span>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestone */}
                {phase.milestone && (
                  <div className="milestone-box">
                    <span className="milestone-icon">🏆</span>
                    <div>
                      <div className="milestone-label">Phase Milestone</div>
                      <div className="milestone-text">{phase.milestone}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function computeTotalDuration(phases, fallbackDuration) {
  if (!phases || !Array.isArray(phases) || phases.length === 0) {
    return fallbackDuration || '—';
  }

  let totalWeeks = 0;
  let parsedCount = 0;

  phases.forEach(phase => {
    if (!phase.duration) return;
    const str = String(phase.duration).toLowerCase();
    const wMatch = str.match(/(\d+)\s*week/);
    const mMatch = str.match(/(\d+)\s*month/);

    if (wMatch) {
      totalWeeks += parseInt(wMatch[1], 10);
      parsedCount++;
    } else if (mMatch) {
      totalWeeks += parseInt(mMatch[1], 10) * 4;
      parsedCount++;
    }
  });

  if (parsedCount === 0 || totalWeeks === 0) {
    return fallbackDuration || '—';
  }

  if (totalWeeks < 8) {
    return `${totalWeeks} weeks`;
  }
  const months = Math.round(totalWeeks / 4);
  return `${months} months (${totalWeeks} weeks)`;
}

export default function RoadmapView() {
  const { roadmap, topic, userProfile, resetApp, setView } = useApp();
  const [expandedPhases, setExpandedPhases] = useState(new Set([1]));
  const [copied, setCopied] = useState(false);

  if (!roadmap) {
    return (
      <div className="roadmap-page">
        <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p>No roadmap data. <button className="btn btn-primary" onClick={() => setView('landing')}>Start Over</button></p>
        </div>
      </div>
    );
  }

  const calculatedTotalDuration = computeTotalDuration(roadmap.phases, roadmap.totalDuration);

  const togglePhase = (id) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedPhases(new Set(roadmap.phases?.map(p => p.id)));
  const collapseAll = () => setExpandedPhases(new Set());

  const handleCopy = () => {
    const text = JSON.stringify(roadmap, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const difficultyColor = { Beginner: 'emerald', Intermediate: 'amber', Advanced: 'rose' };
  const diffColor = difficultyColor[roadmap.difficulty] || 'indigo';

  return (
    <div className="roadmap-page">
      {/* Top Nav */}
      <nav className="roadmap-nav">
        <div className="container roadmap-nav-inner">
          <button id="back-to-home-btn" className="btn btn-ghost nav-back" onClick={resetApp}>
            ← Start New Roadmap
          </button>
          <div className="nav-logo">
            <span>🗺️</span>
            <span className="gradient-text" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>Roadster</span>
          </div>
          <div className="roadmap-nav-actions">
            <button id="expand-all-btn" className="btn btn-ghost action-btn" onClick={expandAll}>Expand All</button>
            <button id="collapse-all-btn" className="btn btn-ghost action-btn" onClick={collapseAll}>Collapse All</button>
            <button id="copy-roadmap-btn" className="btn btn-ghost action-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy JSON'}
            </button>
          </div>
        </div>
      </nav>

      <main className="roadmap-main container">
        {/* Hero Header */}
        <motion.div
          className="roadmap-hero glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="roadmap-hero-content">
            <div className="roadmap-hero-badges">
              <span className="badge badge-indigo">📚 {topic}</span>
              <span className={`badge badge-${diffColor}`} style={
                diffColor === 'amber' ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' } :
                diffColor === 'rose'  ? { background: 'rgba(244,63,94,0.15)',  borderColor: 'rgba(244,63,94,0.3)',  color: '#f43f5e' } : {}
              }>
                {roadmap.difficulty}
              </span>
            </div>
            <h1 className="roadmap-title gradient-text">{roadmap.title}</h1>
            <p className="roadmap-summary">{roadmap.summary}</p>

            {/* Stats */}
            <div className="roadmap-stats">
              <div className="stat-item">
                <span className="stat-icon">📅</span>
                <span className="stat-label">Total Duration</span>
                <span className="stat-value">{calculatedTotalDuration}</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-icon">⏱️</span>
                <span className="stat-label">Weekly Hours</span>
                <span className="stat-value">{roadmap.weeklyHours}h / week</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-icon">🗂️</span>
                <span className="stat-label">Phases</span>
                <span className="stat-value">{roadmap.phases?.length || 0} phases</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-icon">🎯</span>
                <span className="stat-label">Style</span>
                <span className="stat-value">{userProfile.learningStyle?.split(' ')[0] || '—'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phases Timeline */}
        <div className="phases-section">
          <div className="phases-header">
            <h2 className="phases-heading">Your Learning Path</h2>
            <span className="phases-count">{roadmap.phases?.length} phases</span>
          </div>

          <div className="phases-timeline">
            {roadmap.phases?.map((phase, i) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                index={i}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={togglePhase}
              />
            ))}
          </div>
        </div>

        {/* Tips & Next Steps */}
        <div className="bottom-section">
          {roadmap.tips?.length > 0 && (
            <motion.div
              className="tips-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="tips-title">💡 Personalized Learning Tips</h3>
              <ul className="tips-list">
                {roadmap.tips.map((tip, i) => (
                  <li key={i} className="tip-item">
                    <span className="tip-num">{i + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {roadmap.nextSteps && (
            <motion.div
              className="next-steps-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="next-title">🚀 What's Next After Completion?</h3>
              <p className="next-text">{roadmap.nextSteps}</p>
              <button id="start-new-btn" className="btn btn-primary" onClick={resetApp} style={{ marginTop: 'var(--space-md)' }}>
                Generate Another Roadmap
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
