import { useCallback, useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import HistoryView from './components/HistoryView';
import MiniWidget from './components/MiniWidget';
import MarketingSite from './components/MarketingSite';
import Onboarding from './components/Onboarding';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useKeyboardActions } from './hooks/useKeyboardActions';
import { useAuth0 } from '@auth0/auth0-react';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth0();
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWidget, setIsWidget] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isElectronApp = typeof window !== 'undefined' && Boolean(window.recorder);

  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [autoProcessRecordingId, setAutoProcessRecordingId] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    try {
      if (!window.recorder) return;
      const data = await window.recorder.listRecordings();
      setRecordings(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === '#/widget') {
      setIsWidget(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecordings().then(() => {
        const pending = localStorage.getItem('pendingRecordingId');
        if (pending) {
          localStorage.removeItem('pendingRecordingId');
          handleSelectRecording(pending, true);
        }
      });
      const hasSeenOnboarding = localStorage.getItem('voxa_has_seen_onboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isAuthenticated, loadRecordings]);

  useEffect(() => {
    if (!isAuthenticated) return;

    window.addEventListener('recordings:changed', loadRecordings);
    return () => window.removeEventListener('recordings:changed', loadRecordings);
  }, [isAuthenticated, loadRecordings]);

  const handleSelectRecording = (id: string | null, autoProcess = false) => {
    setSelectedRecordingId(id);
    setAutoProcessRecordingId(autoProcess ? id : null);
    if (id) {
      setActiveTab('history');
    }
  };

  const handleEscape = useCallback(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return;
    }

    if (selectedRecordingId) {
      handleSelectRecording(null);
    }
  }, [isSidebarOpen, selectedRecordingId]);

  useKeyboardActions({ enabled: isElectronApp && !isWidget, onEscape: handleEscape });

  if (isWidget) {
    return <MiniWidget />;
  }

  if (!isElectronApp) {
    return <MarketingSite />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col drag-region">
        <div className="safe-top shrink-0" />
        <div className="flex-1 flex items-center justify-center no-drag px-4 text-sm text-white/60">
          Loading authentication...
        </div>
      </div>
    );
  }


  const completeOnboarding = () => {
    localStorage.setItem('voxa_has_seen_onboarding', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-foreground">
      <AnimatePresence>
        {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      </AnimatePresence>
      {/* Mobile sidebar overlay backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={clsx(
          "shrink-0 bg-[#1e1e1e]/50 border-r border-white/10 flex flex-col safe-top drag-region sidebar-transition z-50",
          // Desktop: always visible, toggle width
          "hidden sm:flex",
          isSidebarOpen ? "sm:w-[260px]" : "sm:w-[72px]",
        )}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={!isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          recordings={recordings}
          selectedRecordingId={selectedRecordingId}
          onSelectRecording={handleSelectRecording}
        />
      </div>

      {/* Mobile sidebar — slides in as overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#1e1e1e] border-r border-white/10 flex flex-col safe-top z-50 sm:hidden shadow-2xl"
          >
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setIsSidebarOpen(false);
              }}
              collapsed={false}
              onToggle={() => setIsSidebarOpen(false)}
              recordings={recordings}
              selectedRecordingId={selectedRecordingId}
              onSelectRecording={(id) => {
                handleSelectRecording(id);
                setIsSidebarOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#121212] safe-top drag-region min-w-0">
        {/* Mobile Header Toggle */}
        <div className="sm:hidden flex items-center px-4 pb-2 no-drag border-b border-white/5 shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-drag p-4 sm:p-6 relative thin-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Dashboard onRecordingComplete={(id, autoProcess) => handleSelectRecording(id, autoProcess)} />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <HistoryView
                  recordings={recordings}
                  selectedId={selectedRecordingId}
                  onSelect={handleSelectRecording}
                  loadRecordings={loadRecordings}
                  autoProcess={autoProcessRecordingId === selectedRecordingId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
