import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { closeDmChannelForUser } from '../dmService.js';

export const closeDmChannelRoute: FastifyPluginAsync = async (fastify) => {
  fastify.delete<{ Params: { channelId: string } }>(
    '/channels/:channelId',
    async (request) => {
      const user = requireAuthUser(request);
      return closeDmChannelForUser(request.params.channelId, user.id);
    },
  );
};
