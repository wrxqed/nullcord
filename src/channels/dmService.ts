import { DiscordApiError } from '../common/errors.js';
import { generateSnowflake } from '../common/snowflake.js';
import { getDatabase } from '../db/database.js';
import { dispatchToUser } from '../gateway/sessionRegistry.js';
import { findUsersByIds, type UserRecord } from '../users/userRepository.js';
import { serializePublicUser, type PublicUserDto } from '../users/userSerializer.js';

export interface ChannelRecord {
  id: string;
  guild_id: string | null;
  type: number;
  name: string | null;
  topic: string | null;
  position: number;
  parent_id: string | null;
  last_message_id: string | null;
  created_at: number;
}

export interface DmChannelDto {
  id: string;
  type: number;
  flags: number;
  last_message_id: string | null;
  recipients: PublicUserDto[];
  is_spam: boolean;
}

function findExistingDirectDm(userId: string, targetUserId: string): ChannelRecord | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT c.*
      FROM channels c
      JOIN channel_recipients r1 ON r1.channel_id = c.id AND r1.user_id = ?
      JOIN channel_recipients r2 ON r2.channel_id = c.id AND r2.user_id = ?
      WHERE c.type = 1
        AND (SELECT COUNT(*) FROM channel_recipients cr WHERE cr.channel_id = c.id) = 2
      LIMIT 1
    `)
    .get(userId, targetUserId);
  return (row as ChannelRecord | undefined) ?? null;
}

export function getChannelRecipientIds(channelId: string): string[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT user_id FROM channel_recipients WHERE channel_id = ?')
    .all(channelId) as Array<{ user_id: string }>;
  return rows.map((row) => row.user_id);
}

export function isChannelRecipient(channelId: string, userId: string): boolean {
  const db = getDatabase();
  const row = db
    .prepare('SELECT 1 FROM channel_recipients WHERE channel_id = ? AND user_id = ?')
    .get(channelId, userId);
  return row !== undefined;
}

export function updateChannelLastMessageId(channelId: string, messageId: string): void {
  const db = getDatabase();
  db.prepare('UPDATE channels SET last_message_id = ? WHERE id = ?').run(messageId, channelId);
}

function buildDmChannelDto(
  channel: ChannelRecord,
  recipients: UserRecord[],
  currentUserId: string,
): DmChannelDto {
  const otherRecipients = recipients
    .filter((recipient) => recipient.id !== currentUserId)
    .map(serializePublicUser);

  return {
    id: channel.id,
    type: channel.type,
    flags: 0,
    last_message_id: channel.last_message_id,
    recipients: otherRecipients,
    is_spam: false,
  };
}

export function listUserDmChannels(userId: string): {
  channels: DmChannelDto[];
  users: UserRecord[];
} {
  const db = getDatabase();
  const channels = db
    .prepare(`
      SELECT c.*
      FROM channels c
      JOIN channel_recipients r ON r.channel_id = c.id
      WHERE r.user_id = ? AND r.closed = 0 AND c.type = 1
      ORDER BY COALESCE(c.last_message_id, c.id) DESC
    `)
    .all(userId) as unknown as ChannelRecord[];

  if (channels.length === 0) {
    return { channels: [], users: [] };
  }

  const allUserIds = new Set<string>();
  const recipientsByChannel = new Map<string, string[]>();

  for (const channel of channels) {
    const ids = getChannelRecipientIds(channel.id);
    recipientsByChannel.set(channel.id, ids);
    for (const id of ids) {
      if (id !== userId) {
        allUserIds.add(id);
      }
    }
  }

  const loadedUsers = findUsersByIds([...allUserIds]);
  const userMap = new Map(loadedUsers.map((u) => [u.id, u]));

  const dtos: DmChannelDto[] = channels.map((channel) => {
    const ids = recipientsByChannel.get(channel.id) ?? [];
    const recipientUsers = ids
      .map((id) => userMap.get(id))
      .filter((u): u is UserRecord => u !== undefined);
    return buildDmChannelDto(channel, recipientUsers, userId);
  });

  return { channels: dtos, users: loadedUsers };
}

export function getOrCreateDmChannel(userId: string, targetUserId: string): DmChannelDto {
  if (userId === targetUserId) {
    throw new DiscordApiError(400, 50035, 'Cannot open a DM with yourself.');
  }

  const users = findUsersByIds([userId, targetUserId]);
  if (users.length < 2) {
    throw new DiscordApiError(404, 10013, 'Unknown User');
  }

  const db = getDatabase();
  const existing = findExistingDirectDm(userId, targetUserId);
  if (existing) {
    db.prepare('UPDATE channel_recipients SET closed = 0 WHERE channel_id = ? AND user_id = ?').run(
      existing.id,
      userId,
    );
    const dto = buildDmChannelDto(existing, users, userId);
    dispatchToUser(userId, 'CHANNEL_CREATE', dto);
    return dto;
  }

  const channelId = generateSnowflake();
  const now = Date.now();
  db.prepare('INSERT INTO channels (id, type, created_at) VALUES (?, 1, ?)').run(channelId, now);
  db.prepare('INSERT INTO channel_recipients (channel_id, user_id, closed) VALUES (?, ?, 0)').run(
    channelId,
    userId,
  );
  db.prepare('INSERT INTO channel_recipients (channel_id, user_id, closed) VALUES (?, ?, 0)').run(
    channelId,
    targetUserId,
  );

  const created = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord;

  const senderDto = buildDmChannelDto(created, users, userId);
  const targetDto = buildDmChannelDto(created, users, targetUserId);

  dispatchToUser(userId, 'CHANNEL_CREATE', senderDto);
  dispatchToUser(targetUserId, 'CHANNEL_CREATE', targetDto);

  return senderDto;
}

export function getDmChannelForUser(channelId: string, userId: string): DmChannelDto {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const db = getDatabase();
  const channel = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord | undefined;

  if (!channel) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const recipientIds = getChannelRecipientIds(channelId);
  const recipients = findUsersByIds(recipientIds);
  return buildDmChannelDto(channel, recipients, userId);
}

export function closeDmChannelForUser(channelId: string, userId: string): DmChannelDto {
  const dto = getDmChannelForUser(channelId, userId);
  const db = getDatabase();
  db.prepare('UPDATE channel_recipients SET closed = 1 WHERE channel_id = ? AND user_id = ?').run(
    channelId,
    userId,
  );
  dispatchToUser(userId, 'CHANNEL_DELETE', dto);
  return dto;
}
