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

    let recipientIds: string[] = [];
    if (Array.isArray(body.recipients)) {
      recipientIds = body.recipients.filter((id): id is string => typeof id === 'string' && id.length > 0);
    } else if (typeof body.recipient_id === 'string' && body.recipient_id.length > 0) {
      recipientIds = [body.recipient_id];
    }

    if (recipientIds.length === 0) {
      throw new DiscordApiError(400, 50035, 'Invalid Form Body');
    }

    return getOrCreateDmChannel(user.id, recipientIds);
  });
};
