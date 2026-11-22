import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const ackMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { channelId: string; messageId: string } }>(
    '/channels/:channelId/messages/:messageId/ack',
    async (request) => {
      requireAuthUser(request);
      return { token: null };
    },
  );
};
