import type { FastifyPluginAsync } from 'fastify';
import { isUsernameTaken } from '../usernameService.js';

interface PomeloAttemptBody {
  username?: unknown;
}

export const pomeloAttemptRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: PomeloAttemptBody }>('/users/@me/pomelo-attempt', async (request) => {
    const username = typeof request.body?.username === 'string' ? request.body.username : '';
    return {
      taken: isUsernameTaken(username),
    };
  });
};
