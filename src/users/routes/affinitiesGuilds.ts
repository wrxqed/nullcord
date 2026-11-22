import type { FastifyPluginAsync } from 'fastify';

export const affinitiesGuildsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/users/@me/affinities/guilds', async () => {
    return {
      guild_affinities: [],
    };
  });
};
