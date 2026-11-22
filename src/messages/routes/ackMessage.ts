import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { isChannelRecipient } from '../../channels/dmService.js';
import { DiscordApiError } from '../../common/errors.js';
import { dispatchToUser } from '../../gateway/sessionRegistry.js';
import { upsertReadState } from '../readStateRepository.js';

export const ackMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { channelId: string; messageId: string } }>(
    '/channels/:channelId/messages/:messageId/ack',
    async (request) => {
      const user = requireAuthUser(request);
      const { channelId, messageId } = request.params;

      if (!isChannelRecipient(channelId, user.id)) {
        throw new DiscordApiError(404, 10003, 'Unknown Channel');
      }

      upsertReadState(user.id, channelId, messageId, 0);
      dispatchToUser(user.id, 'MESSAGE_ACK', {
        channel_id: channelId,
        message_id: messageId,
        version: 1,
      });

      return { token: null };
    },
  );
};
