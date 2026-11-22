import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const settingsProtoRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/settings-proto/:type', async (request) => {
    requireAuthUser(request);
    return {
      settings: '',
    };
  });
};
