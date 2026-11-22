import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { removeMessageReaction } from '../reactionService.js';

export const removeOwnReactionRoute: FastifyPluginAsync = async (fastify) => {
  fastify.delete<{ Params: { channelId: string; messageId: string; emoji: string; target: string } }>(
    '/channels/:channelId/messages/:messageId/reactions/:emoji/:target',
    async (request, reply) => {
      const user = requireAuthUser(request);
      if (decodeURIComponent(request.params.target) !== '@me') {
        throw new DiscordApiError(404, 0, '404: Not Found');
      }

      removeMessageReaction(
        request.params.channelId,
        request.params.messageId,
        user.id,
        request.params.emoji,
      );
      return reply.status(204).send();
    },
  );
};
