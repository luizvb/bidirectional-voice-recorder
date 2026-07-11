import { upload } from '@vercel/blob/client';
import type { StoredRecording } from './types';

const API_URL = __VOXA_API_URL__.replace(/\/$/, '');

async function token() {
  const result = await chrome.storage.local.get('authToken');
  if (!result.authToken) throw new Error('Sign in to Voxa before uploading.');
  return String(result.authToken);
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const authToken = await token();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${authToken}` }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Voxa returned ${response.status}.`);
  }
  return response;
}

export async function uploadRecording(recording: StoredRecording, onProgress: (progress: number) => void) {
  const authToken = await token();
  const extension = recording.mimeType.includes('webm') ? 'webm' : 'audio';
  const blob = await upload(`recordings/${recording.sessionId}.${extension}`, recording.blob, {
    access: 'private',
    contentType: recording.mimeType,
    handleUploadUrl: `${API_URL}/api/recordings/upload`,
    headers: { Authorization: `Bearer ${authToken}` },
    multipart: true,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage))
  });

  const created = await apiFetch('/api/recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: recording.sessionId,
      name: recording.name,
      durationMs: recording.durationMs,
      mode: 'meet-tab+mic',
      mimeType: recording.mimeType,
      sizeBytes: recording.blob.size,
      blobUrl: blob.url,
      createdAt: recording.createdAt
    })
  }).then((response) => response.json());

  await apiFetch(`/api/recordings/${created.recordingId}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return created as { recordingId: string; state: string; resultUrl: string };
}

export async function getRecordingStatus(recordingId: string) {
  return apiFetch(`/api/recordings/${recordingId}/status`).then((response) => response.json()) as Promise<{ state: string; error?: string; resultUrl?: string }>;
}
