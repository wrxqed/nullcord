import { getChannelRecipientIds, isChannelRecipient } from '../channels/dmService.js';
import { DiscordApiError } from '../common/errors.js';
import { dispatchToUsers } from '../gateway/sessionRegistry.js';
import { findUsersByIds } from '../users/userRepository.js';
import { serializePublicUser, type PublicUserDto } from '../users/userSerializer.js';
import {
  deleteReaction,
  insertReaction,
  listReactionUserIds,
  listReactionsForMessages,
  parseEmojiParam,
} from './reactionRepository.js';
import { findMessageById } from './repository.js';

export interface ReactionDto {
  count: number;
  count_details: {
    burst: number;
    normal: number;
  };
  me: boolean;
  me_burst: boolean;
  burst_colors: string[];
  emoji: {
    id: string | null;
    name: string;
  };
}

function assertMessageAccess(channelId: string, messageId: string, userId: string): void {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }
  if (!findMessageById(channelId, messageId)) {
    throw new DiscordApiError(404, 10008, 'Unknown Message');
  }
}

export function addMessageReaction(
  channelId: string,
  messageId: string,
  userId: string,
  rawEmoji: string,
): void {
  assertMessageAccess(channelId, messageId, userId);
  const emoji = parseEmojiParam(rawEmoji);
  if (emoji.name.length === 0) {
    throw new DiscordApiError(400, 10014, 'Unknown Emoji');
  }

  const inserted = insertReaction(messageId, channelId, userId, emoji);
  if (!inserted) {
    return;
  }

  const recipientIds = getChannelRecipientIds(channelId);
  dispatchToUsers(recipientIds, 'MESSAGE_REACTION_ADD', {
    user_id: userId,
    channel_id: channelId,
    message_id: messageId,
    emoji: {
      id: emoji.id,
      name: emoji.name,
    },
    type: 0,
    burst: false,
  });
}

export function removeMessageReaction(
  channelId: string,
  messageId: string,
  userId: string,
  rawEmoji: string,
): void {
  assertMessageAccess(channelId, messageId, userId);
  const emoji = parseEmojiParam(rawEmoji);

  const removed = deleteReaction(messageId, userId, emoji.key);
  if (!removed) {
    return;
  }

  const recipientIds = getChannelRecipientIds(channelId);
  dispatchToUsers(recipientIds, 'MESSAGE_REACTION_REMOVE', {
    user_id: userId,
    channel_id: channelId,
    message_id: messageId,
    emoji: {
      id: emoji.id,
      name: emoji.name,
    },
    type: 0,
    burst: false,
  });
}

export function getMessageReactionUsers(
  channelId: string,
  messageId: string,
  userId: string,
  rawEmoji: string,
  rawLimit?: number,
): PublicUserDto[] {
  assertMessageAccess(channelId, messageId, userId);
  const emoji = parseEmojiParam(rawEmoji);
  const limit = Math.min(Math.max(rawLimit ?? 25, 1), 100);
  const userIds = listReactionUserIds(channelId, messageId, emoji.key, limit);
  return findUsersByIds(userIds).map(serializePublicUser);
}

export function buildReactionsByMessage(
  messageIds: string[],
  viewerId?: string,
): Map<string, ReactionDto[]> {
  const result = new Map<string, ReactionDto[]>();
  const records = listReactionsForMessages(messageIds);
  if (records.length === 0) {
    return result;
  }

  const groupedByMessage = new Map<
    string,
    Map<string, { id: string | null; name: string; count: number; me: boolean }>
  >();

  for (const record of records) {
    let emojiMap = groupedByMessage.get(record.message_id);
    if (!emojiMap) {
      emojiMap = new Map();
      groupedByMessage.set(record.message_id, emojiMap);
    }

    let entry = emojiMap.get(record.emoji_key);
    if (!entry) {
      entry = {
        id: record.emoji_id,
        name: record.emoji_name,
        count: 0,
        me: false,
      };
      emojiMap.set(record.emoji_key, entry);
    }

    entry.count += 1;
    if (viewerId && record.user_id === viewerId) {
      entry.me = true;
    }
  }

  for (const [messageId, emojiMap] of groupedByMessage.entries()) {
    const list: ReactionDto[] = [];
    for (const entry of emojiMap.values()) {
      list.push({
        count: entry.count,
        count_details: {
          burst: 0,
          normal: entry.count,
        },
        me: entry.me,
        me_burst: false,
        burst_colors: [],
        emoji: {
          id: entry.id,
          name: entry.name,
        },
      });
    }
    result.set(messageId, list);
  }

  return result;
}
