import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { conditionalStartRoute } from '../auth/routes/conditionalStart.js';
import { locationMetadataRoute } from '../auth/routes/locationMetadata.js';
import { loginRoute } from '../auth/routes/login.js';
import { registerRoute } from '../auth/routes/register.js';
import { closeDmChannelRoute } from '../channels/routes/closeDmChannel.js';
import { createDmChannelRoute } from '../channels/routes/createDmChannel.js';
import { getChannelRoute } from '../channels/routes/getChannel.js';
import { listDmChannelsRoute } from '../channels/routes/listDmChannels.js';
import { typingRoute } from '../channels/routes/typing.js';
import { registerClient } from '../client/serveClient.js';
import { DiscordApiError } from '../common/errors.js';
import { ackMessageRoute } from '../messages/routes/ackMessage.js';
import { createMessageRoute } from '../messages/routes/createMessage.js';
import { deleteMessageRoute } from '../messages/routes/deleteMessage.js';
import { editMessageRoute } from '../messages/routes/editMessage.js';
import { listMessagesRoute } from '../messages/routes/listMessages.js';
import { deleteRelationshipRoute } from '../relationships/routes/deleteRelationship.js';
import { listRelationshipsRoute } from '../relationships/routes/listRelationships.js';
import { putRelationshipRoute } from '../relationships/routes/putRelationship.js';
import { sendFriendRequestRoute } from '../relationships/routes/sendFriendRequest.js';
import { affinitiesGuildsRoute } from '../users/routes/affinitiesGuilds.js';
import { applicationEntitlementsRoute } from '../users/routes/applicationEntitlements.js';
import { entitlementsRoute } from '../users/routes/entitlements.js';
import { getMeRoute } from '../users/routes/getMe.js';
import { getUserProfileRoute } from '../users/routes/getUserProfile.js';
import { notesRoute } from '../users/routes/notes.js';
import { pomeloAttemptRoute } from '../users/routes/pomeloAttempt.js';
import { referralsEligibilityRoute } from '../users/routes/referralsEligibility.js';
import { settingsProtoRoute } from '../users/routes/settingsProto.js';
import { surveyRoute } from '../users/routes/survey.js';
import { updateMeRoute } from '../users/routes/updateMe.js';
import { usernameAttemptUnauthedRoute } from '../users/routes/usernameAttemptUnauthed.js';
import { usernameSuggestionsUnauthedRoute } from '../users/routes/usernameSuggestionsUnauthed.js';
import { apexExperimentsRoute } from './routes/apexExperiments.js';
import { errorReportingProxyRoute } from './routes/errorReportingProxy.js';
import { experimentsRoute } from './routes/experiments.js';
import { gatewayRoute } from './routes/gateway.js';
import { healthRoute } from './routes/health.js';
import { metricsV2Route } from './routes/metricsV2.js';
import { promotionsRoute } from './routes/promotions.js';
import { questsDecisionRoute } from './routes/questsDecision.js';
import { questsMeRoute } from './routes/questsMe.js';
import { scienceRoute } from './routes/science.js';

async function registerVersionedApi(app: FastifyInstance, prefix: string): Promise<void> {
  await app.register(
    async (scoped) => {
      await scoped.register(gatewayRoute);
      await scoped.register(registerRoute);
      await scoped.register(loginRoute);
      await scoped.register(conditionalStartRoute);
      await scoped.register(locationMetadataRoute);
      await scoped.register(usernameAttemptUnauthedRoute);
      await scoped.register(usernameSuggestionsUnauthedRoute);
      await scoped.register(pomeloAttemptRoute);
      await scoped.register(referralsEligibilityRoute);
      await scoped.register(affinitiesGuildsRoute);
      await scoped.register(surveyRoute);
      await scoped.register(entitlementsRoute);
      await scoped.register(applicationEntitlementsRoute);
      await scoped.register(getMeRoute);
      await scoped.register(getUserProfileRoute);
      await scoped.register(notesRoute);
      await scoped.register(settingsProtoRoute);
      await scoped.register(updateMeRoute);
      await scoped.register(listRelationshipsRoute);
      await scoped.register(sendFriendRequestRoute);
      await scoped.register(putRelationshipRoute);
      await scoped.register(deleteRelationshipRoute);
      await scoped.register(listDmChannelsRoute);
      await scoped.register(createDmChannelRoute);
      await scoped.register(getChannelRoute);
      await scoped.register(closeDmChannelRoute);
      await scoped.register(typingRoute);
      await scoped.register(listMessagesRoute);
      await scoped.register(createMessageRoute);
      await scoped.register(editMessageRoute);
      await scoped.register(deleteMessageRoute);
      await scoped.register(ackMessageRoute);
      await scoped.register(experimentsRoute);
      await scoped.register(apexExperimentsRoute);
      await scoped.register(promotionsRoute);
      await scoped.register(questsMeRoute);
      await scoped.register(questsDecisionRoute);
      await scoped.register(scienceRoute);
      await scoped.register(metricsV2Route);
    },
    { prefix },
  );
}

export async function registerApi(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DiscordApiError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    return reply.status(500).send({
      code: 0,
      message: 'Internal Server Error',
    });
  });

  await app.register(healthRoute);
  await registerVersionedApi(app, '/api/v9');
  await registerVersionedApi(app, '/api/v10');
  await registerClient(app);
}
