import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { getDmChannelForUser } from '../dmService.js';

export const getChannelRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { channelId: string } }>(
    '/channels/:channelId',
    async (request) => {
      const user = requireAuthUser(request);
      return getDmChannelForUser(request.params.channelId, user.id);
    },
  );
};
