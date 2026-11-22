const { test } = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../dist').default;
test('only the event owner can forward the exact scoped generation and idempotency key', async () => {
  let enabled = true;
  const forwarded = [];
  const [{ methods: [replace] }] = plugin.registerServices({ configFor: async () => ({ publishCalendar: enabled }),
    services: { call: async value => { forwarded.push(value); return { generation: 7 }; } } });
  const input = { capabilityId: 'calendar.feed.replace.v1', resourceKey: 'events', generation: 7,
    payloadSha256: 'f'.repeat(64), idempotencyKey: 'existing-key', payload: { scopeId: 'group', calendarKey: 'events', generation: 7 } };
  const call = { callerPluginId: 'official.community-events', scopeId: 'group' };
  assert.deepEqual(await replace.handler(input, call), { generation: 7 });
  assert.deepEqual(forwarded[0].input, input);
  await assert.rejects(replace.handler(input, { ...call, callerPluginId: 'other' }));
  await assert.rejects(replace.handler(input, { ...call, scopeId: 'other' }));
  await assert.rejects(replace.handler({ ...input, generation: 8 }, call));
  enabled = false;
  await assert.rejects(replace.handler(input, call));
  assert.equal(forwarded.length, 1);
});
