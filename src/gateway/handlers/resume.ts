import { verifyToken } from '../../auth/token.js';
import { findUserById } from '../../users/userRepository.js';
import { GatewayCloseCode } from '../closeCodes.js';
import { GatewayOpcode } from '../opcodes.js';
import { broadcastPresenceUpdate } from '../presenceService.js';
import { getResumableSession, moveResumableSession } from '../resumeStore.js';
import { registerUserSession } from '../sessionRegistry.js';
import type { GatewayOpcodeHandler } from '../types.js';

interface ResumeData {
  token?: unknown;
  session_id?: unknown;
  seq?: unknown;
}

export const handleResume: GatewayOpcodeHandler = (session, payload) => {
  if (session.identified) {
    session.close(GatewayCloseCode.ALREADY_AUTHENTICATED, 'Already authenticated');
    return;
  }

  const data = payload.d as ResumeData | null;
  if (
    !data ||
    typeof data.token !== 'string' ||
    typeof data.session_id !== 'string' ||
    typeof data.seq !== 'number'
  ) {
    session.send({
      op: GatewayOpcode.INVALID_SESSION,
      d: false,
    });
    return;
  }

  const userId = verifyToken(data.token.trim());
  if (userId === null || findUserById(userId) === null) {
    session.close(GatewayCloseCode.AUTHENTICATION_FAILED, 'Authentication failed');
    return;
  }

  const saved = getResumableSession(data.session_id);
  if (!saved || saved.userId !== userId) {
    session.send({
      op: GatewayOpcode.INVALID_SESSION,
      d: false,
    });
    return;
  }

  moveResumableSession(saved.sessionId, session.sessionId);
  session.identified = true;
  session.userId = userId;
  session.intents = saved.intents;
  session.status = saved.status;
  session.activities = saved.activities;
  session.sequence = saved.sequence;

  registerUserSession(userId, session);

  for (const event of saved.events) {
    if (event.s > data.seq) {
      session.send({
        op: GatewayOpcode.DISPATCH,
        s: event.s,
        t: event.t,
        d: event.d,
      });
    }
  }

  session.dispatch('RESUMED', {});
  broadcastPresenceUpdate(userId);
};
