import type { FastifyPluginAsync } from 'fastify';

export const scienceRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/science', async (_request, reply) => {
    return reply.status(204).send();
  });
};
