import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import ChatFlow from './pages/ChatFlow';
import RoadmapView from './pages/RoadmapView';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

function AppContent() {
  const { view } = useApp();

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' && (
        <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
          <LandingPage />
        </motion.div>
      )}
      {view === 'chat' && (
        <motion.div key="chat" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
          <ChatFlow />
        </motion.div>
      )}
      {view === 'roadmap' && (
        <motion.div key="roadmap" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
          <RoadmapView />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
