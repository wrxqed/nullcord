import type { FastifyPluginAsync } from 'fastify';

export const beakerRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/beaker', async (_request, reply) => {
    return reply.status(204).send();
  });
};
