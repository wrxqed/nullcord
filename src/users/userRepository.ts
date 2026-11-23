import { getDatabase } from '../db/database.js';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  global_name: string | null;
  password_hash: string;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
  bio: string | null;
  pronouns: string | null;
  date_of_birth: string | null;
  disabled: number;
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
  email?: string;
  username?: string;
  global_name?: string | null;
  password_hash?: string;
  avatar?: string | null;
  banner?: string | null;
  accent_color?: number | null;
  bio?: string | null;
  pronouns?: string | null;
  date_of_birth?: string | null;
  disabled?: number;
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
  const values: Array<string | number | null> = [];

  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.username !== undefined) {
    updates.push('username = ?');
    values.push(input.username);
  }
  if (input.global_name !== undefined) {
    updates.push('global_name = ?');
    values.push(input.global_name);
  }
  if (input.password_hash !== undefined) {
    updates.push('password_hash = ?');
    values.push(input.password_hash);
  }
  if (input.avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(input.avatar);
  }
  if (input.banner !== undefined) {
    updates.push('banner = ?');
    values.push(input.banner);
  }
  if (input.accent_color !== undefined) {
    updates.push('accent_color = ?');
    values.push(input.accent_color);
  }
  if (input.bio !== undefined) {
    updates.push('bio = ?');
    values.push(input.bio);
  }
  if (input.pronouns !== undefined) {
    updates.push('pronouns = ?');
    values.push(input.pronouns);
  }
  if (input.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    values.push(input.date_of_birth);
  }
  if (input.disabled !== undefined) {
    updates.push('disabled = ?');
    values.push(input.disabled);
  }

  if (updates.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return findUserById(id);
}

export function deleteUserById(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
