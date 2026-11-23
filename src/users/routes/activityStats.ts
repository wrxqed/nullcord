import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const activityStatsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/activities/statistics/applications', async (request) => {
    requireAuthUser(request);
    return [];
  });
};
