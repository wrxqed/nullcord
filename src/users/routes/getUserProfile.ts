import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { findUserById } from '../userRepository.js';
import { serializePublicUser } from '../userSerializer.js';

export const getUserProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { userId: string } }>(
    '/users/:userId/profile',
    async (request) => {
      requireAuthUser(request);
      const target = findUserById(request.params.userId);
      if (!target) {
        throw new DiscordApiError(404, 10013, 'Unknown User');
      }

      return {
        user: serializePublicUser(target),
        user_profile: {
          bio: '',
          accent_color: null,
        },
        mutual_guilds: [],
        mutual_friends: [],
        mutual_friends_count: 0,
        connected_accounts: [],
      };
    },
  );
};
