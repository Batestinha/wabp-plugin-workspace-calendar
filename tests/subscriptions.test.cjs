const { test } = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../dist').default;

test('published calendars delegate only the verified member and scope to the external status reader', async () => {
  let publishCalendar = true;
  const calls = [];
  const state = { choice: null, manageUrl: 'https://workspace.example/calendar/hub' };
  const service = plugin.registerServices({ configFor: async () => ({ publishCalendar }),
    services: { call: async input => { calls.push(input); return state; } } }).find(s => s.serviceId.endsWith('.subscriptions.v1'));
  assert.deepEqual(service.methods.map(m => m.name), ['read']);
  const read = service.methods[0].handler;
  assert.deepEqual(await read({}, { actorIdentityId: 'me', scopeId: 'group' }), state);
  assert.equal(calls[0].actorIdentityId, 'me');
  assert.equal(calls[0].scopeId, 'group');
  assert.equal(await read({}, { scopeId: 'group' }), null);
  publishCalendar = false;
  assert.equal(await read({}, { actorIdentityId: 'me', scopeId: 'group' }), null);
  assert.equal(calls.length, 1);
});
