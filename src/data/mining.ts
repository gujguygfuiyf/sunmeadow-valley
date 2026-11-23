import type { UpgradeableToolKind } from './items';

export interface ToolTierInfo {
  tier: number;
  prefix: string;
  goldCost: number;
  barItemId: string;
  barCount: number;
  waterCapacity: number;
  aoeDesc: string;
}

export const TOOL_TIERS: ToolTierInfo[] = [
  {
    tier: 0,
    prefix: '基础',
    goldCost: 0,
    barItemId: '',
    barCount: 0,
    waterCapacity: 20,
    aoeDesc: '单格操作',
  },
  {
    tier: 1,
    prefix: '铜质',
    goldCost: 300,
    barItemId: 'bar_copper',
    barCount: 2,
    waterCapacity: 35,
    aoeDesc: '前方 3 格直线范围 / 采伐伤害 +1',
  },
  {
    tier: 2,
    prefix: '铁质',
    goldCost: 650,
    barItemId: 'bar_iron',
    barCount: 2,
    waterCapacity: 50,
    aoeDesc: '前方 5 格（或 3×2）范围 / 采伐伤害 +2',
  },
  {
    tier: 3,
    prefix: '黄金',
    goldCost: 1200,
    barItemId: 'bar_gold',
    barCount: 2,
    waterCapacity: 80,
    aoeDesc: '3×3 全九宫格范围 / 秒破普通岩石',
  },
];

export const UPGRADEABLE_TOOL_NAMES: Record<UpgradeableToolKind, string> = {
  hoe: '锄头',
  watering_can: '喷壶',
  axe: '伐木斧',
  pickaxe: '十字镐',
};

export const UPGRADEABLE_TOOL_SPRITES: Record<UpgradeableToolKind, string> = {
  hoe: 'item_hoe',
  watering_can: 'item_watering_can',
  axe: 'item_axe',
  pickaxe: 'item_pickaxe',
};

export type MineRockKind = 'stone' | 'copper' | 'iron' | 'gold' | 'gem';

export interface MineRockDef {
  kind: MineRockKind;
  hp: number;
  dropItemId: string;
  dropMin: number;
  dropMax: number;
  spriteKey: string;
}

export const MINE_ROCK_DEFS: Record<MineRockKind, MineRockDef> = {
  stone: {
    kind: 'stone',
    hp: 2,
    dropItemId: 'res_stone',
    dropMin: 1,
    dropMax: 2,
    spriteKey: 'mine_rock_stone',
  },
  copper: {
    kind: 'copper',
    hp: 3,
    dropItemId: 'ore_copper',
    dropMin: 1,
    dropMax: 3,
    spriteKey: 'mine_rock_copper',
  },
  iron: {
    kind: 'iron',
    hp: 4,
    dropItemId: 'ore_iron',
    dropMin: 1,
    dropMax: 3,
    spriteKey: 'mine_rock_iron',
  },
  gold: {
    kind: 'gold',
    hp: 5,
    dropItemId: 'ore_gold',
    dropMin: 1,
    dropMax: 2,
    spriteKey: 'mine_rock_gold',
  },
  gem: {
    kind: 'gem',
    hp: 4,
    dropItemId: 'gem_amethyst',
    dropMin: 1,
    dropMax: 1,
    spriteKey: 'mine_rock_gem',
  },
};

export const MINE_ELEVATOR_FLOORS = [1, 5, 10, 15] as const;
