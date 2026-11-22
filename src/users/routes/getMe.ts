import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { serializeSelfUser } from '../userSerializer.js';

export const getMeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me', async (request) => {
    const user = requireAuthUser(request);
    return serializeSelfUser(user);
  });
};
