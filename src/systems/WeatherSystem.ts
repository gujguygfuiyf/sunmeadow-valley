import type { SeasonId } from '../data/crops';
import type { WeatherKind } from '../data/fish';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  sunny: '晴朗 ☀',
  breezy: '微风 ✿',
  rainy: '细雨 ☂',
  stormy: '雷雨 ⚡',
};

const WEATHER_FORECAST_DESCS: Record<WeatherKind, string> = {
  sunny: '明日将是万里无云的好晴天！记得早起给作物浇水，阳光鱼在晴天也格外活跃。',
  breezy: '明日清风徐徐、花瓣飘扬，是逛晨露小镇与村民聊天散步的绝佳天气！',
  rainy: '明日有充沛春/夏/秋雨降临！全农场耕地将自动湿润无需浇水，正是挖矿和钓大鲶鱼的好时机！',
  stormy: '明日将有雷阵雨光顾山谷！所有农田自动浇水，雷雨天记得多去矿洞或室内烹饪哦。',
};

const DAILY_FARMING_TIPS = [
  '【农耕频道】在农场摆放【稻草人】可保护周围 5 格内的作物免受夜间乌鸦偷吃！',
  '【工匠频道】把草莓或金黄南瓜放进【果酱桶】或【酿酒桶】，收益直接翻倍以上！',
  '【矿业频道】把矿石投入【石砌熔炉】熔成金属锭，去找铁匠克林特就能升级大范围农具！',
  '【牧场频道】每天抚摸鸡舍和畜棚的小动物，它们开心就会持续产出鸡蛋、鲜奶和羊毛！',
  '【垂钓频道】雨天在水塘或小镇河岸甩竿，有机会钓到稀有的【雨季大鲶鱼】和【黄金锦鲤】！',
  '【社区频道】完成社区中心【春季丰收收集包】即可修复四季温室，让四季作物全年生长！',
];

/**
 * Manages daily weather, tomorrow's TV forecast, auto-watering logic,
 * and screen-space rain / drifting petals / winter snow / lightning visuals.
 */
export class WeatherSystem {
  today: WeatherKind = 'sunny';
  tomorrow: WeatherKind = 'breezy';

  private particles: WeatherParticle[] = [];
  private lightningTimer = 7;
  private lightningFlashAlpha = 0;

  isRainy(): boolean {
    return this.today === 'rainy' || this.today === 'stormy';
  }

  getLabel(kind: WeatherKind = this.today): string {
    return WEATHER_LABELS[kind];
  }

  getForecastDescription(season: SeasonId): string {
    if (season === 'winter' && (this.tomorrow === 'rainy' || this.tomorrow === 'stormy')) {
      return '明日将飘起浪漫大雪！雪水会滋润冬季作物，出门挖矿或烤火都很惬意。';
    }
    return WEATHER_FORECAST_DESCS[this.tomorrow];
  }

  getDailyTip(day: number): string {
    return DAILY_FARMING_TIPS[(day - 1) % DAILY_FARMING_TIPS.length];
  }

  /** Rolls tomorrow's weather into today and forecasts the next day. */
  advanceDay(season: SeasonId, rng: () => number = Math.random): WeatherKind {
    this.today = this.tomorrow;
    this.tomorrow = this.rollWeather(season, rng);
    this.particles = [];
    return this.today;
  }

  rollWeather(season: SeasonId, rng: () => number = Math.random): WeatherKind {
    const r = rng();
    if (season === 'spring') {
      if (r < 0.44) return 'sunny';
      if (r < 0.72) return 'breezy';
      if (r < 0.93) return 'rainy';
      return 'stormy';
    }
    if (season === 'summer') {
      if (r < 0.56) return 'sunny';
      if (r < 0.72) return 'breezy';
      if (r < 0.86) return 'rainy';
      return 'stormy';
    }
    if (season === 'fall') {
      if (r < 0.42) return 'sunny';
      if (r < 0.75) return 'breezy';
      if (r < 0.94) return 'rainy';
      return 'stormy';
    }
    // Winter: calm crisp days & snowy days
    if (r < 0.5) return 'sunny';
    if (r < 0.78) return 'breezy';
    return 'rainy';
  }

