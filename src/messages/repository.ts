import { getDatabase } from '../db/database.js';

export interface MessageRecord {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  nonce: string | null;
  tts: number;
  timestamp: string;
  edited_timestamp: string | null;
}

export interface CreateMessageRecordInput {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  nonce: string | null;
  tts: boolean;
  timestamp: string;
}

export function insertMessage(input: CreateMessageRecordInput): MessageRecord {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO messages (id, channel_id, author_id, content, nonce, tts, timestamp, edited_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    input.id,
    input.channelId,
    input.authorId,
    input.content,
    input.nonce,
    input.tts ? 1 : 0,
    input.timestamp,
  );

  const created = findMessageById(input.channelId, input.id);
  if (!created) {
    throw new Error('Failed to load created message');
  }
  return created;
}

export function findMessageById(channelId: string, messageId: string): MessageRecord | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM messages WHERE channel_id = ? AND id = ?')
    .get(channelId, messageId);
  return (row as MessageRecord | undefined) ?? null;
}

export function listChannelMessages(
  channelId: string,
  limit: number,
  before?: string,
): MessageRecord[] {
  const db = getDatabase();
  if (before) {
    const rows = db
      .prepare(`
        SELECT * FROM messages
        WHERE channel_id = ? AND CAST(id AS INTEGER) < CAST(? AS INTEGER)
        ORDER BY CAST(id AS INTEGER) DESC
        LIMIT ?
      `)
      .all(channelId, before, limit);
    return rows as unknown as MessageRecord[];
  }

  const rows = db
    .prepare(`
      SELECT * FROM messages
      WHERE channel_id = ?
      ORDER BY CAST(id AS INTEGER) DESC
      LIMIT ?
    `)
    .all(channelId, limit);
  return rows as unknown as MessageRecord[];
}

export function updateMessageContent(
  channelId: string,
  messageId: string,
  content: string,
  editedTimestamp: string,
): MessageRecord | null {
  const db = getDatabase();
  db.prepare('UPDATE messages SET content = ?, edited_timestamp = ? WHERE channel_id = ? AND id = ?').run(
    content,
    editedTimestamp,
    channelId,
    messageId,
  );
  return findMessageById(channelId, messageId);
}

export function deleteMessageRecord(channelId: string, messageId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM messages WHERE channel_id = ? AND id = ?').run(channelId, messageId);
}
