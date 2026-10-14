import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeUrl } from '../src/utils/youtubeHelper.ts';

test('parseYouTubeUrl parses standard watch URLs', () => {
  const parsed = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(parsed);
  assert.equal(parsed.type, 'video');
  assert.equal(parsed.id, 'dQw4w9WgXcQ');
  assert.ok(parsed.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
});

test('parseYouTubeUrl parses shortened youtu.be URLs', () => {
  const parsed = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.ok(parsed);
  assert.equal(parsed.type, 'video');
  assert.equal(parsed.id, 'dQw4w9WgXcQ');
});

test('parseYouTubeUrl parses raw 11-char video IDs', () => {
  const parsed = parseYouTubeUrl('dQw4w9WgXcQ');
  assert.ok(parsed);
  assert.equal(parsed.id, 'dQw4w9WgXcQ');
});

test('parseYouTubeUrl parses playlist links', () => {
  const parsed = parseYouTubeUrl('https://www.youtube.com/playlist?list=PLw-VjHDlEOgv_P9A5i2yP8T5s8Gj_W');
  assert.ok(parsed);
  assert.equal(parsed.type, 'playlist');
  assert.ok(parsed.embedUrl.includes('videoseries?list='));
});

test('parseYouTubeUrl rejects invalid or non-YouTube URLs', () => {
  assert.equal(parseYouTubeUrl(''), null);
  assert.equal(parseYouTubeUrl('https://vimeo.com/12345'), null);
  assert.equal(parseYouTubeUrl('invalid string'), null);
});
