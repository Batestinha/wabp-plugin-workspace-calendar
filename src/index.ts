import { z } from 'zod';
import { memberSubscriptionState, registerMemberSubscription } from '@wabs/plugin-sdk/member-subscriptions';
import type { ServicePlugin } from '@wabs/plugin-sdk/service-plugin';
import { configSchema, manifest } from './manifest';

const projection = z.object({
  capabilityId: z.literal('calendar.feed.replace.v1'),
  resourceKey: z.string().min(1).max(160), generation: z.number().int().positive(),
  payloadSha256: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(1).max(512),
  payload: z.object({ scopeId: z.string(), calendarKey: z.string(), generation: z.number().int() }).passthrough()
}).strict();

const calendar: ServicePlugin = {
  manifest,
  registerServices(context) {
    const offer = manifest.memberSubscriptions![0]!;
    const subscription = registerMemberSubscription(offer, async call => {
      if (!call.actorIdentityId || !context.services || !configSchema.parse(await context.configFor(call.scopeId)).publishCalendar) return null;
      return memberSubscriptionState.parse(await context.services.call({
        serviceId: 'official.integration-manager.calendar-subscriptions.v1', method: 'read', scopeId: call.scopeId,
        actorIdentityId: call.actorIdentityId, signal: call.signal, input: {}
      }));
    });
    return [{
      serviceId: 'official.workspace-calendar.projection.v1',
      methods: [{
        name: 'replace', access: 'mutation', timeoutMs: 30000, inputSchema: projection, outputSchema: z.unknown(),
        async handler(raw, call) {
          const input = projection.parse(raw);
          if (call.callerPluginId !== 'official.community-events' || input.payload.scopeId !== call.scopeId ||
            input.payload.calendarKey !== input.resourceKey || input.payload.generation !== input.generation ||
            !configSchema.parse(await context.configFor(call.scopeId)).publishCalendar || !context.services) {
            throw new Error('Calendar publication is unavailable for the caller and scope.');
          }
          return context.services.call({ serviceId: 'official.integration-manager.projection.v1', method: 'replace',
            scopeId: call.scopeId, signal: call.signal, input });
        }
      }]
    }, subscription];
  }
};
export default calendar;
