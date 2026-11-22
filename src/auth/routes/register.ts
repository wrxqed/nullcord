import type { FastifyPluginAsync } from 'fastify';
import { registerUser, type RegisterInput } from '../service.js';

export const registerRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: RegisterInput }>('/auth/register', async (request) => {
    return registerUser(request.body ?? {});
  });
};
