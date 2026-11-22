import type { FastifyPluginAsync } from 'fastify';
import { saveUploadedFile } from '../attachmentService.js';

export const uploadAttachmentRoute: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: 25 * 1024 * 1024 }, (_req, body, done) => {
    done(null, body);
  });

  fastify.put<{ Params: { channelId: string; uploadId: string; filename: string }; Body: Buffer }>(
    '/attachments/upload/:channelId/:uploadId/:filename',
    async (request, reply) => {
      const payload = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      saveUploadedFile(
        request.params.channelId,
        request.params.uploadId,
        request.params.filename,
        payload,
      );
      return reply.status(200).send();
    },
  );
};
