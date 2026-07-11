import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (jwks) return jwks;
  const authUrl = process.env.NEON_AUTH_URL || process.env.VITE_NEON_AUTH_URL;
  if (!authUrl) throw new Error('Missing NEON_AUTH_URL.');
  const url = process.env.NEON_AUTH_JWKS_URL || `${authUrl.replace(/\/$/, '')}/.well-known/jwks.json`;
  jwks = createRemoteJWKSet(new URL(url));
  return jwks;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), getJwks());
    if (!payload.sub) throw new Error('Token subject is missing.');
    req.user = { id: payload.sub };
    next();
  } catch (error) {
    console.warn('Rejected authentication token:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
