import type { FastifyPluginAsync } from 'fastify';
import { loginUser, type LoginInput } from '../service.js';

export const loginRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: LoginInput }>('/auth/login', async (request) => {
    return loginUser(request.body ?? {});
  });
};
