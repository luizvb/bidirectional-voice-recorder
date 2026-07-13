import { upload } from '@vercel/blob/client';
import { getAuthCredentials, getAuthToken } from './auth-token';
import type { AnalysisInput, Recording, RecordingMediaSource, SaveRecordingInput, VoxaPlatform } from './types';

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'same-origin',
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (response.status === 404) return null as T;
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.status === 204 ? undefined as T : response.json();
}

export class WebPlatform implements VoxaPlatform {
  capabilities = {
    kind: 'web' as const,
    systemAudio: Boolean(navigator.mediaDevices?.getDisplayMedia) && /Chrome|Edg\//.test(navigator.userAgent),
    globalShortcuts: false, widget: false, localFolder: false, nativePdf: false,
  };

  listRecordings() { return request<Recording[]>('/api/recordings'); }

  async saveRecording(input: SaveRecordingInput) {
    const { authToken: token } = await getAuthCredentials();
    const id = input.id || crypto.randomUUID();
    const pathname = `recordings/${id}.${input.extension}`;
    const blob = await upload(pathname, new Blob([input.bytes], { type: input.mimeType }), {
      access: 'public', multipart: true, handleUploadUrl: apiUrl('/api/recordings/upload'),
      headers: { Authorization: `Bearer ${token}` },
    });
    return request<Recording>('/api/recordings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, bytes: undefined, id, blobUrl: blob.url, sizeBytes: input.bytes.byteLength }),
    });
  }

  importTranscript(input: { name: string; transcript: string }) {
    return request<Recording>('/api/recordings/import-transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
  }

  deleteRecording(id: string) { return request<void>(`/api/recordings/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  transcribe(input: { recordingId: string; maxQuality?: boolean }) { return request<{ markdown: string }>(`/api/recordings/${encodeURIComponent(input.recordingId)}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maxQuality: Boolean(input.maxQuality) }) }); }
  getTranscript(id: string) { return request<{ markdown: string; speakers?: string[] } | null>(`/api/recordings/${encodeURIComponent(id)}/transcript`); }
  analyze(input: AnalysisInput) { return request<any>(`/api/recordings/${encodeURIComponent(input.recordingId)}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); }
  getAnalysis(id: string) { return request<any | null>(`/api/recordings/${encodeURIComponent(id)}/analysis`); }
  createCheckoutSession() { return request<{ url: string | null }>('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' } }); }
  async exportAnalysisPdf(input: { analysis: any; recording: Recording; locale: string }) {
    const { downloadAnalysisPdf } = await import('../lib/browser-pdf');
    const filePath = await downloadAnalysisPdf(input);
    return { canceled: false, filePath };
  }
  async loadRecordingMedia(recording: Recording): Promise<RecordingMediaSource> {
    const response = await authenticatedFetch(`/api/recordings/${encodeURIComponent(recording.id)}/media`);
    if (!response.ok) throw new Error((await response.text()) || `Could not load audio (${response.status})`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('The saved audio file is empty.');

    const url = URL.createObjectURL(blob);
    let revoked = false;
    return {
      url,
      revoke() {
        if (revoked) return;
        revoked = true;
        URL.revokeObjectURL(url);
      },
    };
  }
  subscribeToRecordingsChanged() { return () => undefined; }
}
