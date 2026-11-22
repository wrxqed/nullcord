import { randomUUID } from 'node:crypto';
import { constants, createDeflate, type Deflate } from 'node:zlib';
import type { WebSocket } from 'ws';
import { GatewayCloseCode, type GatewayCloseCodeValue } from './closeCodes.js';
import { GatewayOpcode } from './opcodes.js';
import type { GatewayPayload } from './types.js';

export class GatewaySession {
  public readonly sessionId: string;
  public readonly socket: WebSocket;
  public sequence = 0;
  public identified = false;
  public userId: string | null = null;
  public intents = 0;
  public status = 'online';
  public activities: unknown[] = [];

  private readonly heartbeatIntervalMs: number;
  private readonly useZlibStream: boolean;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private deflate: Deflate | null = null;
  private pendingChunks: Buffer[] = [];
  private sendQueue: Promise<void> = Promise.resolve();

  public constructor(socket: WebSocket, heartbeatIntervalMs: number, useZlibStream = false) {
    this.sessionId = randomUUID().replaceAll('-', '');
    this.socket = socket;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.useZlibStream = useZlibStream;

    if (useZlibStream) {
      const deflate = createDeflate();
      deflate.on('data', (chunk: Buffer) => {
        this.pendingChunks.push(chunk);
      });
      this.deflate = deflate;
    }
  }

  public start(): void {
    this.send({
      op: GatewayOpcode.HELLO,
      d: {
        heartbeat_interval: this.heartbeatIntervalMs,
      },
    });
    this.refreshHeartbeatDeadline();
  }

  public refreshHeartbeatDeadline(): void {
    this.clearHeartbeatTimer();
    const timeoutMs = Math.floor(this.heartbeatIntervalMs * 1.5);
    this.heartbeatTimer = setTimeout(() => {
      this.close(GatewayCloseCode.SESSION_TIMED_OUT, 'Session timed out');
    }, timeoutMs);
  }

  public send<T>(payload: GatewayPayload<T>): void {
    if (this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    const serialized = JSON.stringify(payload);
    if (!this.useZlibStream || !this.deflate) {
      this.socket.send(serialized);
      return;
    }

    this.sendQueue = this.sendQueue
      .then(() => this.sendCompressed(serialized))
      .catch(() => {
        this.cleanup();
      });
  }

  public dispatch<T>(eventName: string, data: T): void {
    this.sequence += 1;
    this.send({
      op: GatewayOpcode.DISPATCH,
      s: this.sequence,
      t: eventName,
      d: data,
    });
  }

  public close(code: GatewayCloseCodeValue | number, reason: string): void {
    this.cleanup();
    if (this.socket.readyState === this.socket.OPEN || this.socket.readyState === this.socket.CONNECTING) {
      this.socket.close(code, reason);
    }
  }

  public cleanup(): void {
    this.clearHeartbeatTimer();
    if (this.deflate !== null) {
      this.deflate.close();
      this.deflate = null;
    }
  }

  private async sendCompressed(serialized: string): Promise<void> {
    if (!this.deflate || this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    const deflate = this.deflate;
    this.pendingChunks = [];
    deflate.write(serialized, 'utf8');

    await new Promise<void>((resolve) => {
      deflate.flush(constants.Z_SYNC_FLUSH, () => resolve());
    });

    if (this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    const frame = Buffer.concat(this.pendingChunks);
    this.pendingChunks = [];
    this.socket.send(frame);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
