import type { FastifyPluginAsync } from 'fastify';

export const errorReportingProxyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/error-reporting-proxy/web', async (_request, reply) => {
    return reply.status(204).send();
  });
};
