import type { FastifyPluginAsync } from 'fastify';

export const metricsV2Route: FastifyPluginAsync = async (fastify) => {
  fastify.post('/metrics/v2', async (_request, reply) => {
    return reply.status(204).send();
  });
};
