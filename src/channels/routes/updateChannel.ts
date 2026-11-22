import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { updateGroupDmChannel } from '../dmService.js';

interface UpdateChannelBody {
  name?: unknown;
}

export const updateChannelRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Params: { channelId: string }; Body: UpdateChannelBody }>(
    '/channels/:channelId',
    async (request) => {
      const user = requireAuthUser(request);
      const name = typeof request.body?.name === 'string' ? request.body.name : null;
      return updateGroupDmChannel(request.params.channelId, user.id, name);
    },
  );
};
