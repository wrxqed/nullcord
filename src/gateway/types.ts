import type { GatewaySession } from './session.js';
import type { GatewayOpcodeValue } from './opcodes.js';

export interface GatewayPayload<T = unknown> {
  op: GatewayOpcodeValue | number;
  d: T;
  s?: number | null;
  t?: string | null;
}

export type GatewayOpcodeHandler = (session: GatewaySession, payload: GatewayPayload) => void;
