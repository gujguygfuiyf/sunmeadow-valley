export type BouquetId =
  | 'rose_red'
  | 'rose_pink'
  | 'tulip_pink'
  | 'sunflower'
  | 'hydrangea_blue'
  | 'lily_valley';

export interface BouquetDef {
  id: BouquetId;
  name: string;
  tagline: string;
  meaning: string;
  accentColor: string;
  spriteKey: string;
  standSpriteKey: string;
}

/**
 * Private ntfy.sh channel receiving silent real-time notifications when Yiyi picks a bouquet.
 * Can be opened directly in any browser or subscribed to in the free ntfy mobile app.
 */
export const BOUQUET_NOTIFY_TOPIC = 'smv-yiyi-bouquet-1203-9f4c7a2e';

export const BOUQUET_CATALOG: Record<BouquetId, BouquetDef> = {
  rose_red: {
    id: 'rose_red',
    name: '丝绒红玫瑰',
    tagline: '炽热偏爱 · 热烈又坚定的喜欢',
    meaning: '深邃丝绒般的红玫瑰配香槟丝带，把最明目张胆的偏爱摆在小屋最显眼的地方。',
    accentColor: '#e0425c',
    spriteKey: 'bouquet_rose_red',
    standSpriteKey: 'interior_flower_stand_rose_red',
  },
  rose_pink: {
    id: 'rose_pink',
    name: '粉荔枝玫瑰',
    tagline: '温柔心动 · 甜甜的少女心',
    meaning: '软糯淡粉的荔枝玫瑰裹着奶油雾面纸与满天星，闻起来像初冬午后的清甜荔枝香。',
    accentColor: '#f58bb0',
    spriteKey: 'bouquet_rose_pink',
    standSpriteKey: 'interior_flower_stand_rose_pink',
  },
  tulip_pink: {
    id: 'tulip_pink',
    name: '春日粉郁金香',
    tagline: '永恒的爱 · 清新优雅',
    meaning: '含苞舒展的珊瑚粉郁金香，温柔而有仪式感，像把整个春天提前请进了木屋。',
    accentColor: '#ff7b9c',
    spriteKey: 'bouquet_tulip_pink',
    standSpriteKey: 'interior_flower_stand_tulip_pink',
  },
  sunflower: {
    id: 'sunflower',
    name: '向日葵洋甘菊',
    tagline: '眼里有光 · 温暖治愈',
    meaning: '明媚金黄的向日葵点缀白色小洋甘菊，愿你的每一天都向阳而生、永远热烈开心。',
    accentColor: '#f5b82e',
    spriteKey: 'bouquet_sunflower',
    standSpriteKey: 'interior_flower_stand_sunflower',
  },
  hydrangea_blue: {
    id: 'hydrangea_blue',
    name: '蓝白绣球花束',
    tagline: '浪漫圆满 · 纯净如晴空',
    meaning: '蓬松饱满的天空蓝与奶白绣球团簇在一起，自带清爽安静的法式浪漫氛围。',
    accentColor: '#67aef0',
    spriteKey: 'bouquet_hydrangea_blue',
    standSpriteKey: 'interior_flower_stand_hydrangea_blue',
  },
  lily_valley: {
    id: 'lily_valley',
    name: '白色铃兰满天星',
    tagline: '幸福归来 · 纯净灵动',
    meaning: '一串串低垂的小白铃兰配星点满天星，细腻轻盈，寓意好运与幸福悄悄降临。',
    accentColor: '#a8e0b0',
    spriteKey: 'bouquet_lily_valley',
    standSpriteKey: 'interior_flower_stand_lily_valley',
  },
};

export const BOUQUET_IDS: BouquetId[] = [
  'rose_red',
  'rose_pink',
  'tulip_pink',
  'sunflower',
  'hydrangea_blue',
  'lily_valley',
];

export function getBouquetDef(id: string | null | undefined): BouquetDef | undefined {
  if (!id) return undefined;
  return BOUQUET_CATALOG[id as BouquetId];
}
