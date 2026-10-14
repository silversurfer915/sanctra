import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePresence } from '../src/utils/presence.ts';
test('expired members keep rankings but appear offline; yesterday totals reset', () => {
  const member={uid:'a',status:'focusing',lastHeartbeat:1000,todaySeconds:3600,studyDate:'2026-10-01'};
  assert.equal(normalizePresence(member,'b',200000,'2026-10-01').status,'offline');
  assert.equal(normalizePresence(member,'b',200000,'2026-10-01').todaySeconds,3600);
  assert.equal(normalizePresence(member,'b',200000,'2026-10-02').todaySeconds,0);
  assert.equal(normalizePresence({...member,lastHeartbeat:200000},'a',200000,'2026-10-01').isCurrentUser,true);
});
