import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';

export const billingRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/billing/payment-sources', async (request) => {
    requireAuthUser(request);
    return [];
  });

  fastify.get('/users/@me/billing/subscriptions', async (request) => {
    requireAuthUser(request);
    return [];
  });

  fastify.get('/users/@me/billing/location-info', async (request) => {
    requireAuthUser(request);
    return {
      country_code: 'US',
    };
  });
};
