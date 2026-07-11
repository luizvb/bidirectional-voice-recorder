import { saveRecording } from './storage';
import type { RuntimeMessage } from './types';

let recorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;
let streams: MediaStream[] = [];
let chunks: Blob[] = [];
let sessionId = '';
let sessionName = '';
let startedAt = 0;
let elapsedBeforePauseMs = 0;

function stopTracks() {
  streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  streams = [];
  void audioContext?.close();
  audioContext = null;
}

function preferredMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function startCapture(streamId: string, nextSessionId: string, name: string) {
  if (recorder && recorder.state !== 'inactive') throw new Error('A recording is already active.');

  sessionId = nextSessionId;
  sessionName = name;
  chunks = [];
  elapsedBeforePauseMs = 0;
  audioContext = new AudioContext();

  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } as MediaTrackConstraints,
    video: false
  });
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false
  });
  streams = [tabStream, micStream];

  const destination = audioContext.createMediaStreamDestination();
  for (const stream of streams) {
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(destination);
  }

  // Route tab audio to the user as tabCapture otherwise mutes the captured tab.
  const playback = audioContext.createMediaStreamSource(tabStream);
  playback.connect(audioContext.destination);
  await audioContext.resume();

  const mimeType = preferredMimeType();
  recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onerror = (event) => {
    void chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: event.error?.message || 'MediaRecorder failed.' } satisfies RuntimeMessage);
  };
  recorder.onstop = async () => {
    const durationMs = elapsedBeforePauseMs + Math.max(0, Date.now() - startedAt);
    const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
    stopTracks();
    try {
      await saveRecording({ sessionId, name: sessionName, blob, durationMs, mimeType: blob.type, createdAt: new Date().toISOString() });
      await chrome.runtime.sendMessage({ type: 'CAPTURE_READY', sessionId, durationMs, mimeType: blob.type, name: sessionName } satisfies RuntimeMessage);
    } catch (error) {
      await chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: error instanceof Error ? error.message : String(error) } satisfies RuntimeMessage);
    }
    recorder = null;
    chunks = [];
  };

  startedAt = Date.now();
  recorder.start(5_000);
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'OFFSCREEN_START') await startCapture(message.streamId, message.sessionId, message.name);
      if (message.type === 'OFFSCREEN_PAUSE' && recorder?.state === 'recording') {
        recorder.pause();
        elapsedBeforePauseMs += Date.now() - startedAt;
      }
      if (message.type === 'OFFSCREEN_RESUME' && recorder?.state === 'paused') {
        recorder.resume();
        startedAt = Date.now();
      }
      if (message.type === 'OFFSCREEN_STOP' && recorder && recorder.state !== 'inactive') recorder.stop();
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();
  return true;
});
