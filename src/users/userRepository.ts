import { getDatabase } from '../db/database.js';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  global_name: string | null;
  password_hash: string;
  avatar: string | null;
  date_of_birth: string | null;
  bot: number;
  verified: number;
  locale: string;
  theme: string;
  created_at: number;
}

export interface CreateUserInput {
  id: string;
  email: string;
  username: string;
  globalName: string | null;
  passwordHash: string;
  dateOfBirth: string | null;
  createdAt: number;
}

export interface UpdateUserInput {
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  date_of_birth?: string | null;
}

export function createUser(input: CreateUserInput): UserRecord {
  const db = getDatabase();
  const statement = db.prepare(`
    INSERT INTO users (id, email, username, global_name, password_hash, date_of_birth, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  statement.run(
    input.id,
    input.email,
    input.username,
    input.globalName,
    input.passwordHash,
    input.dateOfBirth,
    input.createdAt,
  );

  const created = findUserById(input.id);
  if (!created) {
    throw new Error('Failed to load created user');
  }
  return created;
}

export function findUserById(id: string): UserRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return (row as UserRecord | undefined) ?? null;
}

export function findUserByEmail(email: string): UserRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return (row as UserRecord | undefined) ?? null;
}

export function findUserByUsername(username: string): UserRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  return (row as UserRecord | undefined) ?? null;
}

export function findUsersByIds(ids: string[]): UserRecord[] {
  if (ids.length === 0) {
    return [];
  }
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...ids);
  return rows as unknown as UserRecord[];
}

export function updateUser(id: string, input: UpdateUserInput): UserRecord | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (input.username !== undefined) {
    updates.push('username = ?');
    values.push(input.username);
  }
  if (input.global_name !== undefined) {
    updates.push('global_name = ?');
    values.push(input.global_name);
  }
  if (input.avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(input.avatar);
  }
  if (input.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    values.push(input.date_of_birth);
  }

  if (updates.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return findUserById(id);
}
