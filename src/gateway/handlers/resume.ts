import { GatewayOpcode } from '../opcodes.js';
import type { GatewayOpcodeHandler } from '../types.js';

export const handleResume: GatewayOpcodeHandler = (session) => {
  session.send({
    op: GatewayOpcode.INVALID_SESSION,
    d: false,
  });
};
