import Fastify, { type FastifyInstance } from 'fastify';
import { registerApi } from './api/router.js';
import { getDatabase } from './db/database.js';
import { attachGatewayServer } from './gateway/server.js';

export async function createApp(): Promise<FastifyInstance> {
  getDatabase();

  const app = Fastify({
    logger: true,
  });

  await registerApi(app);
  attachGatewayServer(app.server);

  return app;
}
