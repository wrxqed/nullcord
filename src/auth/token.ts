import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

function signPart(data: string): string {
  return createHmac('sha256', env.tokenSecret).update(data).digest('base64url');
}

export function generateToken(userId: string): string {
  const encodedId = Buffer.from(userId, 'utf8').toString('base64url');
  const issuedAt = Buffer.from(Date.now().toString(36), 'utf8').toString('base64url');
  const payload = `${encodedId}.${issuedAt}`;
  const signature = signPart(payload);
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const encodedId = parts[0];
  const issuedAt = parts[1];
  const signature = parts[2];
  if (!encodedId || !issuedAt || !signature) {
    return null;
  }

  const payload = `${encodedId}.${issuedAt}`;
  const expectedSignature = signPart(payload);

  const actualBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  if (actualBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  const userId = Buffer.from(encodedId, 'base64url').toString('utf8');
  if (!/^\d+$/.test(userId)) {
    return null;
  }

  return userId;
}
