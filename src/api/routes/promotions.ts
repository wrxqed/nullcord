import type { FastifyPluginAsync } from 'fastify';

export const promotionsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/promotions', async () => {
    return [];
  });
};
