import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { dispatchToUser } from '../../gateway/sessionRegistry.js';
import { findUserByUsername, updateUser } from '../userRepository.js';
import { serializeSelfUser } from '../userSerializer.js';

interface UpdateMeBody {
  username?: unknown;
  global_name?: unknown;
  avatar?: unknown;
  date_of_birth?: unknown;
}

export const updateMeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Body: UpdateMeBody }>('/users/@me', async (request) => {
    const user = requireAuthUser(request);
    const body = request.body ?? {};

    let nextUsername: string | undefined;
    if (typeof body.username === 'string') {
      const trimmed = body.username.trim();
      if (trimmed.length < 2 || trimmed.length > 32) {
        throw new DiscordApiError(400, 50035, 'Invalid Form Body');
      }
      const existing = findUserByUsername(trimmed);
      if (existing && existing.id !== user.id) {
        throw new DiscordApiError(400, 50035, 'Invalid Form Body', {
          username: {
            _errors: [{ code: 'USERNAME_ALREADY_TAKEN', message: 'Username is already taken.' }],
          },
        });
      }
      nextUsername = trimmed;
    }

    const updated = updateUser(user.id, {
      username: nextUsername,
      global_name:
        body.global_name === null || typeof body.global_name === 'string'
          ? body.global_name
          : undefined,
      avatar: body.avatar === null || typeof body.avatar === 'string' ? body.avatar : undefined,
      date_of_birth:
        body.date_of_birth === null || typeof body.date_of_birth === 'string'
          ? body.date_of_birth
          : undefined,
    });

    if (!updated) {
      throw new DiscordApiError(404, 10013, 'Unknown User');
    }

    const dto = serializeSelfUser(updated);
    dispatchToUser(user.id, 'USER_UPDATE', dto);
    return dto;
  });
};
