import { useEffect, useRef } from 'react';
import { useFxStore, type Burst } from '@/store/fxStore';
import { ROLE_COLOR } from '@/visual/roles';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: 0 | 1;
}

const MAX_PARTICLES = 420;
const GRAVITY = 1180;

/**
 * One canvas for every particle effect in the app (completion confetti, insert
 * sparkles, ripple bursts). It owns its own rAF loop, only runs while
 * particles are alive, and sizes its backing store to devicePixelRatio so the
 * shards stay crisp.
 *
 * Mounted once at the shell level, `pointer-events: none`, so bursts can never
 * interfere with dragging nodes or scrubber input.
 */
export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (burst: {
      x: number;
      y: number;
      count: number;
      power: number;
      colors: readonly string[];
    }): void => {
      const originX = burst.x * window.innerWidth;
      const originY = burst.y * window.innerHeight;
      const room = MAX_PARTICLES - particles.current.length;
      const count = Math.max(0, Math.min(burst.count, room));

      for (let i = 0; i < count; i += 1) {
        // Slight upward bias so the burst reads as an explosion, not a puddle.
        const angle = (Math.PI * (1.08 + Math.random() * 0.84)) * (Math.random() < 0.5 ? 1 : -1) * 0.5 + Math.PI * 1.5;
        const speed = burst.power * (0.35 + Math.random() * 0.85);
        const life = 0.7 + Math.random() * 0.9;
        particles.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed * (0.4 + Math.random() * 0.8),
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: 3 + Math.random() * 5,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 12,
          color: burst.colors[Math.floor(Math.random() * burst.colors.length)] ?? ROLE_COLOR.sorted,
          shape: Math.random() < 0.35 ? 1 : 0,
        });
      }
      ensureLoop();
    };

    const tick = (now: number): void => {
      const delta = Math.min((now - (last.current || now)) / 1000, 0.05);
      last.current = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life -= delta;
        if (p.life <= 0) continue;
        p.vy += GRAVITY * delta;
        p.vx *= 1 - 0.9 * delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.rotation += p.spin * delta;
        alive.push(p);

        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      particles.current = alive;

      if (alive.length > 0) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = null;
        last.current = 0;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const ensureLoop = (): void => {
      if (frame.current === null) {
        last.current = 0;
        frame.current = requestAnimationFrame(tick);
      }
    };

    /**
     * Consume the fx mailbox. We read (rather than drain) inside the listener:
     * writing to the store from a subscriber would re-enter the notification
     * loop. `lastSeenId` makes replays impossible even if the queue is capped.
     */
    let lastSeenId = 0;
    const consume = (queue: readonly Burst[]): void => {
      for (const burst of queue) {
        if (burst.id <= lastSeenId) continue;
        lastSeenId = burst.id;
        spawn(burst);
      }
    };

    const initial = useFxStore.getState();
    if (!initial.reducedMotion) consume(initial.queue);
    const unsubscribe = useFxStore.subscribe((state) => {
      if (state.reducedMotion) return;
      consume(state.queue);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('resize', resize);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      particles.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80]"
    />
  );
}
