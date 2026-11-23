import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { inferContentType } from '../attachments/attachmentService.js';
import { DiscordApiError } from '../common/errors.js';

export type UserMediaCategory = 'avatars' | 'banners';

const DATA_URI_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([a-zA-Z0-9+/=]+)$/;
const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const MEDIA_ROOT = path.resolve('data', 'media');

function normalizeExtension(subtype: string): string {
  if (subtype === 'jpeg') {
    return 'jpg';
  }
  return subtype;
}

export function saveUserMedia(
  category: UserMediaCategory,
  userId: string,
  dataUri: string,
): string {
  const match = DATA_URI_PATTERN.exec(dataUri.trim());
  if (!match) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  const subtype = match[1]!;
  const base64Body = match[2]!;
  const ext = normalizeExtension(subtype);
  const buffer = Buffer.from(base64Body, 'base64');

  if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 32);
  const hash = ext === 'gif' ? `a_${digest}` : digest;

  const targetDir = path.join(MEDIA_ROOT, category, userId);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, `${hash}.${ext}`), buffer);

  return hash;
}

export function resolveUserMedia(
  category: UserMediaCategory,
  userId: string,
  rawFile: string,
): { buffer: Buffer; contentType: string } | null {
  if (!SAFE_SEGMENT.test(userId) || !SAFE_SEGMENT.test(rawFile)) {
    return null;
  }

  const targetDir = path.join(MEDIA_ROOT, category, userId);
  if (!fs.existsSync(targetDir)) {
    return null;
  }

  const exactPath = path.join(targetDir, rawFile);
  if (fs.existsSync(exactPath)) {
    return {
      buffer: fs.readFileSync(exactPath),
      contentType: inferContentType(rawFile),
    };
  }

  const hashStem = path.parse(rawFile).name;
  if (!SAFE_SEGMENT.test(hashStem)) {
    return null;
  }

  const entries = fs.readdirSync(targetDir);
  const matchedFile = entries.find((entry) => path.parse(entry).name === hashStem);
  if (!matchedFile) {
    return null;
  }

  return {
    buffer: fs.readFileSync(path.join(targetDir, matchedFile)),
    contentType: inferContentType(matchedFile),
  };
}
