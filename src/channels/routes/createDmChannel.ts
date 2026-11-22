import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { DiscordApiError } from '../../common/errors.js';
import { getOrCreateDmChannel } from '../dmService.js';

interface CreateDmBody {
  recipient_id?: unknown;
  recipients?: unknown;
}

export const createDmChannelRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateDmBody }>('/users/@me/channels', async (request) => {
    const user = requireAuthUser(request);
    const body = request.body ?? {};

    let targetId: string | null = null;
    if (typeof body.recipient_id === 'string' && body.recipient_id.length > 0) {
      targetId = body.recipient_id;
    } else if (Array.isArray(body.recipients) && typeof body.recipients[0] === 'string') {
      targetId = body.recipients[0];
    }

    if (!targetId) {
      throw new DiscordApiError(400, 50035, 'Invalid Form Body');
    }

    return getOrCreateDmChannel(user.id, targetId);
  });
};
