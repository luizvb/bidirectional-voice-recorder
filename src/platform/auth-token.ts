import { authClient } from '../lib/auth';

export async function getAuthToken(): Promise<string> {
  const result = await authClient.getSession();
  const token = result.data?.session?.token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return token;
}

export function getTokenSubject(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub === 'string' && payload.sub) return payload.sub;
  } catch { /* The server remains the authority for token validation. */ }
  throw new Error('The authenticated session has no user identifier.');
}

export async function getAuthCredentials() {
  const authToken = await getAuthToken();
  return { authToken, userId: getTokenSubject(authToken) };
}
