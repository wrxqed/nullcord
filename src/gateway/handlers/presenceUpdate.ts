import { GatewayCloseCode } from '../closeCodes.js';
import { broadcastPresenceUpdate, setSessionPresence } from '../presenceService.js';
import type { GatewayOpcodeHandler } from '../types.js';

interface PresenceUpdateData {
  status?: unknown;
  activities?: unknown;
}

export const handlePresenceUpdate: GatewayOpcodeHandler = (session, payload) => {
  if (!session.identified || !session.userId) {
    session.close(GatewayCloseCode.NOT_AUTHENTICATED, 'Not authenticated');
    return;
  }

  const data = payload.d as PresenceUpdateData | null;
  setSessionPresence(session, data?.status, data?.activities);
  broadcastPresenceUpdate(session.userId);
};
