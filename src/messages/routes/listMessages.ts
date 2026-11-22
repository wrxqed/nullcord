import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { getMessagesForChannel } from '../service.js';

interface ListMessagesQuery {
  limit?: string;
  before?: string;
}

export const listMessagesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { channelId: string }; Querystring: ListMessagesQuery }>(
    '/channels/:channelId/messages',
    async (request) => {
      const user = requireAuthUser(request);
      const parsedLimit = request.query.limit ? Number(request.query.limit) : undefined;
      return getMessagesForChannel(
        request.params.channelId,
        user.id,
        Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        request.query.before,
      );
    },
  );
};
