import type { SeasonId } from '../data/crops';
import { rollFishCatch, type FishDefinition, type WeatherKind } from '../data/fish';

export type FishingPhase = 'idle' | 'waiting' | 'reeling';

export interface FishingOutcome {
  status: 'ongoing' | 'caught' | 'escaped';
  fish?: FishDefinition;
}

/**
 * Authentic Stardew-style Fishing Mini-Game engine:
 * - Cast bobber -> short suspense wait -> Bite! -> Vertical green catch-bar chase!
 * - Bar moves with inertia, gravity, and soft bottom bounce when player holds Space / Mouse.
 */
export class FishingSystem {
  phase: FishingPhase = 'idle';
  targetFish: FishDefinition | null = null;

  /** Wait timer before bite occurs (seconds) */
  waitTimer = 0;

  /** Vertical coordinates normalized to [0..1] where 0 = bottom, 1 = top */
  barPos = 0.25;
  barVel = 0;
  readonly barHeight = 0.28;

  fishPos = 0.35;
  fishTarget = 0.5;
  fishMoveTimer = 0;

  /** Progress meter [0..1]; starts at 0.28, catch at 1.0, escape at 0.0 */
  progress = 0.28;

  isActive(): boolean {
    return this.phase !== 'idle';
  }

  startCast(season: SeasonId, weather: WeatherKind, rng: () => number = Math.random): void {
    this.targetFish = rollFishCatch(season, weather, rng);
    this.phase = 'waiting';
    this.waitTimer = 0.8 + rng() * 1.1;
    this.barPos = 0.22;
    this.barVel = 0;
    this.fishPos = 0.32;
    this.fishTarget = 0.55;
    this.fishMoveTimer = 0.7;
    this.progress = 0.3;
  }

  cancel(): void {
    this.phase = 'idle';
    this.targetFish = null;
  }

  update(dt: number, reelHeld: boolean, rng: () => number = Math.random): {
    justBit: boolean;
    outcome: FishingOutcome;
  } {
    if (this.phase === 'idle' || !this.targetFish) {
      return { justBit: false, outcome: { status: 'ongoing' } };
    }

    if (this.phase === 'waiting') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.phase = 'reeling';
        return { justBit: true, outcome: { status: 'ongoing' } };
      }
      return { justBit: false, outcome: { status: 'ongoing' } };
    }

    // Reeling physics
    const accel = reelHeld ? 2.55 : -2.15;
    this.barVel += accel * dt;
    this.barVel = Math.max(-1.45, Math.min(1.45, this.barVel));
    this.barPos += this.barVel * dt;

    const maxBarBottom = 1 - this.barHeight;
    if (this.barPos < 0) {
      this.barPos = 0;
      this.barVel = Math.abs(this.barVel) * 0.28; // soft bottom bounce
    } else if (this.barPos > maxBarBottom) {
      this.barPos = maxBarBottom;
      this.barVel = 0;
    }

    // Fish AI movement scaled by difficulty
    const diff = this.targetFish.difficulty;
    this.fishMoveTimer -= dt;
    if (this.fishMoveTimer <= 0) {
      this.fishMoveTimer = Math.max(0.35, 1.35 - diff * 0.2) + rng() * 0.5;
      const maxJump = Math.min(0.85, 0.22 + diff * 0.14);
      const next = this.fishPos + (rng() * 2 - 1) * maxJump;
      this.fishTarget = Math.max(0.06, Math.min(0.94, next));
    }

    const fishSpeed = 0.32 + diff * 0.14;
    const delta = this.fishTarget - this.fishPos;
    const step = Math.sign(delta) * Math.min(Math.abs(delta), fishSpeed * dt);
    this.fishPos += step;

    // Check overlap
    const inside =
      this.fishPos >= this.barPos - 0.03 &&
      this.fishPos <= this.barPos + this.barHeight + 0.03;

    if (inside) {
      this.progress = Math.min(1, this.progress + dt * 0.34);
    } else {
      this.progress = Math.max(0, this.progress - dt * (0.14 + diff * 0.025));
    }

    if (this.progress >= 1) {
      const caught = this.targetFish;
      this.phase = 'idle';
      this.targetFish = null;
      return { justBit: false, outcome: { status: 'caught', fish: caught } };
    }

    if (this.progress <= 0) {
      const escaped = this.targetFish;
      this.phase = 'idle';
      this.targetFish = null;
      return { justBit: false, outcome: { status: 'escaped', fish: escaped } };
    }

    return { justBit: false, outcome: { status: 'ongoing' } };
  }
}
