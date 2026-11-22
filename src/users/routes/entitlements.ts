import type { FastifyPluginAsync } from 'fastify';

export const entitlementsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/entitlements', async () => {
    return [];
  });
};
