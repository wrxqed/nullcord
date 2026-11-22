import {
  buildAttachmentsByMessage,
  saveMessageAttachments,
  type AttachmentDto,
  type UploadedAttachmentRef,
} from '../attachments/attachmentService.js';
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
import { buildReactionsByMessage, type ReactionDto } from './reactionService.js';
import { incrementChannelUnread, upsertReadState } from './readStateRepository.js';
import {
  deleteMessageRecord,
  findMessageById,
  findMessagesByIds,
  insertMessage,
  listChannelMessages,
  updateMessageContent,
  type MessageQueryOptions,
  type MessageRecord,
} from './repository.js';

export interface MessageReferenceDto {
  message_id: string;
  channel_id: string;
}

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
  attachments: AttachmentDto[];
  embeds: unknown[];
  pinned: boolean;
  type: number;
  flags: number;
  nonce?: string;
  reactions?: ReactionDto[];
  message_reference?: MessageReferenceDto;
  referenced_message?: MessageDto | null;
}

const MESSAGE_TYPE_DEFAULT = 0;
const MESSAGE_TYPE_REPLY = 19;

function buildBaseMessageDto(
  record: MessageRecord,
  author: UserRecord,
  attachments: AttachmentDto[],
  reactions?: ReactionDto[],
): MessageDto {
  const isReply = record.referenced_message_id !== null;
  const dto: MessageDto = {
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
    attachments,
    embeds: [],
    pinned: false,
    type: isReply ? MESSAGE_TYPE_REPLY : MESSAGE_TYPE_DEFAULT,
    flags: 0,
  };

  if (record.nonce !== null) {
    dto.nonce = record.nonce;
  }

  if (reactions && reactions.length > 0) {
    dto.reactions = reactions;
  }

  if (record.referenced_message_id !== null) {
    dto.message_reference = {
      message_id: record.referenced_message_id,
      channel_id: record.channel_id,
    };
  }

  return dto;
}

function hydrateMessages(
  channelId: string,
  records: MessageRecord[],
  viewerId?: string,
): MessageDto[] {
  if (records.length === 0) {
    return [];
  }

  const refIds = [
    ...new Set(
      records
        .map((r) => r.referenced_message_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const refRecords = findMessagesByIds(channelId, refIds);
  const refMap = new Map(refRecords.map((r) => [r.id, r]));

  const allMessageIds = [...new Set([...records.map((r) => r.id), ...refRecords.map((r) => r.id)])];
  const attachmentsByMessage = buildAttachmentsByMessage(allMessageIds);
  const reactionsByMessage = buildReactionsByMessage(
    records.map((r) => r.id),
    viewerId,
  );

  const authorIds = new Set<string>();
  for (const record of records) {
    authorIds.add(record.author_id);
  }
  for (const ref of refRecords) {
    authorIds.add(ref.author_id);
  }

  const authors = findUsersByIds([...authorIds]);
  const authorMap = new Map(authors.map((u) => [u.id, u]));

  const dtos: MessageDto[] = [];
  for (const record of records) {
    const author = authorMap.get(record.author_id);
    if (!author) {
      continue;
    }

    const dto = buildBaseMessageDto(
      record,
      author,
      attachmentsByMessage.get(record.id) ?? [],
      reactionsByMessage.get(record.id),
    );

    if (record.referenced_message_id !== null) {
      const refRecord = refMap.get(record.referenced_message_id);
      const refAuthor = refRecord ? authorMap.get(refRecord.author_id) : undefined;
      dto.referenced_message =
        refRecord && refAuthor
          ? buildBaseMessageDto(
              refRecord,
              refAuthor,
              attachmentsByMessage.get(refRecord.id) ?? [],
            )
          : null;
    }

    dtos.push(dto);
  }

  return dtos;
}

function assertChannelAccess(channelId: string, userId: string): void {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }
}

export function getMessagesForChannel(
  channelId: string,
  userId: string,
  options: Omit<MessageQueryOptions, 'limit'> & { limit?: number },
): MessageDto[] {
  assertChannelAccess(channelId, userId);

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const records = listChannelMessages(channelId, {
    limit,
    before: options.before,
    after: options.after,
    around: options.around,
  });

  return hydrateMessages(channelId, records, userId);
}

export function sendMessageToChannel(
  channelId: string,
  author: UserRecord,
  content: string,
  nonce: string | null,
  tts: boolean,
  referencedMessageId: string | null,
  attachments: UploadedAttachmentRef[] = [],
): MessageDto {
  assertChannelAccess(channelId, author.id);

  const trimmed = content.trim();
  if ((trimmed.length === 0 && attachments.length === 0) || trimmed.length > 2000) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  if (referencedMessageId !== null && findMessageById(channelId, referencedMessageId) === null) {
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
    referencedMessageId,
    timestamp: new Date().toISOString(),
  });

  saveMessageAttachments(messageId, attachments);
  updateChannelLastMessageId(channelId, messageId);

  const dto = hydrateMessages(channelId, [record], author.id)[0];
  if (!dto) {
    throw new Error('Failed to serialize created message');
  }

  const recipientIds = getChannelRecipientIds(channelId);
  upsertReadState(author.id, channelId, messageId, 0);
  incrementChannelUnread(recipientIds, author.id, channelId);
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

  const dto = hydrateMessages(channelId, [updated], author.id)[0];
  if (!dto) {
    throw new Error('Failed to serialize updated message');
  }

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
