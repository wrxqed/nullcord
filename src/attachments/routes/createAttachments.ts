import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import {
  createUploadSlots,
  type AttachmentUploadRequestItem,
} from '../attachmentService.js';

interface CreateAttachmentsBody {
  files?: AttachmentUploadRequestItem[];
}

export const createAttachmentsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { channelId: string }; Body: CreateAttachmentsBody }>(
    '/channels/:channelId/attachments',
    async (request) => {
      const user = requireAuthUser(request);
      const files = Array.isArray(request.body?.files) ? request.body.files : [];
      return {
        attachments: createUploadSlots(request.params.channelId, user.id, files),
      };
    },
  );
};
