import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { getUserRelationships } from '../service.js';

export const listRelationshipsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/relationships', async (request) => {
    const user = requireAuthUser(request);
    return getUserRelationships(user.id).relationships;
  });
};
