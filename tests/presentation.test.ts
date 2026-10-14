import test from 'node:test';
import assert from 'node:assert/strict';
import { announcementPreview, resolveChatIdentity } from '../src/utils/presentation.ts';

test('announcement preview removes Markdown structure and keeps readable prose', () => {
  const source = '## Your space\n- A **calmer** profile\n> Built for [focus](https://sanctrastudy.live).';
  assert.equal(
    announcementPreview(source),
    'Your space · A calmer profile · Built for focus.'
  );
});

test('chat identity prefers the current member profile over stale message metadata', () => {
  const identity = resolveChatIdentity(
    { senderUid: 'u1', senderName: 'Old name', senderAvatar: '/old.png' },
    [{ uid: 'u1', displayName: 'Current name', avatarUrl: '/current.png' }],
    { uid: 'u1', displayName: 'Device name', photoURL: '/device.png' }
  );
  assert.deepEqual(identity, { displayName: 'Current name', avatarUrl: '/current.png' });
});

test('own chat identity uses the active device profile before stale message metadata', () => {
  const identity = resolveChatIdentity(
    { senderUid: 'u1', senderName: 'Old name', senderAvatar: '/old.png' },
    [],
    { uid: 'u1', displayName: 'Device name', photoURL: '/device.png' }
  );
  assert.deepEqual(identity, { displayName: 'Device name', avatarUrl: '/device.png' });
});
test('flattened announcement previews do not expose inline heading markers or italic syntax',()=>{assert.equal(announcementPreview('Hello. ## What changed **New** and *calm* `tools`.'),'Hello. What changed New and calm tools.');});
