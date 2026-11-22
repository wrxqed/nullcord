import { getDatabase } from '../db/database.js';

export interface ReactionRecord {
  message_id: string;
  channel_id: string;
  user_id: string;
  emoji_key: string;
  emoji_id: string | null;
  emoji_name: string;
  created_at: number;
}

export interface ParsedEmoji {
  key: string;
  id: string | null;
  name: string;
}

export function parseEmojiParam(rawEmoji: string): ParsedEmoji {
  const decoded = decodeURIComponent(rawEmoji).trim();
  const colonIndex = decoded.lastIndexOf(':');
  if (colonIndex > 0) {
    const name = decoded.slice(0, colonIndex);
    const id = decoded.slice(colonIndex + 1);
    if (/^\d+$/.test(id)) {
      return { key: `${name}:${id}`, id, name };
    }
  }
  return { key: decoded, id: null, name: decoded };
}

export function insertReaction(
  messageId: string,
  channelId: string,
  userId: string,
  emoji: ParsedEmoji,
): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT OR IGNORE INTO message_reactions (
        message_id, channel_id, user_id, emoji_key, emoji_id, emoji_name, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(messageId, channelId, userId, emoji.key, emoji.id, emoji.name, Date.now());
  return result.changes > 0;
}

export function deleteReaction(messageId: string, userId: string, emojiKey: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji_key = ?')
    .run(messageId, userId, emojiKey);
  return result.changes > 0;
}

export function listReactionsForMessages(messageIds: string[]): ReactionRecord[] {
  if (messageIds.length === 0) {
    return [];
  }
  const db = getDatabase();
  const placeholders = messageIds.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT * FROM message_reactions WHERE message_id IN (${placeholders}) ORDER BY created_at ASC`)
    .all(...messageIds);
  return rows as unknown as ReactionRecord[];
}

export function listReactionUserIds(
  channelId: string,
  messageId: string,
  emojiKey: string,
  limit: number,
): string[] {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT user_id FROM message_reactions
      WHERE channel_id = ? AND message_id = ? AND emoji_key = ?
      ORDER BY created_at ASC
      LIMIT ?
    `)
    .all(channelId, messageId, emojiKey, limit) as Array<{ user_id: string }>;
  return rows.map((row) => row.user_id);
}
