import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeAudioController, type YouTubeAudioPlayer, type YouTubeAudioState } from '../src/utils/youtubeAudio.ts';
function setup() {
  const calls: unknown[][] = [];
  const states: YouTubeAudioState[] = [];
  const player: YouTubeAudioPlayer = {
    loadVideoById: id => { calls.push(['video', id]); },
    loadPlaylist: options => { calls.push(['playlist', options]); },
    playVideo: () => { calls.push(['play']); },
    pauseVideo: () => { calls.push(['pause']); },
    stopVideo: () => { calls.push(['stop']); },
    setVolume: value => { calls.push(['volume', value]); },
    destroy: () => { calls.push(['destroy']); },
  };
  const controller = new YouTubeAudioController(state => states.push(state));
  return { controller, player, calls, states };
}
const video = {type: 'video' as const, id: 'jfKfPfyJRdk', embedUrl: ''};
test('selection before readiness queues the latest track and volume on the prepared player', () => {
  const {controller, player, calls, states} = setup();
  controller.select(video);
  controller.select({...video, id: 'WPni755-Krg'});
  controller.setVolume(.7);
  assert.equal(calls.length, 0);
  controller.ready(player);
  assert.deepEqual(calls.filter(c => c[0] === 'video'), [['video', 'WPni755-Krg']]);
  assert.ok(calls.some(c => c[0] === 'volume' && c[1] === 70));
  assert.equal(states.at(-1), 'loading');
  controller.stateChanged(1);
  assert.equal(states.at(-1), 'playing');
  controller.destroy();
});
test('blocked playback retries directly through Play; pause does not replace the player', () => {
  const {controller, player, calls, states} = setup();
  controller.ready(player);
  controller.select(video);
  controller.blocked();
  assert.equal(states.at(-1), 'blocked');
  controller.resume();
  assert.deepEqual(calls.at(-1), ['play']);
  controller.stateChanged(1);
  controller.pause();
  assert.deepEqual(calls.at(-1), ['pause']);
  assert.equal(states.at(-1), 'paused');
  controller.destroy();
});
test('stop cancels queued selection and ignores late playback events', () => {
  const {controller, player, calls, states} = setup();
  controller.select(video);
  controller.stop();
  controller.ready(player);
  controller.stateChanged(1);
  assert.equal(calls.some(c => c[0] === 'video'), false);
  assert.equal(states.at(-1), 'idle');
  controller.destroy();
});
test('playlist uses playlist API and embed errors are not reported as playing', () => {
  const {controller, player, calls, states} = setup();
  controller.ready(player);
  controller.select({type:'playlist', id:'PL123456789012', embedUrl:''});
  assert.deepEqual(calls.at(-1), ['playlist', {list:'PL123456789012', listType:'playlist'}]);
  controller.failed(150);
  assert.equal(states.at(-1), 'error');
  controller.destroy();
});
test('unmount during initialization destroys the late player without starting audio', () => {
  const {controller, player, calls} = setup();
  controller.select(video);
  controller.destroy();
  controller.ready(player);
  assert.deepEqual(calls, [['destroy']]);
});
