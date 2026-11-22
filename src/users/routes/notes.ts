import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const notesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { userId: string } }>(
    '/users/@me/notes/:userId',
    async (request) => {
      const user = requireAuthUser(request);
      return {
        note: '',
        note_user_id: request.params.userId,
        user_id: user.id,
      };
    },
  );
};
