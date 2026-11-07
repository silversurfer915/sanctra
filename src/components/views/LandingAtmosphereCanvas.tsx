import { useEffect, useRef } from 'react';

interface BokehOrb {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  baseAlpha: number;
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

    // 1. Soft Distant Bokeh Orbs (Streetlights & Candlelight seen through rain-blurred window)
    const bokehColors = [
      '245, 158, 11',   // Warm amber streetlight
      '253, 230, 138',  // Soft champagne glow
      '251, 146, 60',   // Cozy fireplace orange
      '14, 165, 233',   // Distant cyan neon
      '168, 85, 247',   // Twilight wisteria
    ];

    const bokehCount = Math.min(18, Math.max(10, Math.floor((width * height) / 80000)));
    const bokehOrbs: BokehOrb[] = [];
    for (let i = 0; i < bokehCount; i++) {
      const baseR = 50 + Math.random() * 85;
      const baseA = 0.025 + Math.random() * 0.045;
      bokehOrbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius: baseR,
        radius: baseR,
        baseAlpha: baseA,
        alpha: baseA,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        pulseSpeed: 0.4 + Math.random() * 0.8,
        pulsePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.06,
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

      // A. Warm Amber Desk Corona Glow (Centered behind the desk dial)
      const centerX = width * 0.5;
      const centerY = height * 0.42;
      const breathPhase = Math.sin(time * 0.0008); // Relaxed ~7.8s breathing period
      const breathRadius = 320 + breathPhase * 45;
      const breathAlpha = 0.12 + breathPhase * 0.03;

      const solarGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, breathRadius);
      solarGrad.addColorStop(0, `rgba(229, 184, 105, ${breathAlpha})`);
      solarGrad.addColorStop(0.4, `rgba(245, 158, 11, ${breathAlpha * 0.45})`);
      solarGrad.addColorStop(0.75, `rgba(14, 165, 233, ${breathAlpha * 0.18})`);
      solarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = solarGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, breathRadius, 0, Math.PI * 2);
      ctx.fill();

      // B. Warm Out-of-Focus Streetlamp Bokeh Lights
      for (const orb of bokehOrbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        const pulse = Math.sin(time * 0.001 * orb.pulseSpeed + orb.pulsePhase);
        orb.radius = orb.baseRadius * (0.92 + pulse * 0.15);
        orb.alpha = Math.max(0.015, orb.baseAlpha * (0.85 + pulse * 0.3));

        const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        orbGrad.addColorStop(0, `rgba(${orb.color}, ${orb.alpha})`);
        orbGrad.addColorStop(0.5, `rgba(${orb.color}, ${orb.alpha * 0.45})`);
        orbGrad.addColorStop(1, `rgba(${orb.color}, 0)`);

        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
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
