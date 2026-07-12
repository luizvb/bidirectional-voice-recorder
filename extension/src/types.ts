export type CapturePhase = 'idle' | 'preparing' | 'recording' | 'paused' | 'awaiting_auth' | 'uploading' | 'transcribing' | 'ready' | 'failed' | 'recoverable';

export interface CaptureState {
  phase: CapturePhase;
  sessionId?: string;
  tabId?: number;
  startedAt?: number;
  elapsedBeforePauseMs?: number;
  error?: string;
  progress?: number;
  recordingId?: string;
  resultUrl?: string;
}

export type RuntimeMessage =
  | { type: 'GET_STATE' }
  | { type: 'START_CAPTURE'; consent: boolean; name?: string }
  | { type: 'PAUSE_CAPTURE' }
  | { type: 'RESUME_CAPTURE' }
  | { type: 'STOP_CAPTURE' }
  | { type: 'OPEN_AUTH' }
  | { type: 'RETRY_UPLOAD'; sessionId: string }
  | { type: 'DISCARD_LOCAL'; sessionId: string }
  | { type: 'OFFSCREEN_START'; streamId: string; sessionId: string; name: string }
  | { type: 'OFFSCREEN_PAUSE' }
  | { type: 'OFFSCREEN_RESUME' }
  | { type: 'OFFSCREEN_STOP' }
  | { type: 'CAPTURE_READY'; sessionId: string; durationMs: number; mimeType: string; name: string }
  | { type: 'CAPTURE_ERROR'; error: string };

export interface StoredRecording {
  sessionId: string;
  name: string;
  blob: Blob;
  durationMs: number;
  mimeType: string;
  createdAt: string;
}
