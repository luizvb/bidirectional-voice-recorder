import { useState, useCallback, useRef, useEffect } from 'react';
import { platform } from '../platform';

declare global {
  interface Window {
    recorder: any;
  }
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewBlob, setReviewBlob] = useState<{ blob: Blob; durationMs: number; url: string } | null>(null);
  
  const [status, setStatus] = useState('Ready');
  const [sessionName, setSessionName] = useState('Voxa Session');
  
  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Time tracking
  const startedAtRef = useRef<number>(0);
  const totalElapsedBeforePauseRef = useRef<number>(0);
  const timerHandleRef = useRef<number | null>(null);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const stopStreams = () => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamsRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const preferredMimeType = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'video/webm;codecs=opus', 'video/webm'];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
  };

  const createCaptureStream = async () => {
    audioContextRef.current = new window.AudioContext();
    const destination = audioContextRef.current.createMediaStreamDestination();
    const warnings: string[] = [];

    let mic: MediaStream | null = null;
    let system: MediaStream | null = null;

    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamsRef.current.push(mic);
    } catch (e: any) {
      throw new Error(`Microphone permission denied: ${e.message}`);
    }

    try {
      if (!platform.capabilities.systemAudio) {
        warnings.push('Shared tab audio is not supported in this browser. Recording microphone only.');
      } else system = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true // Video track is required by spec, we will drop it
      });
      if (system) {
        system.getVideoTracks().forEach(track => track.stop());
        streamsRef.current.push(system);
        if (system.getAudioTracks().length === 0) warnings.push('The shared source did not provide audio. Recording microphone only.');
      }
    } catch (e: any) {
      warnings.push(e?.name === 'NotAllowedError'
        ? 'Tab or screen sharing was canceled. Recording microphone only.'
        : 'Shared audio could not be captured. Recording microphone only.');
    }

    // Merge into stereo channels (Mic = Left, System = Right)
    const merger = audioContextRef.current.createChannelMerger(2);
    const micSource = audioContextRef.current.createMediaStreamSource(mic);
    micSource.connect(merger, 0, 0);

    if (system && system.getAudioTracks().length > 0) {
      const systemSource = audioContextRef.current.createMediaStreamSource(system);
      systemSource.connect(merger, 0, 1);
    }

    merger.connect(destination);

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return { stream: destination.stream, warnings };
  };

  const startTimer = () => {
    startedAtRef.current = Date.now();
    timerHandleRef.current = window.setInterval(() => {
      setElapsedMs(totalElapsedBeforePauseRef.current + (Date.now() - startedAtRef.current));
    }, 100);
  };

  const stopTimer = () => {
    if (timerHandleRef.current) {
      clearInterval(timerHandleRef.current);
      timerHandleRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    setStatus('Preparing recording permissions...');
    
    // Clear previous review
    if (reviewBlob && reviewBlob.url) URL.revokeObjectURL(reviewBlob.url);
    setIsReviewing(false);
    setReviewBlob(null);

    try {
      chunksRef.current = [];
      const capture = await createCaptureStream();
      const mimeType = preferredMimeType();
      
      mediaRecorderRef.current = new MediaRecorder(capture.stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.start(1000);
      
      setIsRecording(true);
      setIsPaused(false);
      setStatus(capture.warnings.length > 0 ? capture.warnings.join(' ') : 'Recording microphone...');
      
      totalElapsedBeforePauseRef.current = 0;
      setElapsedMs(0);
      startTimer();
    } catch (error: any) {
      stopStreams();
      setStatus(`Recording permission failed: ${error.message}`);
    }
  }, [reviewBlob]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      totalElapsedBeforePauseRef.current += (Date.now() - startedAtRef.current);
      setIsPaused(true);
      setStatus('Paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startedAtRef.current = Date.now();
      startTimer();
      setIsPaused(false);
      setStatus('Recording...');
    }
  }, []);

  const stopRecording = useCallback(async (options: { discard?: boolean, review?: boolean } = {}) => {
    return new Promise<any>((resolve, reject) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return resolve(undefined);
      
      stopTimer();
      
      mediaRecorderRef.current.addEventListener('stop', async () => {
        const durationMs = totalElapsedBeforePauseRef.current + (isPaused ? 0 : (Date.now() - startedAtRef.current));
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        
        stopStreams();
        setIsRecording(false);
        setIsPaused(false);

        if (options.discard) {
           setStatus('Discarded');
           return resolve(undefined);
        }

        if (options.review) {
           const url = URL.createObjectURL(blob);
           setReviewBlob({ blob, durationMs, url });
           setIsReviewing(true);
           setStatus('Reviewing');
           return resolve(undefined);
        }
        
        // Default: save immediately
        setStatus('Saving...');
        try {
          const bytes = await blob.arrayBuffer();
          const saved = await platform.saveRecording({
            name: sessionName || 'Untitled recording',
            durationMs,
            mode: 'mic',
            mimeType: blob.type || 'audio/webm',
            extension: 'webm',
            bytes
          });
          setStatus('Saved');
          resolve(saved);
        } catch (error: any) {
          setStatus(`Save failed: ${error.message}`);
          reject(error);
        }
      }, { once: true });

      mediaRecorderRef.current.stop();
    });
  }, [sessionName, isPaused]);

  const saveReview = useCallback(async () => {
    if (!reviewBlob) return;
    setStatus('Saving...');
    try {
      const bytes = await reviewBlob.blob.arrayBuffer();
      await platform.saveRecording({
        name: sessionName || 'Untitled recording',
        durationMs: reviewBlob.durationMs,
        mode: 'mic',
        mimeType: reviewBlob.blob.type || 'audio/webm',
        extension: 'webm',
        bytes
      });
      setStatus('Saved');
      setIsReviewing(false);
      URL.revokeObjectURL(reviewBlob.url);
      setReviewBlob(null);
    } catch (e: any) {
      setStatus(`Save failed: ${e.message}`);
    }
  }, [reviewBlob, sessionName]);

  const discardReview = useCallback(() => {
    if (reviewBlob && reviewBlob.url) {
      URL.revokeObjectURL(reviewBlob.url);
    }
    setIsReviewing(false);
    setReviewBlob(null);
    setStatus('Discarded');
  }, [reviewBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopStreams();
      if (reviewBlob && reviewBlob.url) {
        URL.revokeObjectURL(reviewBlob.url);
      }
    };
  }, [reviewBlob]);

  return {
    isRecording,
    isPaused,
    isReviewing,
    reviewBlob,
    status,
    sessionName,
    setSessionName,
    elapsedMs,
    formattedTime: formatDuration(elapsedMs),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveReview,
    discardReview
  };
}
