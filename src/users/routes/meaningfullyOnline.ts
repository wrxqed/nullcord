import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const meaningfullyOnlineRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/users/@me/meaningfully-online', async (request, reply) => {
    requireAuthUser(request);
    return reply.status(204).send();
  });
};
