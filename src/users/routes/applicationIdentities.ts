import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const applicationIdentitiesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/:userId/application-identities', async (request) => {
    requireAuthUser(request);
    return {
      identities: [],
    };
  });
};
