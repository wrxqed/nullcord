import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { dispatchToUser } from '../../gateway/sessionRegistry.js';
import { getChannelRecipientIds, isChannelRecipient } from '../dmService.js';

export const typingRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { channelId: string } }>(
    '/channels/:channelId/typing',
    async (request, reply) => {
      const user = requireAuthUser(request);
      const { channelId } = request.params;

      if (!isChannelRecipient(channelId, user.id)) {
        throw new DiscordApiError(404, 10003, 'Unknown Channel');
      }

      const recipientIds = getChannelRecipientIds(channelId);
      const timestamp = Math.floor(Date.now() / 1000);
      for (const recipientId of recipientIds) {
        if (recipientId !== user.id) {
          dispatchToUser(recipientId, 'TYPING_START', {
            channel_id: channelId,
            user_id: user.id,
            timestamp,
          });
        }
      }

      return reply.status(204).send();
    },
  );
};
