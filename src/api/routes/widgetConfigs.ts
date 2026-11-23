import type { FastifyPluginAsync } from 'fastify';

export const widgetConfigsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/widget-configs/featured', async () => {
    return {
      widgets: [],
    };
  });
};
