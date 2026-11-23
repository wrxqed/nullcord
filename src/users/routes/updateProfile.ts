import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { broadcastPresenceUpdate } from '../../gateway/presenceService.js';
import { dispatchToUser } from '../../gateway/sessionRegistry.js';
import { saveUserMedia } from '../mediaService.js';
import { updateUser, type UpdateUserInput } from '../userRepository.js';
import { serializeSelfUser } from '../userSerializer.js';

interface UpdateProfileBody {
  bio?: unknown;
  pronouns?: unknown;
  accent_color?: unknown;
  banner?: unknown;
}

export const updateProfileRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Body: UpdateProfileBody }>('/users/@me/profile', async (request) => {
    const user = requireAuthUser(request);
    const body = request.body ?? {};
    const updates: UpdateUserInput = {};

    if (body.bio === null || typeof body.bio === 'string') {
      updates.bio = typeof body.bio === 'string' ? body.bio.slice(0, 190) : null;
    }

    if (body.pronouns === null || typeof body.pronouns === 'string') {
      updates.pronouns = typeof body.pronouns === 'string' ? body.pronouns.slice(0, 40) : null;
    }

    if (body.accent_color === null || typeof body.accent_color === 'number') {
      updates.accent_color = body.accent_color;
    }

    if (body.banner === null) {
      updates.banner = null;
    } else if (typeof body.banner === 'string' && body.banner.startsWith('data:image/')) {
      updates.banner = saveUserMedia('banners', user.id, body.banner);
    }

    const updated = updateUser(user.id, updates);
    if (!updated) {
      throw new DiscordApiError(404, 10013, 'Unknown User');
    }

    dispatchToUser(user.id, 'USER_UPDATE', serializeSelfUser(updated));
    broadcastPresenceUpdate(user.id);

    return {
      bio: updated.bio ?? '',
      pronouns: updated.pronouns ?? '',
      accent_color: updated.accent_color,
      banner: updated.banner,
      theme_colors: null,
    };
  });
};
