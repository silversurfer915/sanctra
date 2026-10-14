import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountData } from '../src/utils/accountData.ts';
test('empty cloud arrays are authoritative and missing fields preserve local data', () => {
  const local = { sessions:[{id:'old'}], tasks:[{id:'task'}], subjects:[] };
  const resolved = resolveAccountData(local, {sessions:[]});
  assert.deepEqual(resolved.sessions, []);
  assert.deepEqual(resolved.tasks, local.tasks);
  assert.deepEqual(resolveAccountData(local,null),local);
});
