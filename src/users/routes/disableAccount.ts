import type { FastifyPluginAsync } from 'fastify';
import { requireAuthUser } from '../../auth/authGuard.js';
import { verifyPassword } from '../../auth/password.js';
import { DiscordApiError } from '../../common/errors.js';
import { updateUser } from '../userRepository.js';

interface PasswordBody {
  password?: unknown;
}

export const disableAccountRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: PasswordBody }>('/users/@me/disable', async (request, reply) => {
    const user = requireAuthUser(request);
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!verifyPassword(password, user.password_hash)) {
      throw new DiscordApiError(400, 50035, 'Invalid Form Body', {
        password: {
          _errors: [{ code: 'INVALID_PASSWORD', message: 'Password does not match.' }],
        },
      });
    }

    updateUser(user.id, { disabled: 1 });
    return reply.status(204).send();
  });
};
