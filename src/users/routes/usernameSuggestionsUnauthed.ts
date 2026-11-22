import type { FastifyPluginAsync } from 'fastify';
import { suggestAvailableUsername } from '../usernameService.js';

interface SuggestionsQuery {
  global_name?: string;
}

export const usernameSuggestionsUnauthedRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: SuggestionsQuery }>(
    '/unique-username/username-suggestions-unauthed',
    async (request) => {
      return {
        username: suggestAvailableUsername(request.query.global_name),
      };
    },
  );
};
