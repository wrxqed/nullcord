import type { PublicUserDto } from '../users/userSerializer.js';

export const RelationshipType = {
  FRIEND: 1,
  BLOCKED: 2,
  INCOMING_REQUEST: 3,
  OUTGOING_REQUEST: 4,
} as const;

export type RelationshipTypeValue = (typeof RelationshipType)[keyof typeof RelationshipType];

export interface RelationshipRecord {
  from_id: string;
  to_id: string;
  type: number;
  nickname: string | null;
  created_at: number;
}

export interface RelationshipDto {
  id: string;
  type: number;
  nickname: string | null;
  user: PublicUserDto;
}
