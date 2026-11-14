import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/ecommerce.ts';

const TOKEN_SECRET = process.env.AUTH_SECRET || 'kova-dev-ephemeral-signing-key-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export interface AuthTokenPayload {
  uid: string;
  email: string;
  role: UserRole;
  exp: number;
}

export function signAuthToken(payload: Omit<AuthTokenPayload, 'exp'>, ttlHours = 72): string {
  const fullPayload: AuthTokenPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const part of cookies) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'kova_token') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function extractRequestToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return parseCookieToken(req.headers.cookie);
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function attachOptionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (token) {
    const verified = verifyAuthToken(token);
    if (verified) {
      req.auth = verified;
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const verified = verifyAuthToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  req.auth = verified;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const verified = verifyAuthToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Admin session expired.' });
  }
  if (verified.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  req.auth = verified;
  next();
}
