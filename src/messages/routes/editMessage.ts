import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { editChannelMessage } from '../service.js';

interface EditMessageBody {
  content?: unknown;
}

export const editMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Params: { channelId: string; messageId: string }; Body: EditMessageBody }>(
    '/channels/:channelId/messages/:messageId',
    async (request) => {
      const user = requireAuthUser(request);
      const content = typeof request.body?.content === 'string' ? request.body.content : '';
      return editChannelMessage(
        request.params.channelId,
        request.params.messageId,
        user,
        content,
      );
    },
  );
};
