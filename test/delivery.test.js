import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryStore } from '../src/store.js';
import { DeliveryQueue } from '../src/delivery.js';
import { welcomeEmbed } from '../src/message.js';

function member(send = async () => {}) {
  return {
    id: '123', user: { bot: false }, pending: false, send,
    guild: { id: '456', members: { fetch: async () => ({}) } },
  };
}

test('parallel join and button requests send only one DM', async () => {
  const store = new DeliveryStore(':memory:');
  let sends = 0;
  const person = member(async () => { sends += 1; });
  const queue = new DeliveryQueue(store, () => ({}), 0);
  await Promise.all([queue.enqueue(person), queue.enqueue(person, true), queue.enqueue(person)]);
  assert.equal(sends, 1);
  assert.equal(store.status('456', '123'), 'sent');
  store.close();
});

test('blocked DMs retry only when the member explicitly asks', async () => {
  const store = new DeliveryStore(':memory:');
  const queue = new DeliveryQueue(store, () => ({}), 0);
  const person = member(async () => { throw { code: 50007 }; });
  assert.equal(await queue.enqueue(person), 'blocked');
  person.send = async () => {};
  assert.equal(await queue.enqueue(person), 'blocked');
  assert.equal(await queue.enqueue(person, true), 'sent');
  store.close();
});

test('uncertain deliveries and pending records are not sent twice', async () => {
  const store = new DeliveryStore(':memory:');
  const queue = new DeliveryQueue(store, () => ({}), 0);
  let sends = 0;
  const person = member(async () => { sends += 1; throw new Error('network'); });
  assert.equal(await queue.enqueue(person), 'uncertain');
  assert.equal(await queue.enqueue(person, true), 'uncertain');
  assert.equal(sends, 1);
  assert.equal(store.claim('456', 'other'), true);
  assert.equal(store.claim('456', 'other'), false);
  store.close();
});

test('bots and members who have not accepted screening are ignored', async () => {
  const store = new DeliveryStore(':memory:');
  const queue = new DeliveryQueue(store, () => ({}), 0);
  const person = member(() => assert.fail('should not send'));
  person.pending = true;
  assert.equal(await queue.enqueue(person), 'ignored');
  person.pending = false;
  person.user.bot = true;
  assert.equal(await queue.enqueue(person), 'ignored');
  assert.equal(store.status('456', '123'), undefined);
  store.close();
});

test('embed preserves the approved text, channel links and custom emojis', () => {
  const embed = welcomeEmbed().toJSON();
  assert.match(embed.description, /<#1560785298424856577>/);
  assert.match(embed.description, /<#1560391452008120493>/);
  assert.match(embed.description, /<:fpsog:1561456570490167418>/);
  assert.match(embed.description, /<:foguete:1536065581038702683>/);
  assert.match(embed.description, /R\$ 4,99/);
  assert.ok(embed.description.length < 4096);
});
