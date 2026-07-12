import { getAuthToken } from '../platform/auth-token';
import type { EvalRun, EvalRunConfig, PromptReview } from '../types/evals';

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${apiBaseUrl}/api/internal/evals${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
async function download(path: string) {
  const token = await getAuthToken();
  const response = await fetch(`${apiBaseUrl}/api/internal/evals${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Export failed (${response.status})`);
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'voxa-evals.csv';
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const evalsApi = {
  prompt: () => request<{ systemPrompt: string; supervisorPrompt: string }>('/prompt'),
  list: () => request<EvalRun[]>('/runs'),
  get: (id: string) => request<EvalRun>(`/runs/${id}`),
  create: (config: EvalRunConfig) => request<EvalRun>('/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }),
  cancel: (id: string) => request<{ status: string }>(`/runs/${id}/cancel`, { method: 'POST' }),
  retry: (id: string) => request<{ status: string }>(`/cases/${id}/retry`, { method: 'POST' }),
  exportCsv: (runId: string, caseId?: string) => download(`/runs/${runId}/export.csv${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ''}`),
  improvePrompt: (runId: string) => request<PromptReview>(`/runs/${runId}/improve-prompt`, { method: 'POST' })
};
