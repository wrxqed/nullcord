import { verifyToken } from '../../auth/token.js';
import { listUserDmChannels } from '../../channels/dmService.js';
import { env } from '../../config/env.js';
import { listReadStateEntries } from '../../messages/readStateRepository.js';
import { getUserRelationships } from '../../relationships/service.js';
import { findUserById, type UserRecord } from '../../users/userRepository.js';
import { serializePublicUser, serializeSelfUser } from '../../users/userSerializer.js';
import { GatewayCloseCode } from '../closeCodes.js';
import {
  broadcastPresenceUpdate,
  getFriendsPresences,
  setSessionPresence,
} from '../presenceService.js';
import { initResumableSession } from '../resumeStore.js';
import { registerUserSession } from '../sessionRegistry.js';
import type { GatewayOpcodeHandler } from '../types.js';

interface IdentifyData {
  token?: unknown;
  intents?: unknown;
  presence?: {
    status?: unknown;
    activities?: unknown;
  };
}

export const handleIdentify: GatewayOpcodeHandler = (session, payload) => {
  if (session.identified) {
    session.close(GatewayCloseCode.ALREADY_AUTHENTICATED, 'Already authenticated');
    return;
  }

  const data = payload.d as IdentifyData | null;
  if (!data || typeof data.token !== 'string' || data.token.trim().length === 0) {
    session.close(GatewayCloseCode.AUTHENTICATION_FAILED, 'Authentication failed');
    return;
  }

  const userId = verifyToken(data.token.trim());
  if (userId === null) {
    session.close(GatewayCloseCode.AUTHENTICATION_FAILED, 'Authentication failed');
    return;
  }

  const user = findUserById(userId);
  if (user === null) {
    session.close(GatewayCloseCode.AUTHENTICATION_FAILED, 'Authentication failed');
    return;
  }

  const intents = typeof data.intents === 'number' ? data.intents : 0;

  session.identified = true;
  session.userId = user.id;
  session.intents = intents;
  setSessionPresence(session, data.presence?.status, data.presence?.activities);
  initResumableSession(session.sessionId, user.id, intents, session.status, session.activities);
  registerUserSession(user.id, session);

  const relData = getUserRelationships(user.id);
  const dmData = listUserDmChannels(user.id);
  const readStates = listReadStateEntries(user.id);
  const friendPresences = getFriendsPresences(user.id);

  const relatedUsersMap = new Map<string, UserRecord>();
  for (const related of relData.users) {
    relatedUsersMap.set(related.id, related);
  }
  for (const dmUser of dmData.users) {
    relatedUsersMap.set(dmUser.id, dmUser);
  }

  session.dispatch('READY', {
    v: 9,
    user: serializeSelfUser(user),
    user_settings: {
      locale: user.locale,
      theme: user.theme,
    },
    guilds: [],
    relationships: relData.relationships,
    read_state: {
      entries: readStates,
      partial: false,
      version: 0,
    },
    user_guild_settings: {
      entries: [],
      partial: false,
      version: 0,
    },
    private_channels: dmData.channels,
    presences: friendPresences,
    users: [...relatedUsersMap.values()].map(serializePublicUser),
    merged_members: [],
    sessions: [],
    session_id: session.sessionId,
    resume_gateway_url: env.gatewayUrl,
    country_code: 'US',
    consents: {
      personalization: {
        consented: false,
      },
    },
    experiments: [],
    guild_join_requests: [],
    connected_accounts: [],
    guild_experiments: [],
    geo_ordered_rtc_regions: [],
    api_code_version: 1,
    friend_suggestion_count: 0,
    analytics_token: '',
    tutorial: {
      indicators_suppressed: true,
      indicators_confirmed: [],
    },
    session_type: 'normal',
    notification_settings: {
      flags: 0,
    },
    game_relationships: [],
    application: {
      id: user.id,
      flags: 0,
    },
  });

  broadcastPresenceUpdate(user.id);
};
