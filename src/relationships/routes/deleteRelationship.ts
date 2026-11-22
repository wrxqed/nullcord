import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { removeRelationship } from '../service.js';

export const deleteRelationshipRoute: FastifyPluginAsync = async (fastify) => {
  fastify.delete<{ Params: { userId: string } }>(
    '/users/@me/relationships/:userId',
    async (request, reply) => {
      const user = requireAuthUser(request);
      removeRelationship(user, request.params.userId);
      return reply.status(204).send();
    },
  );
};
