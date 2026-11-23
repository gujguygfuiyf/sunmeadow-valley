export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter';

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'fall', 'winter'];

export const SEASON_LABELS: Record<SeasonId, string> = {
  spring: '春季',
  summer: '夏季',
  fall: '秋季',
  winter: '冬季',
};

export interface CropDefinition {
  id: string;
  name: string;
  seedItemId: string;
  harvestItemId: string;
  seasons: SeasonId[];
  /** Number of watered days required to reach maturity */
  daysToGrow: number;
  /** Number of visual stages rendered from 0..stageCount-1 (last stage = mature) */
  stageCount: number;
  /** If set, harvesting resets crop back so it regrows every N watered days */
  regrowDays?: number;
  harvestMin: number;
  harvestMax: number;
}

/**
 * Data-driven 4-season crop registry.
 */
export const CROP_REGISTRY: Record<string, CropDefinition> = {
  parsnip: {
    id: 'parsnip',
    name: '防风草',
    seedItemId: 'seed_parsnip',
    harvestItemId: 'crop_parsnip',
    seasons: ['spring'],
    daysToGrow: 4,
    stageCount: 4,
    harvestMin: 1,
    harvestMax: 1,
  },
  tulip: {
    id: 'tulip',
    name: '郁金香',
    seedItemId: 'seed_tulip',
    harvestItemId: 'crop_tulip',
    seasons: ['spring'],
    daysToGrow: 5,
    stageCount: 4,
    harvestMin: 1,
    harvestMax: 1,
  },
  strawberry: {
    id: 'strawberry',
    name: '草莓',
    seedItemId: 'seed_strawberry',
    harvestItemId: 'crop_strawberry',
    seasons: ['spring'],
    daysToGrow: 6,
    stageCount: 4,
    regrowDays: 2,
    harvestMin: 1,
    harvestMax: 2,
  },
  blueberry: {
    id: 'blueberry',
    name: '蓝莓',
    seedItemId: 'seed_blueberry',
    harvestItemId: 'crop_blueberry',
    seasons: ['summer'],
    daysToGrow: 6,
    stageCount: 4,
    regrowDays: 3,
    harvestMin: 2,
    harvestMax: 3,
  },
  melon: {
    id: 'melon',
    name: '蜜瓜',
    seedItemId: 'seed_melon',
    harvestItemId: 'crop_melon',
    seasons: ['summer'],
    daysToGrow: 7,
    stageCount: 4,
    harvestMin: 1,
    harvestMax: 1,
  },
  pumpkin: {
    id: 'pumpkin',
    name: '金黄南瓜',
    seedItemId: 'seed_pumpkin',
    harvestItemId: 'crop_pumpkin',
    seasons: ['spring', 'fall'],
    daysToGrow: 7,
    stageCount: 4,
    harvestMin: 1,
    harvestMax: 1,
  },
  cranberry: {
    id: 'cranberry',
    name: '蔓越莓',
    seedItemId: 'seed_cranberry',
    harvestItemId: 'crop_cranberry',
    seasons: ['fall'],
    daysToGrow: 5,
    stageCount: 4,
    regrowDays: 3,
    harvestMin: 2,
    harvestMax: 2,
  },
  snow_yam: {
    id: 'snow_yam',
    name: '雪山药',
    seedItemId: 'seed_snow_yam',
    harvestItemId: 'crop_snow_yam',
    seasons: ['winter'],
    daysToGrow: 5,
    stageCount: 4,
    harvestMin: 1,
    harvestMax: 1,
  },
};

export function getCropDef(cropId: string): CropDefinition | undefined {
  return CROP_REGISTRY[cropId];
}

export function isCropInSeason(cropId: string, season: SeasonId): boolean {
  const def = CROP_REGISTRY[cropId];
  return def ? def.seasons.includes(season) : false;
}
