import type { FastifyRequest } from 'fastify';
import { DiscordApiError } from '../common/errors.js';
import { findUserById, type UserRecord } from '../users/userRepository.js';
import { verifyToken } from './token.js';

export function requireAuthUser(request: FastifyRequest): UserRecord {
  const rawAuth = request.headers.authorization;
  if (!rawAuth || rawAuth.trim().length === 0) {
    throw new DiscordApiError(401, 0, '401: Unauthorized');
  }

  const token = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : rawAuth.trim();
  const userId = verifyToken(token);
  if (userId === null) {
    throw new DiscordApiError(401, 0, '401: Unauthorized');
  }

  const user = findUserById(userId);
  if (user === null) {
    throw new DiscordApiError(401, 0, '401: Unauthorized');
  }

  return user;
}
