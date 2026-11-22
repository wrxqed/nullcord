import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { deleteChannelMessage } from '../service.js';

export const deleteMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.delete<{ Params: { channelId: string; messageId: string } }>(
    '/channels/:channelId/messages/:messageId',
    async (request, reply) => {
      const user = requireAuthUser(request);
      deleteChannelMessage(request.params.channelId, request.params.messageId, user);
      return reply.status(204).send();
    },
  );
};
