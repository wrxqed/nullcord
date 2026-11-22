import { DiscordApiError } from '../common/errors.js';
import { dispatchToUser } from '../gateway/sessionRegistry.js';
import { findUserById, findUserByUsername, findUsersByIds, type UserRecord } from '../users/userRepository.js';
import { serializePublicUser } from '../users/userSerializer.js';
import {
  deleteRelationshipPair,
  findRelationship,
  listRelationshipsByUser,
  upsertRelationship,
} from './repository.js';
import { RelationshipType, type RelationshipDto } from './types.js';

function toRelationshipDto(target: UserRecord, type: number, nickname: string | null): RelationshipDto {
  return {
    id: target.id,
    type,
    nickname,
    user: serializePublicUser(target),
  };
}

export function getUserRelationships(userId: string): {
  relationships: RelationshipDto[];
  users: UserRecord[];
} {
  const records = listRelationshipsByUser(userId);
  if (records.length === 0) {
    return { relationships: [], users: [] };
  }

  const targetUsers = findUsersByIds(records.map((r) => r.to_id));
  const userMap = new Map(targetUsers.map((u) => [u.id, u]));

  const relationships: RelationshipDto[] = [];
  for (const record of records) {
    const target = userMap.get(record.to_id);
    if (!target) {
      continue;
    }
    relationships.push(toRelationshipDto(target, record.type, record.nickname));
  }

  return { relationships, users: targetUsers };
}

export function sendFriendRequest(sender: UserRecord, username: string): void {
  const target = findUserByUsername(username.trim());
  if (!target) {
    throw new DiscordApiError(404, 80004, 'No users with that username found.');
  }

  if (target.id === sender.id) {
    throw new DiscordApiError(400, 80007, 'Cannot send friend request to yourself.');
  }

  const reverse = findRelationship(target.id, sender.id);
  if (reverse?.type === RelationshipType.BLOCKED) {
    throw new DiscordApiError(400, 80001, 'Friend request blocked.');
  }

  const existing = findRelationship(sender.id, target.id);
  if (existing?.type === RelationshipType.FRIEND) {
    throw new DiscordApiError(400, 80000, 'Already friends.');
  }

  if (existing?.type === RelationshipType.INCOMING_REQUEST) {
    acceptFriendRequest(sender, target);
    return;
  }

  upsertRelationship(sender.id, target.id, RelationshipType.OUTGOING_REQUEST);
  upsertRelationship(target.id, sender.id, RelationshipType.INCOMING_REQUEST);

  dispatchToUser(
    sender.id,
    'RELATIONSHIP_ADD',
    toRelationshipDto(target, RelationshipType.OUTGOING_REQUEST, null),
  );
  dispatchToUser(
    target.id,
    'RELATIONSHIP_ADD',
    toRelationshipDto(sender, RelationshipType.INCOMING_REQUEST, null),
  );
}

function acceptFriendRequest(actor: UserRecord, target: UserRecord): void {
  upsertRelationship(actor.id, target.id, RelationshipType.FRIEND);
  upsertRelationship(target.id, actor.id, RelationshipType.FRIEND);

  dispatchToUser(actor.id, 'RELATIONSHIP_ADD', toRelationshipDto(target, RelationshipType.FRIEND, null));
  dispatchToUser(target.id, 'RELATIONSHIP_ADD', toRelationshipDto(actor, RelationshipType.FRIEND, null));
}

export function setRelationship(actor: UserRecord, targetId: string, requestedType?: number): void {
  if (actor.id === targetId) {
    throw new DiscordApiError(400, 80007, 'Cannot modify relationship with yourself.');
  }

  const target = findUserById(targetId);
  if (!target) {
    throw new DiscordApiError(404, 10013, 'Unknown User');
  }

  if (requestedType === RelationshipType.BLOCKED) {
    upsertRelationship(actor.id, target.id, RelationshipType.BLOCKED);
    const reverse = findRelationship(target.id, actor.id);
    if (reverse && reverse.type !== RelationshipType.BLOCKED) {
      deleteRelationshipPair(target.id, actor.id);
      dispatchToUser(target.id, 'RELATIONSHIP_REMOVE', { id: actor.id, type: reverse.type });
    }
    dispatchToUser(actor.id, 'RELATIONSHIP_ADD', toRelationshipDto(target, RelationshipType.BLOCKED, null));
    return;
  }

  const existing = findRelationship(actor.id, target.id);
  if (existing?.type === RelationshipType.INCOMING_REQUEST) {
    acceptFriendRequest(actor, target);
    return;
  }

  sendFriendRequest(actor, target.username);
}

export function removeRelationship(actor: UserRecord, targetId: string): void {
  const existing = findRelationship(actor.id, targetId);
  if (!existing) {
    return;
  }

  deleteRelationshipPair(actor.id, targetId);
  dispatchToUser(actor.id, 'RELATIONSHIP_REMOVE', { id: targetId, type: existing.type });

  if (existing.type === RelationshipType.BLOCKED) {
    return;
  }

  const reverse = findRelationship(targetId, actor.id);
  if (reverse && reverse.type !== RelationshipType.BLOCKED) {
    deleteRelationshipPair(targetId, actor.id);
    dispatchToUser(targetId, 'RELATIONSHIP_REMOVE', { id: actor.id, type: reverse.type });
  }
}
