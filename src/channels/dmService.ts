import { DiscordApiError } from '../common/errors.js';
import { generateSnowflake } from '../common/snowflake.js';
import { getDatabase } from '../db/database.js';
import { dispatchToUser } from '../gateway/sessionRegistry.js';
import { findUserById, findUsersByIds, type UserRecord } from '../users/userRepository.js';
import { serializePublicUser, type PublicUserDto } from '../users/userSerializer.js';

export interface ChannelRecord {
  id: string;
  guild_id: string | null;
  type: number;
  name: string | null;
  topic: string | null;
  position: number;
  parent_id: string | null;
  owner_id: string | null;
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
  name?: string | null;
  icon?: string | null;
  owner_id?: string;
}

const CHANNEL_TYPE_DM = 1;
const CHANNEL_TYPE_GROUP_DM = 3;

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

  const dto: DmChannelDto = {
    id: channel.id,
    type: channel.type,
    flags: 0,
    last_message_id: channel.last_message_id,
    recipients: otherRecipients,
    is_spam: false,
  };

  if (channel.type === CHANNEL_TYPE_GROUP_DM) {
    dto.name = channel.name;
    dto.icon = null;
    if (channel.owner_id) {
      dto.owner_id = channel.owner_id;
    }
  }

  return dto;
}

function broadcastChannelEvent(channel: ChannelRecord, eventName: string): void {
  const recipientIds = getChannelRecipientIds(channel.id);
  const recipients = findUsersByIds(recipientIds);
  for (const recipientId of recipientIds) {
    dispatchToUser(recipientId, eventName, buildDmChannelDto(channel, recipients, recipientId));
  }
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
      WHERE r.user_id = ? AND r.closed = 0 AND c.type IN (1, 3)
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

export function getOrCreateDmChannel(userId: string, rawRecipientIds: string[]): DmChannelDto {
  const uniqueTargets = [...new Set(rawRecipientIds)].filter((id) => id !== userId);
  if (uniqueTargets.length === 0) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  const allMemberIds = [userId, ...uniqueTargets];
  const users = findUsersByIds(allMemberIds);
  if (users.length < allMemberIds.length) {
    throw new DiscordApiError(404, 10013, 'Unknown User');
  }

  const db = getDatabase();
  if (uniqueTargets.length === 1) {
    const targetUserId = uniqueTargets[0]!;
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
  }

  const channelType = uniqueTargets.length === 1 ? CHANNEL_TYPE_DM : CHANNEL_TYPE_GROUP_DM;
  const channelId = generateSnowflake();
  const now = Date.now();
  const ownerId = channelType === CHANNEL_TYPE_GROUP_DM ? userId : null;

  db.prepare('INSERT INTO channels (id, type, owner_id, created_at) VALUES (?, ?, ?, ?)').run(
    channelId,
    channelType,
    ownerId,
    now,
  );

  const insertRecipient = db.prepare(
    'INSERT INTO channel_recipients (channel_id, user_id, closed) VALUES (?, ?, 0)',
  );
  for (const memberId of allMemberIds) {
    insertRecipient.run(channelId, memberId);
  }

  const created = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord;

  broadcastChannelEvent(created, 'CHANNEL_CREATE');
  return buildDmChannelDto(created, users, userId);
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

export function updateGroupDmChannel(
  channelId: string,
  userId: string,
  name: string | null,
): DmChannelDto {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const db = getDatabase();
  const channel = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord | undefined;

  if (!channel || channel.type !== CHANNEL_TYPE_GROUP_DM) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const normalizedName = name && name.trim().length > 0 ? name.trim().slice(0, 100) : null;
  db.prepare('UPDATE channels SET name = ? WHERE id = ?').run(normalizedName, channelId);

  const updated = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord;

  broadcastChannelEvent(updated, 'CHANNEL_UPDATE');
  const recipientIds = getChannelRecipientIds(channelId);
  return buildDmChannelDto(updated, findUsersByIds(recipientIds), userId);
}

export function addGroupDmRecipient(
  channelId: string,
  actorId: string,
  targetUserId: string,
): void {
  if (!isChannelRecipient(channelId, actorId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const db = getDatabase();
  const channel = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord | undefined;

  if (!channel || channel.type !== CHANNEL_TYPE_GROUP_DM) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  if (!findUserById(targetUserId)) {
    throw new DiscordApiError(404, 10013, 'Unknown User');
  }

  db.prepare(
    'INSERT OR IGNORE INTO channel_recipients (channel_id, user_id, closed) VALUES (?, ?, 0)',
  ).run(channelId, targetUserId);
  db.prepare('UPDATE channel_recipients SET closed = 0 WHERE channel_id = ? AND user_id = ?').run(
    channelId,
    targetUserId,
  );

  const recipientIds = getChannelRecipientIds(channelId);
  const recipients = findUsersByIds(recipientIds);
  for (const id of recipientIds) {
    const eventName = id === targetUserId ? 'CHANNEL_CREATE' : 'CHANNEL_UPDATE';
    dispatchToUser(id, eventName, buildDmChannelDto(channel, recipients, id));
  }
}

export function removeGroupDmRecipient(
  channelId: string,
  actorId: string,
  targetUserId: string,
): void {
  if (!isChannelRecipient(channelId, actorId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  const db = getDatabase();
  const channel = db
    .prepare('SELECT * FROM channels WHERE id = ?')
    .get(channelId) as unknown as ChannelRecord | undefined;

  if (!channel || channel.type !== CHANNEL_TYPE_GROUP_DM) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  if (channel.owner_id !== actorId && actorId !== targetUserId) {
    throw new DiscordApiError(403, 50013, 'Missing Permissions');
  }

  const previousRecipients = findUsersByIds(getChannelRecipientIds(channelId));
  db.prepare('DELETE FROM channel_recipients WHERE channel_id = ? AND user_id = ?').run(
    channelId,
    targetUserId,
  );

  dispatchToUser(
    targetUserId,
    'CHANNEL_DELETE',
    buildDmChannelDto(channel, previousRecipients, targetUserId),
  );

  broadcastChannelEvent(channel, 'CHANNEL_UPDATE');
}

export function closeDmChannelForUser(channelId: string, userId: string): DmChannelDto {
  const dto = getDmChannelForUser(channelId, userId);
  const db = getDatabase();

  if (dto.type === CHANNEL_TYPE_GROUP_DM) {
    removeGroupDmRecipient(channelId, userId, userId);
    return dto;
  }

  db.prepare('UPDATE channel_recipients SET closed = 1 WHERE channel_id = ? AND user_id = ?').run(
    channelId,
    userId,
  );
  dispatchToUser(userId, 'CHANNEL_DELETE', dto);
  return dto;
}
