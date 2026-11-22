import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type RawData } from 'ws';
import { env } from '../config/env.js';
import { GatewayCloseCode } from './closeCodes.js';
import { handleHeartbeat } from './handlers/heartbeat.js';
import { handleIdentify } from './handlers/identify.js';
import { handlePresenceUpdate } from './handlers/presenceUpdate.js';
import { handleResume } from './handlers/resume.js';
import { GatewayOpcode } from './opcodes.js';
import { broadcastPresenceUpdate } from './presenceService.js';
import { GatewaySession } from './session.js';
import { unregisterSession } from './sessionRegistry.js';
import type { GatewayOpcodeHandler, GatewayPayload } from './types.js';

const handlers = new Map<number, GatewayOpcodeHandler>([
  [GatewayOpcode.HEARTBEAT, handleHeartbeat],
  [GatewayOpcode.IDENTIFY, handleIdentify],
  [GatewayOpcode.PRESENCE_UPDATE, handlePresenceUpdate],
  [GatewayOpcode.RESUME, handleResume],
]);

function handleDisconnect(session: GatewaySession): void {
  const userId = session.userId;
  unregisterSession(session);
  session.cleanup();
  if (userId) {
    broadcastPresenceUpdate(userId);
  }
}

function parsePayload(raw: RawData): GatewayPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || !('op' in parsed)) {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.op !== 'number') {
      return null;
    }
    return {
      op: candidate.op,
      d: candidate.d ?? null,
    };
  } catch {
    return null;
  }
}

export function attachGatewayServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket, request) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const useZlibStream = requestUrl.searchParams.get('compress') === 'zlib-stream';
    const session = new GatewaySession(socket, env.heartbeatIntervalMs, useZlibStream);
    session.start();

    socket.on('message', (raw) => {
      const payload = parsePayload(raw);
      if (payload === null) {
        session.close(GatewayCloseCode.DECODE_ERROR, 'Invalid JSON payload');
        return;
      }

      const handler = handlers.get(payload.op);
      if (!handler) {
        if (session.identified && payload.op >= 0) {
          return;
        }
        session.close(GatewayCloseCode.UNKNOWN_OPCODE, 'Unknown opcode');
        return;
      }

      handler(session, payload);
    });

    socket.on('close', () => {
      handleDisconnect(session);
    });

    socket.on('error', () => {
      handleDisconnect(session);
    });
  });

  return wss;
}
