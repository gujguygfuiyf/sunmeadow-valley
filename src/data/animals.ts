export type BuildingKind = 'coop' | 'barn';
export type AnimalKind = 'chicken' | 'cow' | 'sheep';

export interface FarmBuildingDefinition {
  id: BuildingKind;
  name: string;
  description: string;
  goldCost: number;
  woodCost: number;
  stoneCost: number;
  capacity: number;
  supportedAnimals: AnimalKind[];
  spriteKey: string;
}

export interface AnimalDefinition {
  id: AnimalKind;
  name: string;
  buildingRequired: BuildingKind;
  price: number;
  produceItemId: string;
  produceIntervalDays: number;
  spriteKey: string;
  soundText: string;
  description: string;
}

export const FARM_BUILDINGS: Record<BuildingKind, FarmBuildingDefinition> = {
  coop: {
    id: 'coop',
    name: '温馨鸡舍',
    description: '可饲养最多 4 只咯咯鸡，每天清晨收获新鲜鸡蛋',
    goldCost: 300,
    woodCost: 20,
    stoneCost: 10,
    capacity: 4,
    supportedAnimals: ['chicken'],
    spriteKey: 'building_coop',
  },
  barn: {
    id: 'barn',
    name: '田园大畜棚',
    description: '可饲养最多 4 头奶牛或绵羊，收获鲜奶与柔软羊毛',
    goldCost: 550,
    woodCost: 30,
    stoneCost: 20,
    capacity: 4,
    supportedAnimals: ['cow', 'sheep'],
    spriteKey: 'building_barn',
  },
};

export const ANIMAL_CATALOG: Record<AnimalKind, AnimalDefinition> = {
  chicken: {
    id: 'chicken',
    name: '咯咯鸡',
    buildingRequired: 'coop',
    price: 180,
    produceItemId: 'prod_egg',
    produceIntervalDays: 1,
    spriteKey: 'animal_chicken',
    soundText: '咯咯哒~',
    description: '每天清晨产下一颗新鲜鸡蛋，喜欢被温柔抚摸！',
  },
  cow: {
    id: 'cow',
    name: '花斑奶牛',
    buildingRequired: 'barn',
    price: 360,
    produceItemId: 'prod_milk',
    produceIntervalDays: 1,
    spriteKey: 'animal_cow',
    soundText: '哞~',
    description: '每天清晨产出醇香鲜奶，可进一步压制成农家奶酪！',
  },
  sheep: {
    id: 'sheep',
    name: '蓬蓬绵羊',
    buildingRequired: 'barn',
    price: 420,
    produceItemId: 'prod_wool',
    produceIntervalDays: 2,
    spriteKey: 'animal_sheep',
    soundText: '咩咩~',
    description: '每 2 天产出蓬松洁白的柔软羊毛，售价极高！',
  },
};

export const ANIMAL_DEFAULT_NAMES: Record<AnimalKind, string[]> = {
  chicken: ['小布丁', '团子', '金豆', '雪球'],
  cow: ['奶糖', '斑点', '摩卡', '小云朵'],
  sheep: ['棉花糖', '绒绒', '白露', '卷卷'],
};
