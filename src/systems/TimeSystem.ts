import { SEASON_LABELS, SEASON_ORDER, type SeasonId } from '../data/crops';

export interface AmbientLightState {
  color: string;
  alpha: number;
}

const DAYS_PER_SEASON = 28;
const START_OF_DAY_MINUTES = 6 * 60; // 06:00
const END_OF_DAY_MINUTES = 24 * 60; // 24:00

export const FESTIVAL_DAY = 14;

export const SEASON_FESTIVALS: Record<SeasonId, string> = {
  spring: '春季花舞节',
  summer: '夏日篝火节',
  fall: '晨露展览会',
  winter: '冬日星光夜',
};

/**
 * Manages calendar days, 4-season rotation, seasonal festivals,
 * daylight clock, and golden-hour / dusk ambient color grading.
 */
export class TimeSystem {
  day = 1;
  seasonIndex = 0;
  minutes = START_OF_DAY_MINUTES;

  private readonly minutesPerSecond = 1.4;
  private minuteAccumulator = 0;

  get seasonId(): SeasonId {
    return SEASON_ORDER[this.seasonIndex] ?? 'spring';
  }

  get season(): string {
    return SEASON_LABELS[this.seasonId];
  }

  get hour(): number {
    return Math.floor(this.minutes / 60);
  }

  getTodayFestival(): string | null {
    return this.day === FESTIVAL_DAY ? SEASON_FESTIVALS[this.seasonId] : null;
  }

  getTomorrowFestival(): string | null {
    return this.day + 1 === FESTIVAL_DAY ? SEASON_FESTIVALS[this.seasonId] : null;
  }

  /** Returns true whenever the displayed minute clock ticks forward. */
  update(dt: number): boolean {
    if (this.minutes >= END_OF_DAY_MINUTES) return false;

    this.minuteAccumulator += dt * this.minutesPerSecond;
    if (this.minuteAccumulator >= 1) {
      const step = Math.floor(this.minuteAccumulator);
      this.minuteAccumulator -= step;
      this.minutes = Math.min(END_OF_DAY_MINUTES, this.minutes + step);
      return true;
    }
    return false;
  }

  /**
   * Advances to 06:00 the next morning.
   * Returns `{ seasonChanged: true }` when rolling over to a new season.
   */
  advanceToNextMorning(): { seasonChanged: boolean; newSeason: SeasonId } {
    this.day += 1;
    let seasonChanged = false;
    if (this.day > DAYS_PER_SEASON) {
      this.day = 1;
      this.seasonIndex = (this.seasonIndex + 1) % SEASON_ORDER.length;
      seasonChanged = true;
    }
    this.minutes = START_OF_DAY_MINUTES;
    this.minuteAccumulator = 0;
    return { seasonChanged, newSeason: this.seasonId };
  }

  getFormattedClock(): string {
    const snapped = Math.floor(this.minutes / 10) * 10;
    const h = Math.floor(snapped / 60);
    const m = snapped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  getDayPhaseLabel(): string {
    const h = this.minutes / 60;
    if (h < 9) return '清晨';
    if (h < 12) return '上午';
    if (h < 17) return '午后';
    if (h < 20) return '傍晚';
    return '夜晚';
  }

  getAmbientLight(): AmbientLightState {
    const h = this.minutes / 60;
    if (h < 7.5) {
      const t = 1 - (h - 6) / 1.5;
      return { color: 'rgba(255, 214, 150, 1)', alpha: Math.max(0, t * 0.14) };
    }
    if (h < 16.5) {
      return { color: 'rgba(255, 255, 255, 0)', alpha: 0 };
    }
    if (h < 19.5) {
      const t = (h - 16.5) / 3;
      return { color: 'rgba(235, 132, 62, 1)', alpha: t * 0.24 };
    }
    const t = Math.min(1, (h - 19.5) / 3.5);
    return { color: 'rgba(24, 34, 72, 1)', alpha: 0.22 + t * 0.34 };
  }

  load(day: number, seasonLabelOrId: string, minutes: number): void {
    this.day = Math.max(1, Math.min(DAYS_PER_SEASON, Math.floor(day)));
    const byId = SEASON_ORDER.indexOf(seasonLabelOrId as SeasonId);
    if (byId >= 0) {
      this.seasonIndex = byId;
    } else {
      const byLabel = SEASON_ORDER.findIndex((id) => SEASON_LABELS[id] === seasonLabelOrId);
      this.seasonIndex = byLabel >= 0 ? byLabel : 0;
    }
    this.minutes = Math.max(START_OF_DAY_MINUTES, Math.min(END_OF_DAY_MINUTES, minutes));
    this.minuteAccumulator = 0;
  }

  reset(): void {
    this.day = 1;
    this.seasonIndex = 0;
    this.minutes = START_OF_DAY_MINUTES;
    this.minuteAccumulator = 0;
  }
}
