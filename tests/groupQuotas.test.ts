import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMessageRate,
  canCreateGroup,
  resetMessageRateStore,
  FREE_GROUP_CREATION_LIMIT,
  PLUS_GROUP_CREATION_LIMIT,
} from '../src/utils/groupQuotas.ts';

beforeEach(() => {
  resetMessageRateStore();
});

test('canCreateGroup enforces 3 groups for free plan and 15 for Plus plan', () => {
  assert.equal(canCreateGroup(0, false).allowed, true);
  assert.equal(canCreateGroup(2, false).allowed, true);
  assert.equal(canCreateGroup(3, false).allowed, false);
  assert.ok(canCreateGroup(3, false).error?.includes('Free accounts can create up to 3'));

  assert.equal(canCreateGroup(3, true).allowed, true);
  assert.equal(canCreateGroup(14, true).allowed, true);
  assert.equal(canCreateGroup(15, true).allowed, false);
  assert.ok(canCreateGroup(15, true).error?.includes('Sanctra Plus+ group limit of 15'));
});

test('validateMessageRate permits normal paced messages', () => {
  const now = 100000;
  const res1 = validateMessageRate('user1', 'First message', now);
  assert.equal(res1.allowed, true);

  const res2 = validateMessageRate('user1', 'Second message', now + 1000);
  assert.equal(res2.allowed, true);
});

test('validateMessageRate blocks duplicate message spam within 5 seconds', () => {
  const now = 100000;
  const res1 = validateMessageRate('user1', 'Same text', now);
  assert.equal(res1.allowed, true);

  const res2 = validateMessageRate('user1', 'Same text', now + 2000);
  assert.equal(res2.allowed, false);
  assert.ok(res2.reason?.includes('Duplicate message'));

  // After 6 seconds, sending same text is allowed
  const res3 = validateMessageRate('user1', 'Same text', now + 7000);
  assert.equal(res3.allowed, true);
});

test('validateMessageRate blocks burst of more than 6 messages in 10 seconds', () => {
  let now = 100000;
  for (let i = 0; i < 6; i++) {
    const res = validateMessageRate('spammer', `Message #${i}`, now + i * 500);
    assert.equal(res.allowed, true);
  }

  // 7th message in the 10-second window is rejected
  const blocked = validateMessageRate('spammer', 'Message #7', now + 3500);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.reason?.includes('too quickly'));
  assert.ok(Number(blocked.retryAfterSeconds) > 0);
});
