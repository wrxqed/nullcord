import { getDatabase } from '../db/database.js';

export interface ReadStateRecord {
  user_id: string;
  channel_id: string;
  last_message_id: string;
  mention_count: number;
}

export interface ReadStateEntryDto {
  id: string;
  last_message_id: string;
  mention_count: number;
}

export function upsertReadState(
  userId: string,
  channelId: string,
  lastMessageId: string,
  mentionCount = 0,
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO read_states (user_id, channel_id, last_message_id, mention_count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, channel_id) DO UPDATE SET
      last_message_id = excluded.last_message_id,
      mention_count = excluded.mention_count
  `).run(userId, channelId, lastMessageId, mentionCount);
}

export function incrementChannelUnread(recipientIds: string[], senderId: string, channelId: string): void {
  const db = getDatabase();
  const statement = db.prepare(`
    INSERT INTO read_states (user_id, channel_id, last_message_id, mention_count)
    VALUES (?, ?, '0', 1)
    ON CONFLICT(user_id, channel_id) DO UPDATE SET
      mention_count = read_states.mention_count + 1
  `);

  for (const recipientId of recipientIds) {
    if (recipientId !== senderId) {
      statement.run(recipientId, channelId);
    }
  }
}

export function listReadStateEntries(userId: string): ReadStateEntryDto[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT channel_id, last_message_id, mention_count FROM read_states WHERE user_id = ?')
    .all(userId) as Array<{
      channel_id: string;
      last_message_id: string;
      mention_count: number;
    }>;

  return rows.map((row) => ({
    id: row.channel_id,
    last_message_id: row.last_message_id,
    mention_count: row.mention_count,
  }));
}
