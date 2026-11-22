import type { FastifyPluginAsync } from 'fastify';

export const locationMetadataRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/auth/location-metadata', async () => {
    return {
      consent_required: false,
      country_code: 'US',
      promotional_email_opt_in: {
        required: false,
        pre_checked: false,
      },
    };
  });
};
