import {useEffect, useRef, useState} from 'react';
import './observatory-scene.css';

interface ObservatorySceneProps {
  paused?: boolean;
}

/**
 * Scenic video landing background.
 * Seamlessly loops the background video with high-definition poster fallback,
 * pauses on user toggle, respects prefers-reduced-motion, and pauses when tab is hidden.
 */
export function ObservatoryScene({paused = false}: ObservatorySceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = () => {
      if (document.visibilityState === 'visible' && !paused && !motionPreference.matches) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Auto-play was restricted or power-saver active; poster remains visible
            });
        }
      } else {
        video.pause();
        if (motionPreference.matches) setIsPlaying(false);
      }
    };

    const handlePlaying = () => {
      setIsPlaying(true);
    };

    // Guarantee seamless looping across browser engines
    const handleEnded = () => {
      if (!paused && !motionPreference.matches && document.visibilityState === 'visible') {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('visibilitychange', syncPlayback);
    motionPreference.addEventListener('change', syncPlayback);

    syncPlayback();

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('visibilitychange', syncPlayback);
      motionPreference.removeEventListener('change', syncPlayback);
    };
  }, [paused]);

  return (
    <div className={`observatory-scene ${paused ? 'is-paused' : ''}`} aria-hidden="true">
      <picture><source type="image/webp" srcSet="/backgrounds/landing-screen-poster.webp"/><img
        src="/backgrounds/landing-screen-poster.jpg"
        alt=""
        className={`observatory-poster ${isPlaying ? 'is-hidden' : ''}`}
        fetchPriority="high"
        decoding="sync"
      /></picture>
      <video
        ref={videoRef}
        className="observatory-video"
        src="/backgrounds/landing-screen.mp4"
        poster="/backgrounds/landing-screen-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      <div className="observatory-scrim" />
    </div>
  );
}
