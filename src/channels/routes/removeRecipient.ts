import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { removeGroupDmRecipient } from '../dmService.js';

export const removeRecipientRoute: FastifyPluginAsync = async (fastify) => {
  fastify.delete<{ Params: { channelId: string; userId: string } }>(
    '/channels/:channelId/recipients/:userId',
    async (request, reply) => {
      const user = requireAuthUser(request);
      removeGroupDmRecipient(request.params.channelId, user.id, request.params.userId);
      return reply.status(204).send();
    },
  );
};
