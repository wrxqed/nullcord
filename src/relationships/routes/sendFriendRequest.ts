import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { sendFriendRequest } from '../service.js';

interface SendFriendRequestBody {
  username?: unknown;
}

export const sendFriendRequestRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: SendFriendRequestBody }>(
    '/users/@me/relationships',
    async (request, reply) => {
      const user = requireAuthUser(request);
      const username = typeof request.body?.username === 'string' ? request.body.username : '';
      if (username.trim().length === 0) {
        throw new DiscordApiError(400, 50035, 'Invalid Form Body');
      }
      sendFriendRequest(user, username);
      return reply.status(204).send();
    },
  );
};
