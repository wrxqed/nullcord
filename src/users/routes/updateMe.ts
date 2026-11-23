import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import { generateToken } from '../../auth/token.js';
import { DiscordApiError } from '../../common/errors.js';
import { broadcastPresenceUpdate } from '../../gateway/presenceService.js';
import { dispatchToUser } from '../../gateway/sessionRegistry.js';
import { saveUserMedia } from '../mediaService.js';
import {
  findUserByEmail,
  findUserByUsername,
  updateUser,
  type UpdateUserInput,
} from '../userRepository.js';
import { serializeSelfUser } from '../userSerializer.js';

interface UpdateMeBody {
  username?: unknown;
  global_name?: unknown;
  email?: unknown;
  password?: unknown;
  new_password?: unknown;
  avatar?: unknown;
  banner?: unknown;
  accent_color?: unknown;
  bio?: unknown;
  pronouns?: unknown;
  date_of_birth?: unknown;
}

function fieldError(field: string, code: string, message: string): DiscordApiError {
  return new DiscordApiError(400, 50035, 'Invalid Form Body', {
    [field]: {
      _errors: [{ code, message }],
    },
  });
}

export const updateMeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Body: UpdateMeBody }>('/users/@me', async (request) => {
    const user = requireAuthUser(request);
    const body = request.body ?? {};
    const updates: UpdateUserInput = {};
    let passwordChanged = false;

    const needsPasswordCheck =
      typeof body.email === 'string' ||
      typeof body.new_password === 'string' ||
      (typeof body.username === 'string' && body.username.trim() !== user.username);

    if (needsPasswordCheck) {
      const currentPassword = typeof body.password === 'string' ? body.password : '';
      if (!verifyPassword(currentPassword, user.password_hash)) {
        throw fieldError('password', 'INVALID_PASSWORD', 'Password does not match.');
      }
    }

    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email.includes('@')) {
        throw fieldError('email', 'EMAIL_TYPE_INVALID_EMAIL', 'Not a well formed email address.');
      }
      const existing = findUserByEmail(email);
      if (existing && existing.id !== user.id) {
        throw fieldError('email', 'EMAIL_ALREADY_REGISTERED', 'Email is already registered.');
      }
      updates.email = email;
    }

    if (typeof body.username === 'string') {
      const username = body.username.trim();
      if (username.length < 2 || username.length > 32) {
        throw fieldError('username', 'BASE_TYPE_BAD_LENGTH', 'Must be between 2 and 32 in length.');
      }
      const existing = findUserByUsername(username);
      if (existing && existing.id !== user.id) {
        throw fieldError('username', 'USERNAME_ALREADY_TAKEN', 'Username is already taken.');
      }
      updates.username = username;
    }

    if (typeof body.new_password === 'string') {
      if (body.new_password.length < 6) {
        throw fieldError('new_password', 'BASE_TYPE_BAD_LENGTH', 'Must be at least 6 characters.');
      }
      updates.password_hash = hashPassword(body.new_password);
      passwordChanged = true;
    }

    if (body.global_name === null) {
      updates.global_name = null;
    } else if (typeof body.global_name === 'string') {
      const trimmed = body.global_name.trim();
      updates.global_name = trimmed.length > 0 ? trimmed.slice(0, 32) : null;
    }

    if (body.avatar === null) {
      updates.avatar = null;
    } else if (typeof body.avatar === 'string' && body.avatar.startsWith('data:image/')) {
      updates.avatar = saveUserMedia('avatars', user.id, body.avatar);
    }

    if (body.banner === null) {
      updates.banner = null;
    } else if (typeof body.banner === 'string' && body.banner.startsWith('data:image/')) {
      updates.banner = saveUserMedia('banners', user.id, body.banner);
    }

    if (body.accent_color === null || typeof body.accent_color === 'number') {
      updates.accent_color = body.accent_color;
    }

    if (body.bio === null || typeof body.bio === 'string') {
      updates.bio = typeof body.bio === 'string' ? body.bio.slice(0, 190) : null;
    }

    if (body.pronouns === null || typeof body.pronouns === 'string') {
      updates.pronouns = typeof body.pronouns === 'string' ? body.pronouns.slice(0, 40) : null;
    }

    if (body.date_of_birth === null || typeof body.date_of_birth === 'string') {
      updates.date_of_birth = body.date_of_birth;
    }

    const updated = updateUser(user.id, updates);
    if (!updated) {
      throw new DiscordApiError(404, 10013, 'Unknown User');
    }

    const dto = serializeSelfUser(updated);
    dispatchToUser(user.id, 'USER_UPDATE', dto);
    broadcastPresenceUpdate(user.id);

    if (passwordChanged) {
      return {
        ...dto,
        token: generateToken(updated.id),
      };
    }

    return dto;
  });
};
