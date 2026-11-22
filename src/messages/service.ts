import {
  getChannelRecipientIds,
  isChannelRecipient,
  updateChannelLastMessageId,
} from '../channels/dmService.js';
import { DiscordApiError } from '../common/errors.js';
import { generateSnowflake } from '../common/snowflake.js';
import { dispatchToUsers } from '../gateway/sessionRegistry.js';
import { findUsersByIds, type UserRecord } from '../users/userRepository.js';
import { serializePublicUser, type PublicUserDto } from '../users/userSerializer.js';
import {
  deleteMessageRecord,
  findMessageById,
  insertMessage,
  listChannelMessages,
  updateMessageContent,
  type MessageRecord,
} from './repository.js';

export interface MessageDto {
  id: string;
  channel_id: string;
  author: PublicUserDto;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: PublicUserDto[];
  mention_roles: string[];
  attachments: unknown[];
  embeds: unknown[];
  pinned: boolean;
  type: number;
  flags: number;
  nonce?: string;
}

function serializeMessage(record: MessageRecord, author: UserRecord): MessageDto {
  const base: MessageDto = {
    id: record.id,
    channel_id: record.channel_id,
    author: serializePublicUser(author),
    content: record.content,
    timestamp: record.timestamp,
    edited_timestamp: record.edited_timestamp,
    tts: Boolean(record.tts),
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
    flags: 0,
  };

  if (record.nonce !== null) {
    base.nonce = record.nonce;
  }

  return base;
}

function assertChannelAccess(channelId: string, userId: string): void {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }
}

export function getMessagesForChannel(
  channelId: string,
  userId: string,
  rawLimit?: number,
  before?: string,
): MessageDto[] {
  assertChannelAccess(channelId, userId);

  const limit = Math.min(Math.max(rawLimit ?? 50, 1), 100);
  const records = listChannelMessages(channelId, limit, before);
  if (records.length === 0) {
    return [];
  }

  const authorIds = [...new Set(records.map((r) => r.author_id))];
  const authors = findUsersByIds(authorIds);
  const authorMap = new Map(authors.map((u) => [u.id, u]));

  const dtos: MessageDto[] = [];
  for (const record of records) {
    const author = authorMap.get(record.author_id);
    if (!author) {
      continue;
    }
    dtos.push(serializeMessage(record, author));
  }
  return dtos;
}

export function sendMessageToChannel(
  channelId: string,
  author: UserRecord,
  content: string,
  nonce: string | null,
  tts: boolean,
): MessageDto {
  assertChannelAccess(channelId, author.id);

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  const messageId = generateSnowflake();
  const record = insertMessage({
    id: messageId,
    channelId,
    authorId: author.id,
    content: trimmed,
    nonce,
    tts,
    timestamp: new Date().toISOString(),
  });

  updateChannelLastMessageId(channelId, messageId);

  const dto = serializeMessage(record, author);
  const recipientIds = getChannelRecipientIds(channelId);
  dispatchToUsers(recipientIds, 'MESSAGE_CREATE', dto);

  return dto;
}

export function editChannelMessage(
  channelId: string,
  messageId: string,
  author: UserRecord,
  content: string,
): MessageDto {
  assertChannelAccess(channelId, author.id);

  const existing = findMessageById(channelId, messageId);
  if (!existing) {
    throw new DiscordApiError(404, 10008, 'Unknown Message');
  }

  if (existing.author_id !== author.id) {
    throw new DiscordApiError(403, 50005, 'Cannot edit a message authored by another user');
  }

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  const updated = updateMessageContent(channelId, messageId, trimmed, new Date().toISOString());
  if (!updated) {
    throw new DiscordApiError(404, 10008, 'Unknown Message');
  }

  const dto = serializeMessage(updated, author);
  const recipientIds = getChannelRecipientIds(channelId);
  dispatchToUsers(recipientIds, 'MESSAGE_UPDATE', dto);

  return dto;
}

export function deleteChannelMessage(
  channelId: string,
  messageId: string,
  author: UserRecord,
): void {
  assertChannelAccess(channelId, author.id);

  const existing = findMessageById(channelId, messageId);
  if (!existing) {
    throw new DiscordApiError(404, 10008, 'Unknown Message');
  }

  if (existing.author_id !== author.id) {
    throw new DiscordApiError(403, 50013, 'Missing Permissions');
  }

  deleteMessageRecord(channelId, messageId);
  const recipientIds = getChannelRecipientIds(channelId);
  dispatchToUsers(recipientIds, 'MESSAGE_DELETE', {
    id: messageId,
    channel_id: channelId,
  });
}
