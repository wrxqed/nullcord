import { GatewayOpcode } from '../opcodes.js';
import type { GatewayOpcodeHandler } from '../types.js';

export const handleHeartbeat: GatewayOpcodeHandler = (session) => {
  session.refreshHeartbeatDeadline();
  session.send({
    op: GatewayOpcode.HEARTBEAT_ACK,
    d: null,
  });
};
