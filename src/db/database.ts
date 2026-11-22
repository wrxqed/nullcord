import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';

let instance: DatabaseSync | null = null;

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function applySchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      global_name TEXT,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      date_of_birth TEXT,
      bot INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 1,
      locale TEXT NOT NULL DEFAULT 'en-US',
      theme TEXT NOT NULL DEFAULT 'dark',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type INTEGER NOT NULL,
      nickname TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (from_id, to_id)
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id),
      system_channel_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      guild_id TEXT REFERENCES guilds(id) ON DELETE CASCADE,
      type INTEGER NOT NULL,
      name TEXT,
      topic TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      last_message_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_recipients (
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      closed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (channel_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_members (
      guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nick TEXT,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      nonce TEXT,
      tts INTEGER NOT NULL DEFAULT 0,
      referenced_message_id TEXT,
      timestamp TEXT NOT NULL,
      edited_timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS read_states (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      last_message_id TEXT NOT NULL,
      mention_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, channel_id)
    );
  `);

  ensureColumn(db, 'users', 'date_of_birth', 'TEXT');
  ensureColumn(db, 'messages', 'referenced_message_id', 'TEXT');
}

export function getDatabase(): DatabaseSync {
  if (instance !== null) {
    return instance;
  }

  const resolvedPath = path.resolve(env.dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new DatabaseSync(resolvedPath);
  applySchema(db);
  instance = db;
  return db;
}
