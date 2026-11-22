import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { sendMessageToChannel } from '../service.js';

interface CreateMessageBody {
  content?: unknown;
  nonce?: unknown;
  tts?: unknown;
}

export const createMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { channelId: string }; Body: CreateMessageBody }>(
    '/channels/:channelId/messages',
    async (request) => {
      const user = requireAuthUser(request);
      const body = request.body ?? {};
      const content = typeof body.content === 'string' ? body.content : '';
      const nonce =
        typeof body.nonce === 'string' || typeof body.nonce === 'number'
          ? String(body.nonce)
          : null;
      const tts = Boolean(body.tts);

      return sendMessageToChannel(request.params.channelId, user, content, nonce, tts);
    },
  );
};
