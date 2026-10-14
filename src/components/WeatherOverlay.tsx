import React, { useEffect, useRef, useState } from 'react';

export interface WeatherOverlayProps {
  weatherType: 'rain' | 'mist' | 'lake';
  className?: string;
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({ weatherType, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isHidden = document.hidden;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Particles setup based on weatherType
    const width = () => canvas.width;
    const height = () => canvas.height;

    // Rain particles
    const rainDrops = Array.from({ length: 45 }, () => ({
      x: Math.random() * (window.innerWidth + 200) - 100,
      y: Math.random() * window.innerHeight,
      length: 12 + Math.random() * 16,
      speed: 4 + Math.random() * 3,
      opacity: 0.08 + Math.random() * 0.12,
    }));

    // Mist particles
    const mistClouds = Array.from({ length: 6 }, () => ({
      x: Math.random() * window.innerWidth,
      y: 0.2 * window.innerHeight + Math.random() * (0.6 * window.innerHeight),
      radius: 120 + Math.random() * 100,
      speedX: 0.15 + Math.random() * 0.25,
      opacity: 0.04 + Math.random() * 0.04,
    }));

    // Lake ripples
    const ripples = Array.from({ length: 4 }, (_, i) => ({
      x: window.innerWidth * (0.2 + 0.2 * i + Math.random() * 0.1),
      y: window.innerHeight * (0.6 + 0.08 * i + Math.random() * 0.1),
      radius: (i * 25) % 80,
      maxRadius: 75 + Math.random() * 35,
      speed: 0.3 + Math.random() * 0.2,
      opacity: 0.15,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      if (isHidden) return;
      const dt = Math.min((time - lastTime) / 16.67, 2); // capped delta
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (weatherType === 'rain') {
        ctx.lineWidth = 1.2;
        rainDrops.forEach(drop => {
          ctx.strokeStyle = `rgba(220, 235, 255, ${drop.opacity})`;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length);
          ctx.stroke();

          drop.y += drop.speed * dt;
          drop.x -= drop.speed * 0.2 * dt;
          if (drop.y > height()) {
            drop.y = -drop.length;
            drop.x = Math.random() * (width() + 200) - 100;
          }
        });
      } else if (weatherType === 'mist') {
        mistClouds.forEach(cloud => {
          const grad = ctx.createRadialGradient(
            cloud.x,
            cloud.y,
            0,
            cloud.x,
            cloud.y,
            cloud.radius
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${cloud.opacity})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
          ctx.fill();

          cloud.x += cloud.speedX * dt;
          if (cloud.x - cloud.radius > width()) {
            cloud.x = -cloud.radius;
            cloud.y = 0.2 * height() + Math.random() * (0.6 * height());
          }
        });
      } else if (weatherType === 'lake') {
        ripples.forEach(rip => {
          rip.radius += rip.speed * dt;
          const progress = rip.radius / rip.maxRadius;
          const currentOpacity = Math.max(0, (1 - progress) * rip.opacity);

          if (progress >= 1) {
            rip.radius = 2;
            rip.x = width() * (0.15 + Math.random() * 0.7);
            rip.y = height() * (0.55 + Math.random() * 0.35);
          }

          ctx.save();
          ctx.strokeStyle = `rgba(210, 240, 255, ${currentOpacity})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          // subtle horizontal squish for perspective
          ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [weatherType, reducedMotion]);

  if (reducedMotion) {
    // Subtle static atmosphere when motion is reduced
    return (
      <div
        className={`weather-overlay fixed inset-0 pointer-events-none select-none ${className}`}
        aria-hidden="true"
        style={{
          background:
            weatherType === 'rain'
              ? 'radial-gradient(ellipse at 50% 20%, rgba(100, 150, 220, 0.05), transparent 70%)'
              : weatherType === 'mist'
              ? 'radial-gradient(ellipse at 50% 60%, rgba(200, 220, 230, 0.06), transparent 60%)'
              : 'radial-gradient(ellipse at 50% 70%, rgba(120, 180, 210, 0.05), transparent 70%)',
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`weather-overlay fixed inset-0 pointer-events-none select-none z-[1] ${className}`}
      aria-hidden="true"
    />
  );
};
