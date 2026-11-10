import { useEffect, useRef } from "react";
import { useSettings } from "../store/settings";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  rot: number;
  vr: number;
  alpha: number;
};

export function Particles() {
  const kind = useSettings((s) => s.particles);
  const count = useSettings((s) => s.particleCount);
  const speed = useSettings((s) => s.particleSpeed);
  const size = useSettings((s) => s.particleSize);
  const colorEnabled = useSettings((s) => s.particleColorEnabled);
  const color = useSettings((s) => s.particleColor);
  const parallax = useSettings((s) => s.particleParallax);
  const image = useSettings((s) => s.particleImage);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (kind === "off" || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let last = performance.now();
    const mouse = { x: width / 2, y: height / 2 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let tint = color;
    if (!colorEnabled) {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      tint = accent || "#ffffff";
    }

    let img: HTMLImageElement | null = null;
    if (image) {
      img = new Image();
      img.src = image;
    }

    const rnd = (min: number, max: number) => min + Math.random() * (max - min);
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: rnd(0, width),
      y: rnd(0, height),
      vx: kind === "rain" ? rnd(0.2, 0.7) : rnd(-0.22, 0.22),
      vy:
        kind === "rain"
          ? rnd(9, 16)
          : kind === "snow" || kind === "hearts" || kind === "sakura"
            ? rnd(0.4, 1.4)
            : rnd(-0.12, 0.12),
      r: rnd(0.6, 1.4) * size,
      phase: rnd(0, Math.PI * 2),
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-0.02, 0.02),
      alpha: rnd(0.3, 0.9),
    }));

    const drawHeart = (x: number, y: number, s: number, rot: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.3);
      ctx.bezierCurveTo(-s, -s * 0.5, -s * 0.4, -s * 1.2, 0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.4, -s * 1.2, s, -s * 0.5, 0, s * 0.3);
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 2.2, p.r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      ctx.clearRect(0, 0, width, height);
      const px = parallax ? (mouse.x - width / 2) * 0.012 : 0;
      const py = parallax ? (mouse.y - height / 2) * 0.012 : 0;
      ctx.save();
      ctx.translate(px, py);

      for (const p of particles) {
        p.phase += 0.02 * speed * dt;
        p.rot += p.vr * speed * dt;
        p.x += (p.vx + Math.sin(p.phase) * 0.18) * speed * dt;
        p.y += p.vy * speed * dt;
        p.alpha = 0.35 + Math.abs(Math.sin(p.phase)) * 0.55;

        if (kind === "network") {
          p.x += p.vx * 2 * dt;
          p.y += p.vy * 2 * dt;
        }

        if (p.y > height + 40) {
          p.y = -30;
          p.x = rnd(0, width);
        }
        if (p.y < -40) p.y = height + 30;
        if (p.x > width + 40) p.x = -30;
        if (p.x < -40) p.x = width + 30;

        ctx.globalAlpha = p.alpha;
        if (kind === "rain") {
          ctx.strokeStyle = tint;
          ctx.lineWidth = Math.max(1, p.r * 0.5);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + 14 + p.r * 4);
          ctx.stroke();
        } else if (kind === "hearts") {
          drawHeart(p.x, p.y, p.r * 3, p.rot, p.alpha);
        } else if (kind === "sakura") {
          drawPetal(p);
        } else if (kind === "fireflies") {
          ctx.shadowBlur = 14;
          ctx.shadowColor = tint;
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (kind === "stars") {
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === "network") {
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (kind === "network") {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 130) {
              ctx.globalAlpha = (1 - dist / 130) * 0.25;
              ctx.strokeStyle = tint;
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      if (img && img.complete && img.naturalWidth) {
        for (const p of particles) {
          const s = p.r * 7;
          ctx.globalAlpha = p.alpha * 0.8;
          ctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [kind, count, speed, size, colorEnabled, color, parallax, image]);

  if (kind === "off") return null;
  return <canvas ref={ref} className="particles" aria-hidden />;
}
