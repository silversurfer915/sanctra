import { useEffect, useRef } from 'react';

interface StarlightDust {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
  vx: number;
  vy: number;
}

/** Slow drifting dust motes above the landing backdrop. */
export function LandingAtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const starlightColors = ['240, 245, 255', '215, 230, 255', '255, 244, 225'];

    const dustCount = Math.min(28, Math.max(16, Math.floor((width * height) / 55000)));
    const starlightParticles: StarlightDust[] = [];
    for (let i = 0; i < dustCount; i++) {
      const radius = 1.0 + Math.random() * 1.6;
      const baseAlpha = 0.18 + Math.random() * 0.35;
      starlightParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        baseAlpha,
        alpha: baseAlpha,
        color: starlightColors[Math.floor(Math.random() * starlightColors.length)],
        pulseSpeed: 0.8 + Math.random() * 1.4,
        pulsePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.04 - Math.random() * 0.06,
      });
    }

    window.addEventListener('resize', resize);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (const p of starlightParticles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const pulse = Math.sin(time * 0.001 * p.pulseSpeed + p.pulsePhase);
        const currentAlpha = Math.max(0.08, p.baseAlpha * (0.75 + pulse * 0.35));

        ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.radius > 1.4) {
          ctx.fillStyle = `rgba(${p.color}, ${currentAlpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-90"
      aria-hidden="true"
    />
  );
}
