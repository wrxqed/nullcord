import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { listUserDmChannels } from '../dmService.js';

export const listDmChannelsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/channels', async (request) => {
    const user = requireAuthUser(request);
    return listUserDmChannels(user.id).channels;
  });
};
