import type { FastifyPluginAsync } from 'fastify';

export const storefrontPromotionsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/storefront/promotions', async () => {
    return [];
  });
};
