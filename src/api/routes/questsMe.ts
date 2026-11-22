import type { FastifyPluginAsync } from 'fastify';

export const questsMeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/quests/@me', async () => {
    return {
      quests: [],
      excluded_quests: [],
      quest_enrollment_blocked_until: null,
    };
  });
};
