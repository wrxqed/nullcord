import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { getMessageReactionUsers } from '../reactionService.js';

export const getReactionsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { channelId: string; messageId: string; emoji: string };
    Querystring: { limit?: string };
  }>(
    '/channels/:channelId/messages/:messageId/reactions/:emoji',
    async (request) => {
      const user = requireAuthUser(request);
      const parsedLimit = request.query.limit ? Number(request.query.limit) : undefined;
      return getMessageReactionUsers(
        request.params.channelId,
        request.params.messageId,
        user.id,
        request.params.emoji,
        Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      );
    },
  );
};
