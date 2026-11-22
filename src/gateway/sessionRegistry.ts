import type { GatewaySession } from './session.js';

const sessionsByUser = new Map<string, Set<GatewaySession>>();

export function registerUserSession(userId: string, session: GatewaySession): void {
  let set = sessionsByUser.get(userId);
  if (!set) {
    set = new Set<GatewaySession>();
    sessionsByUser.set(userId, set);
  }
  set.add(session);
}

export function unregisterSession(session: GatewaySession): void {
  if (!session.userId) {
    return;
  }

  const set = sessionsByUser.get(session.userId);
  if (!set) {
    return;
  }

  set.delete(session);
  if (set.size === 0) {
    sessionsByUser.delete(session.userId);
  }
}

export function dispatchToUser<T>(userId: string, eventName: string, data: T): void {
  const set = sessionsByUser.get(userId);
  if (!set) {
    return;
  }
  for (const session of set) {
    session.dispatch(eventName, data);
  }
}

export function dispatchToUsers<T>(userIds: string[], eventName: string, data: T): void {
  for (const userId of userIds) {
    dispatchToUser(userId, eventName, data);
  }
}
