import type { FastifyPluginAsync } from 'fastify';

export const conditionalStartRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/conditional/start', async () => {
    return {
      result: 'fallthrough',
    };
  });
};
