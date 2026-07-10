import { useEffect } from 'react';
import { Check, Mic, Pause, Play, Square, X } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useKeyboardActions } from '../hooks/useKeyboardActions';
import { useRecorder } from '../hooks/useRecorder';

const Waveform = ({ isPaused, isRecording }: { isPaused: boolean; isRecording: boolean }) => {
  const heights = [
    6, 10, 14, 12, 18, 24, 30, 22, 34, 28, 32, 26, 36, 30, 20,
    30, 36, 26, 32, 28, 34, 22, 30, 24, 18, 12, 14, 10, 6
  ];

  const shouldAnimate = isRecording && !isPaused;

  return (
    <div className="flex h-9 w-full items-center justify-center gap-[2px] overflow-hidden">
      {heights.map((height, index) => (
        <motion.div
          key={index}
          className="w-[2px] rounded-full bg-white"
          initial={{ height: 4 }}
          animate={{
            height: shouldAnimate ? [height * 0.4, height, height * 0.4] : 4,
            opacity: shouldAnimate ? 1 : 0.4
          }}
          transition={shouldAnimate ? {
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 0.5,
            ease: 'easeInOut'
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
};

export default function MiniWidget() {
  const {
    isRecording,
    isPaused,
    isReviewing,
    reviewBlob,
    formattedTime,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveReview,
    discardReview
  } = useRecorder();

  const hideWidget = () => {
    if (window.recorder && window.recorder.hideWidget) {
      window.recorder.hideWidget();
    }
  };

  useKeyboardActions({ onEscape: hideWidget });

  useEffect(() => {
    if (!isRecording && !isReviewing) {
      const timeout = setTimeout(hideWidget, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isRecording, isReviewing]);

  const handleStart = () => void startRecording();
  const handleStop = () => void stopRecording({ review: true });
  const handleCancel = () => void stopRecording({ discard: true });

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50';

  return (
    <div className="drag-region flex h-full w-full cursor-default items-center gap-3 rounded-xl border border-white/10 bg-[#171719]/95 p-2.5 font-sans shadow-2xl backdrop-blur-2xl">
      <div className="no-drag flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
        <div
          className={clsx(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            isRecording && !isPaused ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'bg-white/30'
          )}
        />

        <div className="min-w-0 flex-1">
          {isReviewing && reviewBlob ? (
            <audio src={reviewBlob.url} controls className="h-8 w-full min-w-0 outline-none" />
          ) : (
            <Waveform isPaused={isPaused} isRecording={isRecording} />
          )}
        </div>

        <div className="w-12 shrink-0 text-right font-mono text-xs text-white/60">
          {formattedTime}
        </div>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-1.5">
        {!isRecording && !isReviewing ? (
          <button
            onClick={handleStart}
            data-keyboard-primary="true"
            className={`${iconButtonClass} bg-white text-black hover:bg-white/90`}
            title="Record"
            aria-label="Record"
          >
            <Mic className="h-4 w-4" />
          </button>
        ) : isReviewing ? (
          <>
            <button
              onClick={discardReview}
              data-keyboard-cancel="true"
              className={`${iconButtonClass} bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white`}
              title="Discard"
              aria-label="Discard"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={saveReview}
              data-keyboard-primary="true"
              className={`${iconButtonClass} bg-blue-500 text-white hover:bg-blue-600`}
              title="Save"
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className={`${iconButtonClass} bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white`}
              title={isPaused ? 'Resume' : 'Pause'}
              aria-label={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
            </button>
            <button
              onClick={handleStop}
              data-keyboard-primary="true"
              className={`${iconButtonClass} bg-white text-black hover:bg-white/90`}
              title="Stop"
              aria-label="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
            <button
              onClick={handleCancel}
              data-keyboard-cancel="true"
              className={`${iconButtonClass} bg-[#2A2A2E] text-white/80 hover:bg-[#333338] hover:text-white`}
              title="Cancel"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
