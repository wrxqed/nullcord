import type { FastifyPluginAsync } from 'fastify';

export const referralsEligibilityRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/referrals/eligibility', async () => {
    return {
      referrals_remaining: 0,
      sent_user_ids: [],
      refresh_at: null,
      recipient_status: {},
    };
  });
};
