import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChannel } from '../src/utils/channel.ts';
test('room updates reach subscribers, with unsubscribe and room isolation', () => {
  const channel = createChannel<number>();
  const received: number[] = [];
  const off = channel.subscribe('a', value => received.push(value));
  channel.publish('b', 1);
  channel.publish('a', 2);
  off();
  channel.publish('a', 3);
  assert.deepEqual(received, [2]);
});
