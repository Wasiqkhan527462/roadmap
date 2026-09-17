import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Views: 'landing' | 'chat' | 'roadmap'
  const [view, setView] = useState('landing');
  const [topic, setTopic] = useState('');
  const [userProfile, setUserProfile] = useState({
    background: '',
    career: '',
    targetLevel: 'Mastery / Job-Ready Expert',
    timePerWeek: '',
    learningStyle: '',
  });
  const [roadmap, setRoadmap] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Default settings — Groq is used as default: fully free, fast, reliable
  const DEFAULT_SETTINGS = {
    provider: 'groq',
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    openrouterKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    groqKey: import.meta.env.VITE_GROQ_API_KEY || '',
    ollamaKey: '',
    ollamaUrl: 'http://localhost:11434/v1',
    model: 'llama-3.3-70b-versatile',
  };

  // Bump this version whenever models or defaults change to clear stale caches
  const SETTINGS_VERSION = 8;

  // Settings stored in localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('roadster_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If version mismatch, wipe stale settings and use fresh defaults
        if (parsed._version !== SETTINGS_VERSION) {
          return { ...DEFAULT_SETTINGS, _version: SETTINGS_VERSION };
        }
        // Merge saved settings with defaults (keys always present)
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return { ...DEFAULT_SETTINGS, _version: SETTINGS_VERSION };
    } catch {
      return { ...DEFAULT_SETTINGS, _version: SETTINGS_VERSION };
    }
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('roadster_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates) => setSettings(prev => ({ ...prev, ...updates }));

  const resetApp = () => {
    setView('landing');
    setTopic('');
    setUserProfile({ background: '', career: '', targetLevel: 'Mastery / Job-Ready Expert', timePerWeek: '', learningStyle: '' });
    setRoadmap(null);
    setError(null);
    setIsGenerating(false);
  };

  return (
    <AppContext.Provider value={{
      view, setView,
      topic, setTopic,
      userProfile, setUserProfile,
      roadmap, setRoadmap,
      isGenerating, setIsGenerating,
      error, setError,
      settings, updateSettings,
      resetApp,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
