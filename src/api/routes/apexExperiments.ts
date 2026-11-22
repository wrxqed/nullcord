import type { FastifyPluginAsync } from 'fastify';

export const apexExperimentsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/apex/experiments', async () => {
    return {
      assignments: {},
    };
  });
};
