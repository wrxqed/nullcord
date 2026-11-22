import type { FastifyPluginAsync } from 'fastify';

export const surveyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/survey', async () => {
    return {};
  });
};
