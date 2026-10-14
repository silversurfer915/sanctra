import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSoundscapeSettings, DEFAULT_SOUNDSCAPE_SETTINGS } from '../src/utils/soundscapes.ts';
import { createSavedSound, normalizeSoundLibrary } from '../src/utils/soundLibrary.ts';
import { parseYouTubeUrl } from '../src/utils/youtubeHelper.ts';

test('Soundscape settings: preserves active settings and volume bounds', () => {
  const norm = normalizeSoundscapeSettings({
    activeSoundscape: 'rain',
    volume: 0.8,
    playWithTimer: true,
    fadeOnEnd: true,
  });

  assert.equal(norm.activeSoundscape, 'rain');
  assert.equal(norm.volume, 0.8);
  assert.equal(norm.playWithTimer, true);
  assert.equal(norm.fadeOnEnd, true);
});

test('Soundscape settings: fallbacks on invalid volume and soundscape id', () => {
  const norm = normalizeSoundscapeSettings({
    activeSoundscape: 'invalid-sound' as any,
    volume: -10,
  });

  assert.equal(norm.activeSoundscape, null);
  assert.equal(norm.volume, 0); // Clamped to min 0
});

test('Soundscape library & YouTube player: parses and validates audio stream links', () => {
  const parsed = parseYouTubeUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  assert.ok(parsed);
  assert.equal(parsed.id, 'jfKfPfyJRdk');
  assert.ok(parsed.embedUrl.includes('autoplay=0'));

  const sound = createSavedSound('Lofi Beats', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'sound-1');
  const lib = normalizeSoundLibrary([sound]);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].title, 'Lofi Beats');
});
