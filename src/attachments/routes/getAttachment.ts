import fs from 'node:fs';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { resolveUploadedFile } from '../attachmentService.js';
import { generateVideoPoster } from '../videoMetadata.js';

const VIDEO_POSTER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGBgAAAABQABDQottAAAAABJRU5ErkJggg==',
  'base64',
);

function parseByteRange(
  rangeHeader: string,
  totalSize: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const rawStart = match[1] ?? '';
  const rawEnd = match[2] ?? '';

  if (rawStart === '' && rawEnd === '') {
    return null;
  }

  if (rawStart === '') {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    const start = Math.max(totalSize - suffixLength, 0);
    return { start, end: totalSize - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? totalSize - 1 : Math.min(Number(rawEnd), totalSize - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= totalSize) {
    return null;
  }

  return { start, end };
}

export const getAttachmentRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { uploadId: string; filename: string };
    Querystring: { format?: string };
  }>(
    '/attachments/:uploadId/:filename',
    async (request, reply) => {
      const file = resolveUploadedFile(request.params.uploadId, request.params.filename);
      if (!file) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      if (file.contentType.startsWith('video/') && typeof request.query.format === 'string') {
        const posterPath = path.join(path.dirname(file.filePath), 'poster.webp');
        if (generateVideoPoster(file.filePath, posterPath)) {
          const stat = fs.statSync(posterPath);
          reply.header('Content-Length', stat.size);
          return reply.type('image/webp').send(fs.createReadStream(posterPath));
        }

        reply.header('Content-Length', VIDEO_POSTER_PNG.length);
        return reply.type('image/png').send(VIDEO_POSTER_PNG);
      }

      reply.header('Accept-Ranges', 'bytes');
      reply.type(file.contentType);

      const rangeHeader = request.headers.range;
      if (typeof rangeHeader === 'string' && file.size > 0) {
        const range = parseByteRange(rangeHeader, file.size);
        if (!range) {
          reply.header('Content-Range', `bytes */${file.size}`);
          return reply.status(416).send();
        }

        const chunkSize = range.end - range.start + 1;
        reply.header('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
        reply.header('Content-Length', chunkSize);
        return reply.status(206).send(
          fs.createReadStream(file.filePath, { start: range.start, end: range.end }),
        );
      }

      reply.header('Content-Length', file.size);
      return reply.send(fs.createReadStream(file.filePath));
    },
  );
};
