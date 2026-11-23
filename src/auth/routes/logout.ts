import type { FastifyPluginAsync } from 'fastify';

export const logoutRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/logout', async (_request, reply) => {
    return reply.status(204).send();
  });
};
