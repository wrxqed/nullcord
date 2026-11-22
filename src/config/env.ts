import 'dotenv/config';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const publicHost = process.env.PUBLIC_HOST ?? `${host}:${port}`;
const gatewayUrl = process.env.GATEWAY_URL ?? `ws://${publicHost}`;
const heartbeatIntervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 41250);
const dbPath = process.env.DB_PATH ?? 'data/nullcord.db';
const tokenSecret = process.env.TOKEN_SECRET ?? 'nullcord-dev-secret-change-in-production';

export const env = {
  port,
  host,
  publicHost,
  gatewayUrl,
  heartbeatIntervalMs,
  dbPath,
  tokenSecret,
} as const;
