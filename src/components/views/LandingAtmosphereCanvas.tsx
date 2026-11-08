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

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  slant: number;
  width: number;
  layer: 'bg' | 'fg';
}

interface GlassDroplet {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  trailLength: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function LandingAtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 1. Delicate Celestial Starlight Dust Spores (clean, non-muddy luminous dust)
    const starlightColors = [
      '240, 245, 255', // Pure crystalline white
      '215, 230, 255', // Soft celestial blue
      '255, 244, 225', // Warm starlight gold
    ];

    const dustCount = Math.min(28, Math.max(16, Math.floor((width * height) / 55000)));
    const starlightParticles: StarlightDust[] = [];
    for (let i = 0; i < dustCount; i++) {
      const r = 1.0 + Math.random() * 1.6;
      const baseA = 0.18 + Math.random() * 0.35;
      starlightParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: r,
        baseAlpha: baseA,
        alpha: baseA,
        color: starlightColors[Math.floor(Math.random() * starlightColors.length)],
        pulseSpeed: 0.8 + Math.random() * 1.4,
        pulsePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.04 - Math.random() * 0.06, // subtle upward drift
      });
    }

    // 2. Multi-layered Atmospheric Rain (Distant Drizzle + Foreground Silky Streaks)
    const rainDrops: RainDrop[] = [];
    const totalRainCount = Math.min(130, Math.max(70, Math.floor((width * height) / 14000)));

    for (let i = 0; i < totalRainCount; i++) {
      const isForeground = Math.random() > 0.4;
      rainDrops.push({
        x: Math.random() * (width + 300) - 150,
        y: Math.random() * height,
        length: isForeground ? 50 + Math.random() * 60 : 25 + Math.random() * 35,
        speed: isForeground ? 16 + Math.random() * 12 : 9 + Math.random() * 6,
        alpha: isForeground ? 0.16 + Math.random() * 0.22 : 0.06 + Math.random() * 0.10,
        slant: -0.16, // Gentle diagonal slant matching natural wind
        width: isForeground ? 0.9 + Math.random() * 0.6 : 0.5 + Math.random() * 0.4,
        layer: isForeground ? 'fg' : 'bg',
      });
    }

    // 3. Condensation Water Droplets Trickling Down Glass
    const glassDroplets: GlassDroplet[] = [];
    const dropletCount = Math.min(22, Math.max(10, Math.floor((width * height) / 60000)));
    for (let i = 0; i < dropletCount; i++) {
      glassDroplets.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.2 + Math.random() * 1.8,
        speed: 0.4 + Math.random() * 1.2,
        alpha: 0.18 + Math.random() * 0.32,
        trailLength: 15 + Math.random() * 25,
      });
    }

    // 4. Interactive Rain Ripples on Click / Hover
    const ripples: Ripple[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;

      // Subtle water ripple when sweeping across glass
      if (Math.random() < 0.12) {
        ripples.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          radius: 2,
          maxRadius: 40 + Math.random() * 30,
          alpha: 0.35,
        });
      }
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Rain drop splash ripple
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 2,
        maxRadius: 100,
        alpha: 0.6,
      });
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 2,
        maxRadius: 60,
        alpha: 0.4,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerdown', handlePointerDown);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Luminous Starlight Dust Spores (clean, non-muddy twinkling micro-points)
      for (const p of starlightParticles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const pulse = Math.sin(time * 0.001 * p.pulseSpeed + p.pulsePhase);
        const currentAlpha = Math.max(0.08, p.baseAlpha * (0.75 + pulse * 0.35));

        // Core bright star point
        ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle soft outer shimmer
        if (p.radius > 1.4) {
          ctx.fillStyle = `rgba(${p.color}, ${currentAlpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // C. Background Soft Rain Mist
      for (const drop of rainDrops) {
        if (drop.layer !== 'bg') continue;
        drop.y += drop.speed;
        drop.x += drop.speed * drop.slant;

        if (drop.y > height + 50 || drop.x < -150) {
          drop.y = -drop.length - Math.random() * 80;
          drop.x = Math.random() * (width + 250);
        }

        const streakGrad = ctx.createLinearGradient(
          drop.x,
          drop.y,
          drop.x + drop.length * drop.slant,
          drop.y + drop.length
        );
        streakGrad.addColorStop(0, 'rgba(180, 215, 255, 0)');
        streakGrad.addColorStop(0.8, `rgba(205, 230, 255, ${drop.alpha * 0.5})`);
        streakGrad.addColorStop(1, `rgba(235, 248, 255, ${drop.alpha})`);

        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = drop.width;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.length * drop.slant, drop.y + drop.length);
        ctx.stroke();
      }

      // D. Foreground Silky Rain Streaks
      for (const drop of rainDrops) {
        if (drop.layer !== 'fg') continue;
        drop.y += drop.speed;
        drop.x += drop.speed * drop.slant;

        if (drop.y > height + 80 || drop.x < -150) {
          drop.y = -drop.length - Math.random() * 100;
          drop.x = Math.random() * (width + 300);
        }

        const streakGrad = ctx.createLinearGradient(
          drop.x,
          drop.y,
          drop.x + drop.length * drop.slant,
          drop.y + drop.length
        );
        streakGrad.addColorStop(0, 'rgba(160, 205, 250, 0)');
        streakGrad.addColorStop(0.7, `rgba(215, 235, 255, ${drop.alpha * 0.6})`);
        streakGrad.addColorStop(1, `rgba(245, 250, 255, ${drop.alpha})`);

        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = drop.width;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.length * drop.slant, drop.y + drop.length);
        ctx.stroke();
      }

      // E. Water Droplets Slowly Trickling on Window Glass
      for (const drop of glassDroplets) {
        drop.y += drop.speed;
        if (drop.y > height + 30) {
          drop.y = -20;
          drop.x = Math.random() * width;
        }

        // Faint trickle trail
        const trailGrad = ctx.createLinearGradient(drop.x, drop.y - drop.trailLength, drop.x, drop.y);
        trailGrad.addColorStop(0, 'rgba(215, 235, 255, 0)');
        trailGrad.addColorStop(1, `rgba(225, 240, 255, ${drop.alpha * 0.35})`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = drop.radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - drop.trailLength);
        ctx.lineTo(drop.x, drop.y);
        ctx.stroke();

        // Droplet head bead
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 245, 255, ${drop.alpha})`;
        ctx.fill();
      }

      // F. Dynamic Water Ripples on Glass
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 55 * dt;
        r.alpha -= 0.6 * dt;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(210, 235, 255, ${r.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto cursor-crosshair opacity-90 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
}
