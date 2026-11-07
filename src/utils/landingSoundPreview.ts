// Lightweight procedural Web Audio engine for Landing Page Ambient Soundscapes
// Generates Gentle Rain, Beach Waves, Pine Forest, and Brown Noise in real-time without external assets.

let audioCtx: AudioContext | null = null;
let currentNodes: {
  gainNode: GainNode;
  stop: () => void;
} | null = null;
let activeSoundId: string | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAmbientSound(id: string): boolean {
  try {
    const ctx = getAudioContext();

    // If already playing this sound, toggle it off
    if (activeSoundId === id && currentNodes) {
      stopAmbientSound();
      return false;
    }

    // Stop any existing sound
    stopAmbientSound();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.5);
    masterGain.connect(ctx.destination);

    // Buffer length: 4 seconds of procedural audio
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let stopFn = () => {};

    if (id === 'brown') {
      // Brown noise: integrated white noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, ctx.currentTime);

      source.connect(filter);
      filter.connect(masterGain);
      source.start();

      stopFn = () => {
        try { source.stop(); } catch {}
      };
    } else if (id === 'rain') {
      // Rain: Pink/Brown noise base with high-frequency droplets
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.15;
        b2 = 0.85 * b2 + white * 0.3;
        // Occasional random gentle raindrop click
        const droplet = Math.random() < 0.002 ? (Math.random() * 0.4) : 0;
        data[i] = (b0 + b1 + b2) * 0.4 + droplet;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(0.8, ctx.currentTime);

      source.connect(filter);
      filter.connect(masterGain);
      source.start();

      stopFn = () => {
        try { source.stop(); } catch {}
      };
    } else if (id === 'ocean') {
      // Ocean Waves: Filtered noise with a slow swell LFO
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      const swellGain = ctx.createGain();
      swellGain.gain.setValueAtTime(0.3, ctx.currentTime);

      // Low frequency oscillator for ocean swell cycle (0.12 Hz = ~8s period)
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(swellGain.gain);

      source.connect(filter);
      filter.connect(swellGain);
      swellGain.connect(masterGain);

      lfo.start();
      source.start();

      stopFn = () => {
        try {
          lfo.stop();
          source.stop();
        } catch {}
      };
    } else {
      // Forest: Gentle wind rustle
      let b0 = 0, b1 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.96 * b0 + white * 0.1;
        b1 = 0.9 * b1 + white * 0.2;
        data[i] = (b0 + b1) * 0.35;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, ctx.currentTime);
      filter.Q.setValueAtTime(0.6, ctx.currentTime);

      source.connect(filter);
      filter.connect(masterGain);
      source.start();

      stopFn = () => {
        try { source.stop(); } catch {}
      };
    }

    currentNodes = {
      gainNode: masterGain,
      stop: () => {
        try {
          masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
          setTimeout(() => {
            stopFn();
          }, 350);
        } catch {
          stopFn();
        }
      },
    };
    activeSoundId = id;
    return true;
  } catch (err) {
    console.warn('Audio preview initialization skipped:', err);
    return false;
  }
}

export function stopAmbientSound() {
  if (currentNodes) {
    currentNodes.stop();
    currentNodes = null;
  }
  activeSoundId = null;
}

export function getActiveAmbientSoundId(): string | null {
  return activeSoundId;
}
