import fs from 'node:fs';
import path from 'node:path';
import { isChannelRecipient } from '../channels/dmService.js';
import { DiscordApiError } from '../common/errors.js';
import { generateSnowflake } from '../common/snowflake.js';
import { env } from '../config/env.js';
import { getDatabase } from '../db/database.js';
import { extractMediaDimensions } from './imageDimensions.js';
import { probeVideoDimensions } from './videoMetadata.js';

export interface AttachmentUploadRequestItem {
  id?: string | number;
  filename?: unknown;
  file_size?: unknown;
}

export interface AttachmentUploadSlotDto {
  id: string | number;
  upload_url: string;
  upload_filename: string;
}

export interface UploadedAttachmentRef {
  id?: string | number;
  filename?: unknown;
  uploaded_filename?: unknown;
}

export interface AttachmentDto {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  content_type: string;
  width?: number;
  height?: number;
}

interface AttachmentRecord {
  id: string;
  message_id: string;
  filename: string;
  uploaded_filename: string;
  size: number;
  content_type: string | null;
  width: number | null;
  height: number | null;
}

const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const UPLOADS_ROOT = path.resolve('data', 'uploads');
const pendingUploads = new Map<string, string>();

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

export function inferContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function sanitizeFilename(raw: string): string {
  const base = path.basename(raw).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 0 ? base.slice(0, 120) : 'file.bin';
}

export function createUploadSlots(
  channelId: string,
  userId: string,
  files: AttachmentUploadRequestItem[],
): AttachmentUploadSlotDto[] {
  if (!isChannelRecipient(channelId, userId)) {
    throw new DiscordApiError(404, 10003, 'Unknown Channel');
  }

  return files.map((file, index) => {
    const rawName = typeof file.filename === 'string' ? file.filename : `file_${index}`;
    const safeName = sanitizeFilename(rawName);
    const uploadId = generateSnowflake();
    const uploadFilename = `${uploadId}/${safeName}`;
    pendingUploads.set(uploadId, channelId);

    return {
      id: file.id ?? index,
      upload_url: `http://${env.publicHost}/api/v9/attachments/upload/${channelId}/${uploadFilename}`,
      upload_filename: uploadFilename,
    };
  });
}

export function saveUploadedFile(
  channelId: string,
  uploadId: string,
  filename: string,
  data: Buffer,
): void {
  if (pendingUploads.get(uploadId) !== channelId) {
    throw new DiscordApiError(403, 0, 'Invalid upload slot');
  }

  if (!SAFE_SEGMENT.test(uploadId) || !SAFE_SEGMENT.test(filename)) {
    throw new DiscordApiError(400, 50035, 'Invalid Form Body');
  }

  pendingUploads.delete(uploadId);
  const targetDir = path.join(UPLOADS_ROOT, uploadId);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, filename), data);
}

export function resolveUploadedFile(
  uploadId: string,
  filename: string,
): { filePath: string; size: number; contentType: string } | null {
  if (!SAFE_SEGMENT.test(uploadId) || !SAFE_SEGMENT.test(filename)) {
    return null;
  }

  const filePath = path.join(UPLOADS_ROOT, uploadId, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const stat = fs.statSync(filePath);
  return {
    filePath,
    size: stat.size,
    contentType: inferContentType(filename),
  };
}

export function saveMessageAttachments(
  messageId: string,
  attachments: UploadedAttachmentRef[],
): void {
  if (attachments.length === 0) {
    return;
  }

  const db = getDatabase();
  const statement = db.prepare(`
    INSERT INTO message_attachments (
      id, message_id, filename, uploaded_filename, size, content_type, width, height
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of attachments) {
    if (typeof item.uploaded_filename !== 'string') {
      continue;
    }

    const parts = item.uploaded_filename.split('/');
    const uploadId = parts[0];
    const storedName = parts[1];
    if (!uploadId || !storedName || !SAFE_SEGMENT.test(uploadId) || !SAFE_SEGMENT.test(storedName)) {
      continue;
    }

    const filePath = path.join(UPLOADS_ROOT, uploadId, storedName);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    const displayFilename =
      typeof item.filename === 'string' && item.filename.trim().length > 0
        ? item.filename.trim()
        : storedName;
    const contentType = inferContentType(displayFilename);
    let dimensions = exists
      ? extractMediaDimensions(fs.readFileSync(filePath), contentType)
      : null;

    if (exists && contentType.startsWith('video/')) {
      dimensions = probeVideoDimensions(filePath) ?? dimensions;
    }

    statement.run(
      generateSnowflake(),
      messageId,
      displayFilename,
      item.uploaded_filename,
      size,
      contentType,
      dimensions ? dimensions.width : null,
      dimensions ? dimensions.height : null,
    );
  }
}

export function buildAttachmentsByMessage(messageIds: string[]): Map<string, AttachmentDto[]> {
  const result = new Map<string, AttachmentDto[]>();
  if (messageIds.length === 0) {
    return result;
  }

  const db = getDatabase();
  const placeholders = messageIds.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT * FROM message_attachments WHERE message_id IN (${placeholders})`)
    .all(...messageIds) as unknown as AttachmentRecord[];

  for (const row of rows) {
    const url = `http://${env.publicHost}/attachments/${row.uploaded_filename}`;
    const dto: AttachmentDto = {
      id: row.id,
      filename: row.filename,
      size: row.size,
      url,
      proxy_url: url,
      content_type: row.content_type ?? inferContentType(row.filename),
    };

    if (row.width !== null && row.height !== null) {
      dto.width = row.width;
      dto.height = row.height;
    }

    const existing = result.get(row.message_id);
    if (existing) {
      existing.push(dto);
    } else {
      result.set(row.message_id, [dto]);
    }
  }

  return result;
}
