import type { FastifyPluginAsync } from 'fastify';
import { env } from '../../config/env.js';

export const gatewayRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/gateway', async () => {
    return {
      url: env.gatewayUrl,
    };
  });
};
