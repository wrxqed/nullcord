import type { FastifyPluginAsync } from 'fastify';

export const applicationEntitlementsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/applications/:applicationId/entitlements', async () => {
    return [];
  });
};
