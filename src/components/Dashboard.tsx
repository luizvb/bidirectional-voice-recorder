import { Check, HelpCircle, Keyboard, Mic, Settings, SlidersHorizontal } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

type ShortcutSettings = {
  record: string;
  options: string[];
};

const shortcutLabels: Record<string, string> = {
  'Option+Space': 'Option + Space',
  'CommandOrControl+Shift+Space': 'Command + Shift + Space',
  'Option+R': 'Option + R'
};

export default function Dashboard({ onRecordingComplete }: { onRecordingComplete?: (id: string, autoProcess: boolean) => void }) {
  const {
    isRecording,
    status,
    formattedTime,
    sessionName,
    setSessionName,
    startRecording,
    stopRecording
  } = useRecorder();
  const { t } = useLanguage();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();

  const [stats, setStats] = useState({ sessions: 0, durationMs: 0, transcribed: 0 });
  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>({
    record: 'Option+Space',
    options: ['Option+Space']
  });
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState('');
  const [micStatus, setMicStatus] = useState('');

  const displayName = user?.name || user?.nickname || user?.email || 'User';

  useEffect(() => {
    async function loadStats() {
      try {
        if (!window.recorder) return;
        const recordings = await window.recorder.listRecordings();
        const durationMs = recordings.reduce((acc: number, r: any) => acc + (r.durationMs || 0), 0);
        const transcribed = recordings.filter((r: any) => r.transcript).length;
        setStats({ sessions: recordings.length, durationMs, transcribed });
      } catch (e) {
        console.error(e);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    async function loadShortcutSettings() {
      try {
        if (!window.recorder?.getShortcutSettings) return;
        const settings = await window.recorder.getShortcutSettings();
        setShortcutSettings(settings);
      } catch (e) {
        console.error(e);
      }
    }

    loadShortcutSettings();
  }, []);

  useEffect(() => {
    const handleShortcut = async () => {
      if (isRecording) {
        const saved = await stopRecording();
        if (!isAuthenticated) {
          if (saved) localStorage.setItem('pendingRecordingId', saved.id);
          loginWithRedirect();
        } else if (saved && onRecordingComplete) {
          onRecordingComplete(saved.id, true);
        }
      } else {
        startRecording();
      }
    };

    if (window.recorder) {
      window.recorder.onShortcutRecord(handleShortcut);
      return () => {
        window.recorder.removeShortcutRecord(handleShortcut);
      };
    }
  }, [isRecording, startRecording, stopRecording, isAuthenticated, loginWithRedirect]);

  const handleShortcutChange = async (nextShortcut: string) => {
    try {
      setShortcutStatus('Saving shortcut...');
      const settings = await window.recorder.setRecordShortcut(nextShortcut);
      setShortcutSettings(settings);
      setShortcutStatus('Shortcut updated.');
    } catch (e: any) {
      setShortcutStatus(e?.message || 'Shortcut could not be updated.');
    }
  };

  const handleMicrophoneSettings = async () => {
    try {
      setMicStatus('Opening microphone settings...');
      if (window.recorder?.openMicrophoneSettings) {
        const opened = await window.recorder.openMicrophoneSettings();
        if (opened) {
          setMicStatus('Microphone privacy settings opened.');
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus('Microphone permission is ready.');
    } catch (e: any) {
      setMicStatus(e?.message || 'Could not open microphone settings.');
    }
  };

  const handleRecordingAction = async () => {
    if (isRecording) {
      const saved = await stopRecording();
      if (!isAuthenticated) {
        if (saved) localStorage.setItem('pendingRecordingId', saved.id);
        loginWithRedirect();
      } else if (saved && onRecordingComplete) {
        onRecordingComplete(saved.id, true);
      }
      return;
    }

    startRecording();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto text-[#E2E8F0] space-y-6"
    >

      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-white/45">Welcome back</div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-white tracking-normal truncate">{displayName}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Capture the next conversation with one clear start button.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMicrophoneSettings}
          className="mt-1 h-9 w-9 shrink-0 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
          aria-label="Configure microphone"
          title="Configure microphone"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Recording Section */}
      <motion.section
        variants={itemVariants}
        className="rounded-lg border border-white/10 bg-[#1A1A1A] p-4 sm:p-5 shadow-sm"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "h-2.5 w-2.5 rounded-full",
                isRecording ? "bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.14)]" : "bg-emerald-400"
              )} />
              <span className="text-xs font-semibold uppercase text-white/45">
                {isRecording ? 'Recording now' : 'Ready to record'}
              </span>
              {isRecording && (
                <span className="font-mono text-xs text-red-300 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">
                  {formattedTime}
                </span>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-white/45">Session name</span>
              <input
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[15px] font-semibold text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary/60"
                placeholder="What are you recording?"
              />
            </label>

            <div className="mt-3 text-sm text-white/50 break-anywhere">
              {isRecording ? status : 'Press start, grant microphone access if asked, and stop when the conversation is done.'}
            </div>

            {micStatus && (
              <div className="mt-2 text-xs text-white/40 break-anywhere">{micStatus}</div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:w-56">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleRecordingAction}
              data-keyboard-primary="true"
              className={clsx(
                "h-12 w-full rounded-lg px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              <Mic className="w-4 h-4" />
              {isRecording ? t('dashboard', 'stopRecording') : t('dashboard', 'startRecording')}
            </motion.button>

            <button
              type="button"
              onClick={handleMicrophoneSettings}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-3.5 h-3.5" />
              Microphone
            </button>

            <div className="text-center text-xs text-white/35">
              Shortcut: {shortcutLabels[shortcutSettings.record] || shortcutSettings.record}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Metrics Section */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[15px] font-semibold text-white/80">{t('dashboard', 'recentActivity')}</h3>
          <HelpCircle className="w-4 h-4 text-white/40" />
        </div>

        <div className="grid grid-cols-2 gap-4 bg-[#1A1A1A] border border-white/5 rounded-lg p-4 sm:p-5 shadow-sm">
          <div>
            <div className="text-2xl font-bold text-white">{stats.sessions}</div>
            <div className="text-sm text-white/40 font-medium mt-1">{t('dashboard', 'totalSessions')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{Math.floor(stats.durationMs / 60000)} min</div>
            <div className="text-sm text-white/40 font-medium mt-1">{t('dashboard', 'totalDuration')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.transcribed}</div>
            <div className="text-sm text-white/40 font-medium mt-1">{t('dashboard', 'transcribed')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0</div>
            <div className="flex items-center gap-1.5 text-sm text-white/40 font-medium mt-1">
              Apps used
              <Settings className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Get Started Section */}
      <motion.section variants={itemVariants}>
        <h3 className="text-[15px] font-semibold text-white/80 mb-4">Setup</h3>

        <div className="space-y-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsShortcutPanelOpen((current) => !current)}
            className="w-full flex items-start gap-4 p-4 rounded-lg bg-transparent border border-transparent hover:bg-[#1A1A1A]/50 transition-colors text-left group"
          >
            <div className="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all shadow-sm">
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white/90 text-[15px]">Customize your shortcuts</div>
              <div className="text-sm text-white/50 mt-1 break-anywhere">
                Current recording shortcut: {shortcutLabels[shortcutSettings.record] || shortcutSettings.record}.
              </div>
            </div>
          </motion.button>

          {isShortcutPanelOpen && (
            <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-3 sm:p-4">
              <div className="mb-3 text-xs font-semibold uppercase text-white/40">Recording shortcut</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {shortcutSettings.options.map((shortcut) => {
                  const isSelected = shortcutSettings.record === shortcut;

                  return (
                    <button
                      type="button"
                      key={shortcut}
                      onClick={() => handleShortcutChange(shortcut)}
                      className={clsx(
                        "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors flex items-center justify-between gap-2",
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="font-medium break-anywhere">{shortcutLabels[shortcut] || shortcut}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {shortcutStatus && (
                <div className="mt-3 text-xs text-white/45 break-anywhere">{shortcutStatus}</div>
              )}
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
