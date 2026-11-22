import type { FastifyPluginAsync } from 'fastify';

export const experimentsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/experiments', async () => {
    return {
      fingerprint: '0.0',
      assignments: [],
    };
  });
};
