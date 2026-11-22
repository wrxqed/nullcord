import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { setRelationship } from '../service.js';

interface PutRelationshipBody {
  type?: number;
}

export const putRelationshipRoute: FastifyPluginAsync = async (fastify) => {
  fastify.put<{ Params: { userId: string }; Body: PutRelationshipBody }>(
    '/users/@me/relationships/:userId',
    async (request, reply) => {
      const user = requireAuthUser(request);
      setRelationship(user, request.params.userId, request.body?.type);
      return reply.status(204).send();
    },
  );
};
