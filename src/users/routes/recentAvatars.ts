import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const recentAvatarsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/avatars', async (request) => {
    requireAuthUser(request);
    return {
      avatars: [],
    };
  });
};
