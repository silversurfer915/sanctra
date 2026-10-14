import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRoomVisible } from '../src/utils/roomAccess.ts';
test('public listing excludes private rooms and personal listing excludes strangers', () => {
  const privateRoom = { id: 'private', createdById: 'someone', isPublic: false };
  assert.equal(isRoomVisible(privateRoom, 'public', 'me', []), false);
  assert.equal(isRoomVisible(privateRoom, 'my-rooms', 'me', []), false);
  assert.equal(isRoomVisible(privateRoom, 'my-rooms', 'me', ['private']), true);
  assert.equal(isRoomVisible({...privateRoom, createdById:'me'}, 'my-rooms', 'me', []), true);
  assert.equal(isRoomVisible({...privateRoom, isPublic:true}, 'public', 'me', []), true);
});
