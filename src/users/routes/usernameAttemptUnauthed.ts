import type { FastifyPluginAsync } from 'fastify';
import { isUsernameTaken } from '../usernameService.js';

interface UsernameAttemptBody {
  username?: unknown;
}

export const usernameAttemptUnauthedRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: UsernameAttemptBody }>(
    '/unique-username/username-attempt-unauthed',
    async (request) => {
      const username = typeof request.body?.username === 'string' ? request.body.username : '';
      return {
        taken: isUsernameTaken(username),
      };
    },
  );
};
