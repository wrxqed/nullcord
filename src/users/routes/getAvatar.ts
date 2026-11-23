import type { FastifyPluginAsync } from 'fastify';
import { resolveUserMedia } from '../mediaService.js';

export const getAvatarRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { userId: string; file: string } }>(
    '/avatars/:userId/:file',
    async (request, reply) => {
      const media = resolveUserMedia('avatars', request.params.userId, request.params.file);
      if (!media) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      return reply.type(media.contentType).send(media.buffer);
    },
  );

  fastify.get<{ Params: { userId: string; file: string } }>(
    '/users/:userId/avatars/:file',
    async (request, reply) => {
      const media = resolveUserMedia('avatars', request.params.userId, request.params.file);
      if (!media) {
        return reply.status(404).send({ message: 'Not Found' });
      }
      return reply.type(media.contentType).send(media.buffer);
    },
  );
};
