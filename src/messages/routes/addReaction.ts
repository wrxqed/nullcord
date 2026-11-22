import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { addMessageReaction } from '../reactionService.js';

export const addReactionRoute: FastifyPluginAsync = async (fastify) => {
  fastify.put<{ Params: { channelId: string; messageId: string; emoji: string; target: string } }>(
    '/channels/:channelId/messages/:messageId/reactions/:emoji/:target',
    async (request, reply) => {
      const user = requireAuthUser(request);
      if (decodeURIComponent(request.params.target) !== '@me') {
        throw new DiscordApiError(404, 0, '404: Not Found');
      }

      addMessageReaction(
        request.params.channelId,
        request.params.messageId,
        user.id,
        request.params.emoji,
      );
      return reply.status(204).send();
    },
  );
};
