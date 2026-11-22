export interface BufferedGatewayEvent {
  s: number;
  t: string;
  d: unknown;
}

export interface ResumableSessionState {
  sessionId: string;
  userId: string;
  intents: number;
  status: string;
  activities: unknown[];
  sequence: number;
  events: BufferedGatewayEvent[];
  updatedAt: number;
}

const MAX_BUFFERED_EVENTS = 200;
const SESSION_TTL_MS = 15 * 60 * 1000;

const sessions = new Map<string, ResumableSessionState>();

function pruneExpired(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, state] of sessions.entries()) {
    if (state.updatedAt < cutoff) {
      sessions.delete(id);
    }
  }
}

export function initResumableSession(
  sessionId: string,
  userId: string,
  intents: number,
  status: string,
  activities: unknown[],
): void {
  pruneExpired();
  sessions.set(sessionId, {
    sessionId,
    userId,
    intents,
    status,
    activities,
    sequence: 0,
    events: [],
    updatedAt: Date.now(),
  });
}

export function recordSessionEvent(
  sessionId: string,
  sequence: number,
  eventName: string,
  data: unknown,
): void {
  const state = sessions.get(sessionId);
  if (!state) {
    return;
  }

  state.sequence = sequence;
  state.updatedAt = Date.now();
  state.events.push({ s: sequence, t: eventName, d: data });
  if (state.events.length > MAX_BUFFERED_EVENTS) {
    state.events.shift();
  }
}

export function getResumableSession(sessionId: string): ResumableSessionState | null {
  pruneExpired();
  return sessions.get(sessionId) ?? null;
}

export function moveResumableSession(oldSessionId: string, newSessionId: string): void {
  const existing = sessions.get(oldSessionId);
  if (!existing) {
    return;
  }
  sessions.delete(oldSessionId);
  existing.sessionId = newSessionId;
  existing.updatedAt = Date.now();
  sessions.set(newSessionId, existing);
}
