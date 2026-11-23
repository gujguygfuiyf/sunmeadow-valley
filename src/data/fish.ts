import type { SeasonId } from './crops';

export type WeatherKind = 'sunny' | 'breezy' | 'rainy' | 'stormy';

export interface FishDefinition {
  id: string;
  itemId: string;
  name: string;
  /** Difficulty 1 (calm) .. 5 (darting legend) */
  difficulty: number;
  weight: number;
  seasons?: SeasonId[];
  weatherOnly?: WeatherKind[];
  description: string;
}

export const FISH_CATALOG: FishDefinition[] = [
  {
    id: 'carp',
    itemId: 'fish_carp',
    name: '田园鲤鱼',
    difficulty: 1.2,
    weight: 40,
    description: '平缓好钓，水塘与小镇河畔随处可见。',
  },
  {
    id: 'sunfish',
    itemId: 'fish_sunfish',
    name: '太阳鱼',
    difficulty: 2.0,
    weight: 30,
    weatherOnly: ['sunny', 'breezy'],
    description: '晴朗和微风天十分活跃的暖金色小鱼。',
  },
  {
    id: 'trout',
    itemId: 'fish_trout',
    name: '虹鳟鱼',
    difficulty: 2.8,
    weight: 22,
    description: '游速中等、花纹绚丽的美味淡水鳟鱼。',
  },
  {
    id: 'catfish',
    itemId: 'fish_catfish',
    name: '雨季大鲶鱼',
    difficulty: 3.8,
    weight: 28,
    weatherOnly: ['rainy', 'stormy'],
    description: '只在雨天和雷雨天咬钩的强力大鱼！',
  },
  {
    id: 'golden_koi',
    itemId: 'fish_golden_koi',
    name: '黄金锦鲤',
    difficulty: 4.5,
    weight: 9,
    description: '极为稀有的金色锦鲤，动作敏捷但回报丰厚。',
  },
];

export function rollFishCatch(
  season: SeasonId,
  weather: WeatherKind,
  rng: () => number = Math.random
): FishDefinition {
  const pool = FISH_CATALOG.filter((f) => {
    if (f.seasons && !f.seasons.includes(season)) return false;
    if (f.weatherOnly && !f.weatherOnly.includes(weather)) return false;
    return true;
  });

  const activePool = pool.length > 0 ? pool : [FISH_CATALOG[0]];
  const totalWeight = activePool.reduce((acc, f) => acc + f.weight, 0);
  let r = rng() * totalWeight;
  for (const fish of activePool) {
    r -= fish.weight;
    if (r <= 0) return fish;
  }
  return activePool[0];
}
