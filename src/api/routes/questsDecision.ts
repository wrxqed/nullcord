import type { FastifyPluginAsync } from 'fastify';

export const questsDecisionRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/quests/decision', async () => {
    return {
      quests: [],
    };
  });
};
