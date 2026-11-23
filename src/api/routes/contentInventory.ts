import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const contentInventoryRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/content-inventory/users/@me', async (request) => {
    requireAuthUser(request);
    return {
      entries: [],
    };
  });

  fastify.get('/content-inventory/users/:userId/outbox', async (request) => {
    requireAuthUser(request);
    return {
      entries: [],
    };
  });
};
