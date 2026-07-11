import { upload } from '@vercel/blob/client';
import { getAuthCredentials, getAuthToken } from './auth-token';
import type { AnalysisInput, Recording, SaveRecordingInput, VoxaPlatform } from './types';

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'same-origin',
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
  if (response.status === 404) return null as T;
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.status === 204 ? undefined as T : response.json();
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]!);
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

  deleteRecording(id: string) { return request<void>(`/api/recordings/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  transcribe(input: { recordingId: string; maxQuality?: boolean }) { return request<{ markdown: string }>(`/api/recordings/${encodeURIComponent(input.recordingId)}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maxQuality: Boolean(input.maxQuality) }) }); }
  getTranscript(id: string) { return request<{ markdown: string } | null>(`/api/recordings/${encodeURIComponent(id)}/transcript`); }
  analyze(input: AnalysisInput) { return request<any>(`/api/recordings/${encodeURIComponent(input.recordingId)}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); }
  getAnalysis(id: string) { return request<any | null>(`/api/recordings/${encodeURIComponent(id)}/analysis`); }
  createCheckoutSession() { return request<{ url: string | null }>('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' } }); }
  async exportAnalysisPdf({ analysis, recording }: { analysis: any; recording: Recording; locale: string }) {
    const report = window.open('', '_blank', 'noopener,noreferrer');
    if (!report) throw new Error('Allow pop-ups to export this report.');
    report.document.write(`<!doctype html><title>${escapeHtml(recording.name)} — Voxa</title><style>body{font:14px/1.55 system-ui;max-width:850px;margin:40px auto;color:#20211f}h1{font-size:36px}pre{white-space:pre-wrap;font:13px/1.55 ui-monospace;background:#f2f5f1;padding:24px;border-radius:12px}@media print{body{margin:0}}</style><h1>${escapeHtml(recording.name)}</h1><p>Voxa conversation intelligence report</p><pre>${escapeHtml(JSON.stringify(analysis, null, 2))}</pre><script>addEventListener('load',()=>print())<\/script>`);
    report.document.close();
    return { canceled: false };
  }
  subscribeToRecordingsChanged() { return () => undefined; }
}
