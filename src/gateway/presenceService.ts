import { listFriendIds } from '../relationships/repository.js';
import { findUserById, findUsersByIds } from '../users/userRepository.js';
import { serializePublicUser, type PublicUserDto } from '../users/userSerializer.js';
import type { GatewaySession } from './session.js';
import { dispatchToUser, dispatchToUsers, getUserSessions } from './sessionRegistry.js';

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';

export interface PresenceDto {
  user: PublicUserDto | { id: string };
  status: PresenceStatus;
  activities: unknown[];
  client_status: {
    web?: string;
  };
}

const VALID_INPUT_STATUSES = new Set(['online', 'idle', 'dnd', 'invisible']);

const STATUS_PRIORITY: Record<string, number> = {
  online: 4,
  idle: 3,
  dnd: 2,
  invisible: 1,
};

export function normalizePresenceStatus(raw: unknown): PresenceStatus {
  if (typeof raw === 'string' && VALID_INPUT_STATUSES.has(raw)) {
    return raw as PresenceStatus;
  }
  return 'online';
}

export function setSessionPresence(
  session: GatewaySession,
  status: unknown,
  activities: unknown,
): void {
  session.status = normalizePresenceStatus(status);
  session.activities = Array.isArray(activities) ? activities : [];
}

function resolveAggregatePresence(userId: string): {
  ownStatus: PresenceStatus;
  publicStatus: PresenceStatus;
  activities: unknown[];
} {
  const sessions = getUserSessions(userId);
  if (sessions.length === 0) {
    return {
      ownStatus: 'offline',
      publicStatus: 'offline',
      activities: [],
    };
  }

  let bestSession = sessions[0];
  let bestPriority = bestSession ? (STATUS_PRIORITY[bestSession.status] ?? 0) : 0;

  for (const session of sessions) {
    const priority = STATUS_PRIORITY[session.status] ?? 0;
    if (priority > bestPriority) {
      bestSession = session;
      bestPriority = priority;
    }
  }

  const ownStatus = (bestSession?.status ?? 'online') as PresenceStatus;
  const publicStatus: PresenceStatus = ownStatus === 'invisible' ? 'offline' : ownStatus;
  const activities = ownStatus === 'invisible' ? [] : (bestSession?.activities ?? []);

  return {
    ownStatus,
    publicStatus,
    activities,
  };
}

function buildPresenceDto(
  userId: string,
  status: PresenceStatus,
  activities: unknown[],
  publicUser?: PublicUserDto,
): PresenceDto {
  return {
    user: publicUser ?? { id: userId },
    status,
    activities: status === 'offline' ? [] : activities,
    client_status: status === 'offline' || status === 'invisible' ? {} : { web: status },
  };
}

export function getFriendsPresences(userId: string): PresenceDto[] {
  const friendIds = listFriendIds(userId);
  const friends = findUsersByIds(friendIds);
  const friendMap = new Map(friends.map((u) => [u.id, serializePublicUser(u)]));
  const presences: PresenceDto[] = [];

  for (const friendId of friendIds) {
    const resolved = resolveAggregatePresence(friendId);
    if (resolved.publicStatus === 'offline') {
      continue;
    }
    presences.push(
      buildPresenceDto(friendId, resolved.publicStatus, resolved.activities, friendMap.get(friendId)),
    );
  }

  return presences;
}

export function broadcastPresenceUpdate(userId: string): void {
  const resolved = resolveAggregatePresence(userId);
  const friendIds = listFriendIds(userId);
  const userRecord = findUserById(userId);
  const publicUser = userRecord ? serializePublicUser(userRecord) : undefined;

  if (friendIds.length > 0) {
    const publicDto = buildPresenceDto(
      userId,
      resolved.publicStatus,
      resolved.activities,
      publicUser,
    );
    dispatchToUsers(friendIds, 'PRESENCE_UPDATE', publicDto);
  }

  if (resolved.ownStatus !== 'offline') {
    const ownDto = buildPresenceDto(userId, resolved.ownStatus, resolved.activities, publicUser);
    dispatchToUser(userId, 'PRESENCE_UPDATE', ownDto);
  }
}
