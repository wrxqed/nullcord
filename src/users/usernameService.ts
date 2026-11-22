import { findUserByUsername } from './userRepository.js';

function sanitizeBaseName(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .replace(/\.{2,}/g, '.');
  if (normalized.length >= 2) {
    return normalized.slice(0, 26);
  }
  return 'user';
}

export function isUsernameTaken(username: string): boolean {
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 32) {
    return true;
  }
  return findUserByUsername(trimmed) !== null;
}

export function suggestAvailableUsername(globalName?: string): string {
  const base = sanitizeBaseName(globalName ?? 'user');
  if (findUserByUsername(base) === null) {
    return base;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${base}${suffix}`.slice(0, 32);
    if (findUserByUsername(candidate) === null) {
      return candidate;
    }
  }

  return `${base}${Date.now().toString().slice(-6)}`.slice(0, 32);
}
