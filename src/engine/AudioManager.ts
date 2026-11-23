import type { SeasonId } from '../data/crops';

export type SoundEffect =
  | 'hoe'
  | 'plant'
  | 'water'
  | 'refill'
  | 'harvest'
  | 'coin'
  | 'sleep'
  | 'ui'
  | 'chop'
  | 'mine'
  | 'slash'
  | 'hurt'
  | 'cast'
  | 'bite'
  | 'catch'
  | 'craft'
  | 'pet'
  | 'upgrade'
  | 'bundle';

const SEASON_MELODIES: Record<SeasonId, number[]> = {
  // Cozy warm C-major pentatonic spring pastoral tune
  spring: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0, 440.0, 523.25, 659.25, 587.33],
  // Bright lively G-major summer meadow melody
  summer: [392.0, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 587.33, 659.25, 783.99, 880.0, 587.33],
  // Nostalgic warm D-minor / F-major autumn waltz
  fall: [440.0, 523.25, 587.33, 659.25, 523.25, 440.0, 349.23, 392.0, 440.0, 523.25, 440.0, 392.0],
  // Crystalline delicate winter music-box notes
  winter: [659.25, 587.33, 523.25, 783.99, 659.25, 523.25, 493.88, 523.25, 587.33, 659.25, 523.25, 392.0],
};

/**
 * Zero-dependency Web Audio retro synthesizer + seasonal pastoral BGM & ambience engine.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmEnabled = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private currentSeason: SeasonId = 'spring';

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopBgmLoop();
    } else if (this.bgmEnabled) {
      this.startBgmLoop();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled && !this.muted) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  setSeason(season: SeasonId): void {
    this.currentSeason = season;
  }

  play(effect: SoundEffect): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (effect) {
      case 'hoe':
        this.playTone(ctx, 'triangle', 150, 72, now, 0.09, 0.14);
        this.playNoise(ctx, now, 0.06, 0.08);
        break;
      case 'plant':
        this.playTone(ctx, 'sine', 340, 520, now, 0.08, 0.11);
        break;
      case 'water':
        this.playTone(ctx, 'sine', 420, 680, now, 0.09, 0.08);
        this.playTone(ctx, 'sine', 540, 320, now + 0.05, 0.08, 0.07);
        break;
      case 'refill':
        this.playTone(ctx, 'sine', 310, 620, now, 0.14, 0.1);
        this.playTone(ctx, 'sine', 460, 780, now + 0.08, 0.14, 0.09);
        break;
      case 'harvest':
        this.playTone(ctx, 'triangle', 523.25, 659.25, now, 0.09, 0.11);
        this.playTone(ctx, 'triangle', 659.25, 783.99, now + 0.07, 0.12, 0.11);
        break;
      case 'coin':
        this.playTone(ctx, 'square', 880, 1174.66, now, 0.07, 0.06);
        this.playTone(ctx, 'square', 1174.66, 1567.98, now + 0.06, 0.12, 0.06);
        break;
      case 'sleep':
        this.playTone(ctx, 'sine', 392, 392, now, 0.16, 0.08);
        this.playTone(ctx, 'sine', 493.88, 493.88, now + 0.14, 0.16, 0.08);
        this.playTone(ctx, 'sine', 587.33, 587.33, now + 0.28, 0.28, 0.09);
        break;
      case 'ui':
        this.playTone(ctx, 'triangle', 480, 560, now, 0.05, 0.06);
        break;
      case 'chop':
        this.playTone(ctx, 'triangle', 175, 90, now, 0.09, 0.16);
        this.playNoise(ctx, now, 0.05, 0.1);
        break;
      case 'mine':
        this.playTone(ctx, 'square', 680, 320, now, 0.08, 0.07);
        this.playNoise(ctx, now, 0.05, 0.08);
        break;
      case 'slash':
        this.playTone(ctx, 'sawtooth', 420, 180, now, 0.09, 0.06);
        break;
      case 'hurt':
        this.playTone(ctx, 'sawtooth', 190, 95, now, 0.16, 0.11);
        break;
      case 'cast':
        this.playTone(ctx, 'sine', 280, 620, now, 0.14, 0.08);
        break;
      case 'bite':
        this.playTone(ctx, 'square', 740, 987, now, 0.09, 0.08);
        this.playTone(ctx, 'square', 987, 1318, now + 0.08, 0.11, 0.08);
        break;
      case 'catch':
        this.playTone(ctx, 'triangle', 523.25, 659.25, now, 0.09, 0.11);
        this.playTone(ctx, 'triangle', 659.25, 783.99, now + 0.08, 0.09, 0.11);
        this.playTone(ctx, 'triangle', 783.99, 1046.5, now + 0.16, 0.18, 0.12);
        break;
      case 'craft':
        this.playTone(ctx, 'triangle', 330, 440, now, 0.08, 0.1);
        this.playTone(ctx, 'triangle', 440, 660, now + 0.07, 0.11, 0.1);
        break;
      case 'pet':
        this.playTone(ctx, 'sine', 587.33, 880, now, 0.12, 0.09);
        break;
      case 'upgrade':
        this.playTone(ctx, 'square', 440, 554.37, now, 0.09, 0.07);
        this.playTone(ctx, 'square', 554.37, 659.25, now + 0.09, 0.09, 0.07);
        this.playTone(ctx, 'square', 659.25, 880, now + 0.18, 0.22, 0.08);
        break;
      case 'bundle':
        this.playTone(ctx, 'triangle', 523.25, 523.25, now, 0.12, 0.1);
        this.playTone(ctx, 'triangle', 659.25, 659.25, now + 0.11, 0.12, 0.1);
        this.playTone(ctx, 'triangle', 783.99, 783.99, now + 0.22, 0.12, 0.1);
        this.playTone(ctx, 'triangle', 1046.5, 1046.5, now + 0.33, 0.32, 0.12);
        break;
    }
  }

  private startBgmLoop(): void {
    if (this.bgmTimer !== null || typeof window === 'undefined') return;
    this.bgmTimer = window.setInterval(() => {
      if (this.muted || !this.bgmEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;

      const melody = SEASON_MELODIES[this.currentSeason];
      const freq = melody[this.bgmStep % melody.length];
      const now = ctx.currentTime;

      // Soft plucked pastoral chime
      this.playTone(ctx, 'triangle', freq, freq * 0.996, now, 0.36, 0.028);
      // Warm gentle bass accompaniment every 3rd beat
      if (this.bgmStep % 3 === 0) {
        this.playTone(ctx, 'sine', freq * 0.5, freq * 0.5, now, 0.52, 0.022);
      }
      this.bgmStep += 1;
    }, 460);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playNoise(ctx: AudioContext, startTime: number, duration: number, volume: number): void {
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
  }
}
