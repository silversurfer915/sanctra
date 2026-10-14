import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canToggleTimerShortcut } from '../src/utils/timerShortcut.ts';
test('Space only controls the timer outside interactive controls and dialogs', () => {
  assert.equal(canToggleTimerShortcut({ code: 'Space', repeat: false, interactive: false, dialogOpen: false }), true);
  for (const blocked of [{ interactive: true }, { dialogOpen: true }, { repeat: true }, { code: 'Enter' }]) {
    assert.equal(canToggleTimerShortcut({ code: 'Space', repeat: false, interactive: false, dialogOpen: false, ...blocked }), false);
  }
});
