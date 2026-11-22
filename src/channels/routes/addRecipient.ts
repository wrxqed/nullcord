import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { addGroupDmRecipient } from '../dmService.js';

export const addRecipientRoute: FastifyPluginAsync = async (fastify) => {
  fastify.put<{ Params: { channelId: string; userId: string } }>(
    '/channels/:channelId/recipients/:userId',
    async (request, reply) => {
      const user = requireAuthUser(request);
      addGroupDmRecipient(request.params.channelId, user.id, request.params.userId);
      return reply.status(204).send();
    },
  );
};
