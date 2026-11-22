import { getDatabase } from '../db/database.js';

export interface MessageRecord {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  nonce: string | null;
  tts: number;
  referenced_message_id: string | null;
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
  referencedMessageId: string | null;
  timestamp: string;
}

export interface MessageQueryOptions {
  limit: number;
  before?: string;
  after?: string;
  around?: string;
}

export function insertMessage(input: CreateMessageRecordInput): MessageRecord {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO messages (
      id,
      channel_id,
      author_id,
      content,
      nonce,
      tts,
      referenced_message_id,
      timestamp,
      edited_timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    input.id,
    input.channelId,
    input.authorId,
    input.content,
    input.nonce,
    input.tts ? 1 : 0,
    input.referencedMessageId,
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

export function findMessagesByIds(channelId: string, messageIds: string[]): MessageRecord[] {
  if (messageIds.length === 0) {
    return [];
  }
  const db = getDatabase();
  const placeholders = messageIds.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT * FROM messages WHERE channel_id = ? AND id IN (${placeholders})`)
    .all(channelId, ...messageIds);
  return rows as unknown as MessageRecord[];
}

export function listChannelMessages(
  channelId: string,
  options: MessageQueryOptions,
): MessageRecord[] {
  const db = getDatabase();

  if (options.around) {
    const half = Math.max(Math.floor(options.limit / 2), 1);
    const newer = db
      .prepare(`
        SELECT * FROM messages
        WHERE channel_id = ? AND CAST(id AS INTEGER) > CAST(? AS INTEGER)
        ORDER BY CAST(id AS INTEGER) ASC
        LIMIT ?
      `)
      .all(channelId, options.around, half) as unknown as MessageRecord[];

    const olderAndTarget = db
      .prepare(`
        SELECT * FROM messages
        WHERE channel_id = ? AND CAST(id AS INTEGER) <= CAST(? AS INTEGER)
        ORDER BY CAST(id AS INTEGER) DESC
        LIMIT ?
      `)
      .all(channelId, options.around, options.limit - newer.length) as unknown as MessageRecord[];

    return [...newer.reverse(), ...olderAndTarget];
  }

  if (options.after) {
    const rows = db
      .prepare(`
        SELECT * FROM messages
        WHERE channel_id = ? AND CAST(id AS INTEGER) > CAST(? AS INTEGER)
        ORDER BY CAST(id AS INTEGER) ASC
        LIMIT ?
      `)
      .all(channelId, options.after, options.limit) as unknown as MessageRecord[];
    return rows.reverse();
  }

  if (options.before) {
    const rows = db
      .prepare(`
        SELECT * FROM messages
        WHERE channel_id = ? AND CAST(id AS INTEGER) < CAST(? AS INTEGER)
        ORDER BY CAST(id AS INTEGER) DESC
        LIMIT ?
      `)
      .all(channelId, options.before, options.limit);
    return rows as unknown as MessageRecord[];
  }

  const rows = db
    .prepare(`
      SELECT * FROM messages
      WHERE channel_id = ?
      ORDER BY CAST(id AS INTEGER) DESC
      LIMIT ?
    `)
    .all(channelId, options.limit);
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
