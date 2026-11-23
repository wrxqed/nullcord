import type { FastifyPluginAsync } from 'fastify';

export const collectiblesShopRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/collectibles-shop', async () => {
    return {
      categories: [],
      bundles: [],
      products: [],
    };
  });
};
