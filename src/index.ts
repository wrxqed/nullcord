import { createApp } from './app.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  const app = await createApp();
  await app.listen({
    port: env.port,
    host: env.host,
  });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