  update(dt: number, viewportW: number, viewportH: number, season: SeasonId): void {
    const desiredCount =
      this.today === 'stormy'
        ? 110
        : this.today === 'rainy'
          ? 75
          : this.today === 'breezy' || season === 'winter'
            ? 28
            : 0;

    while (this.particles.length < desiredCount) {
      this.particles.push(this.spawnParticle(viewportW, viewportH, season, true));
    }
    if (this.particles.length > desiredCount) {
      this.particles.length = desiredCount;
    }

    for (const p of this.particles) {
      p.phase += dt * 3;
      p.x += (p.vx + (this.isRainy() && season !== 'winter' ? 0 : Math.sin(p.phase) * 14)) * dt;
      p.y += p.vy * dt;

      if (p.y > viewportH + 10 || p.x < -15 || p.x > viewportW + 15) {
        Object.assign(p, this.spawnParticle(viewportW, viewportH, season, false));
      }
    }

    if (this.today === 'stormy' && season !== 'winter') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlashAlpha = 0.52;
        this.lightningTimer = 6 + Math.random() * 8;
      }
    }
    if (this.lightningFlashAlpha > 0) {
      this.lightningFlashAlpha = Math.max(0, this.lightningFlashAlpha - dt * 1.9);
    }
  }

  renderOutdoor(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    season: SeasonId
  ): void {
    if (this.today === 'rainy' || this.today === 'stormy') {
      if (season === 'winter') {
        // Gentle winter snowfall
        ctx.save();
        ctx.fillStyle = 'rgba(242, 250, 255, 0.88)';
        for (const p of this.particles) {
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        ctx.restore();
      } else {
        // Cool overcast rain tint + slanted pixel raindrops
        ctx.save();
        ctx.fillStyle =
          this.today === 'stormy' ? 'rgba(26, 40, 68, 0.24)' : 'rgba(42, 68, 98, 0.16)';
        ctx.fillRect(0, 0, viewportW, viewportH);

        ctx.strokeStyle = 'rgba(182, 224, 255, 0.72)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const p of this.particles) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 4, p.y + 11);
        }
        ctx.stroke();

        if (this.lightningFlashAlpha > 0.01) {
          ctx.fillStyle = `rgba(245, 250, 255, ${this.lightningFlashAlpha.toFixed(2)})`;
          ctx.fillRect(0, 0, viewportW, viewportH);
        }
        ctx.restore();
      }
      return;
    }

    // Breezy seasonal petals / golden leaves / snow flurries
    if (this.particles.length > 0) {
      ctx.save();
      ctx.fillStyle =
        season === 'spring'
          ? 'rgba(255, 196, 218, 0.85)'
          : season === 'fall'
            ? 'rgba(235, 134, 48, 0.88)'
            : season === 'winter'
              ? 'rgba(240, 249, 255, 0.85)'
              : 'rgba(255, 245, 165, 0.78)';
      for (const p of this.particles) {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size + 1, p.size);
      }
      ctx.restore();
    }
  }

  load(today?: WeatherKind, tomorrow?: WeatherKind): void {
    this.today = today ?? 'sunny';
    this.tomorrow = tomorrow ?? 'breezy';
    this.particles = [];
  }

  reset(): void {
    this.today = 'sunny';
    this.tomorrow = 'breezy';
    this.particles = [];
    this.lightningFlashAlpha = 0;
  }

  private spawnParticle(
    w: number,
    h: number,
    season: SeasonId,
    randomY: boolean
  ): WeatherParticle {
    const isRain = (this.today === 'rainy' || this.today === 'stormy') && season !== 'winter';
    return {
      x: Math.random() * (w + 60) - 20,
      y: randomY ? Math.random() * h : -12,
      vx: isRain ? -95 : 22 + Math.random() * 18,
      vy: isRain ? 310 + Math.random() * 90 : 34 + Math.random() * 24,
      size: isRain ? 2 : 3 + Math.floor(Math.random() * 2),
      phase: Math.random() * Math.PI * 2,
    };
  }
}
