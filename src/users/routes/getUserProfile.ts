import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { listMutualFriendIds } from '../../relationships/repository.js';
import { findUserById, findUsersByIds } from '../userRepository.js';
import { serializePublicUser } from '../userSerializer.js';

interface ProfileQuery {
  with_mutual_friends?: string;
}

export const getUserProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { userId: string }; Querystring: ProfileQuery }>(
    '/users/:userId/profile',
    async (request) => {
      const viewer = requireAuthUser(request);
      const target = findUserById(request.params.userId);
      if (!target) {
        throw new DiscordApiError(404, 10013, 'Unknown User');
      }

      const mutualIds =
        viewer.id === target.id ? [] : listMutualFriendIds(viewer.id, target.id);
      const includeMutualFriends = request.query.with_mutual_friends === 'true';
      const mutualFriends = includeMutualFriends
        ? findUsersByIds(mutualIds).map(serializePublicUser)
        : [];

      return {
        user: serializePublicUser(target),
        user_profile: {
          bio: target.bio ?? '',
          pronouns: target.pronouns ?? '',
          accent_color: target.accent_color,
          banner: target.banner,
          theme_colors: null,
        },
        mutual_guilds: [],
        mutual_friends: mutualFriends,
        mutual_friends_count: mutualIds.length,
        connected_accounts: [],
      };
    },
  );
};
