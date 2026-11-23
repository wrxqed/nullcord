import { getDatabase } from '../db/database.js';
import type { RelationshipRecord } from './types.js';

export function findRelationship(fromId: string, toId: string): RelationshipRecord | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM relationships WHERE from_id = ? AND to_id = ?')
    .get(fromId, toId);
  return (row as RelationshipRecord | undefined) ?? null;
}

export function listRelationshipsByUser(userId: string): RelationshipRecord[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM relationships WHERE from_id = ? ORDER BY created_at DESC')
    .all(userId);
  return rows as unknown as RelationshipRecord[];
}

export function listFriendIds(userId: string): string[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT to_id FROM relationships WHERE from_id = ? AND type = 1')
    .all(userId) as Array<{ to_id: string }>;
  return rows.map((row) => row.to_id);
}

export function listMutualFriendIds(userA: string, userB: string): string[] {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT r1.to_id
      FROM relationships r1
      JOIN relationships r2 ON r2.to_id = r1.to_id
      WHERE r1.from_id = ? AND r1.type = 1
        AND r2.from_id = ? AND r2.type = 1
    `)
    .all(userA, userB) as Array<{ to_id: string }>;
  return rows.map((row) => row.to_id);
}

export function upsertRelationship(
  fromId: string,
  toId: string,
  type: number,
  nickname: string | null = null,
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO relationships (from_id, to_id, type, nickname, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(from_id, to_id) DO UPDATE SET
      type = excluded.type,
      nickname = COALESCE(excluded.nickname, relationships.nickname)
  `).run(fromId, toId, type, nickname, Date.now());
}

export function deleteRelationshipPair(fromId: string, toId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM relationships WHERE from_id = ? AND to_id = ?').run(fromId, toId);
}
