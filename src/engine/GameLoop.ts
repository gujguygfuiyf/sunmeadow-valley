export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

/**
 * Fixed-timestep simulation loop with clamped delta time.
 * Keeps movement, animations, and timers consistent across 60Hz/120Hz/144Hz monitors.
 */
export class GameLoop {
  private readonly fixedDt: number;
  private readonly maxFrameTime: number;
  private readonly callbacks: LoopCallbacks;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private accumulator = 0;
  private paused = false;

  constructor(callbacks: LoopCallbacks, targetFps = 60) {
    this.callbacks = callbacks;
    this.fixedDt = 1 / targetFps;
    this.maxFrameTime = 0.1;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.lastTimestamp = performance.now();
      this.accumulator = 0;
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  private tick = (timestamp: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (!this.paused) {
      const clampedDt = Math.min(Math.max(rawDt, 0), this.maxFrameTime);
      this.accumulator += clampedDt;

      while (this.accumulator >= this.fixedDt) {
        this.callbacks.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
    }

    const alpha = this.accumulator / this.fixedDt;
    this.callbacks.render(alpha);
  };
}
