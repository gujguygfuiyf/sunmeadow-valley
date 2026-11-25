export type CatBreedId = 'cat_maine_silver' | 'cat_bicolor_tabby';

export interface CatBreedDef {
  id: CatBreedId;
  name: string;
  defaultPetName: string;
  originNote: string;
  personality: string;
  description: string;
  soundText: string;
  /** Minimap & UI accent colors */
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  collarColor: string;
  /** Items that count as favorite daily treats */
  favoriteTreatIds: string[];
  /** Possible lucky morning gifts brought at 3+ hearts */
  luckyGiftPool: string[];
}

export const CAT_BREEDS: Record<CatBreedId, CatBreedDef> = {
  cat_maine_silver: {
    id: 'cat_maine_silver',
    name: '银虎斑缅因小猫',
    defaultPetName: '灰绒',
    originNote: '原型：桌面微信图片',
    personality: '高耳尖聪明毛 · 优雅黏人',
    description:
      '长着一对超大耳尖聪明毛和雪白蓬松围脖的银灰虎斑小缅因，四只小爪穿着小白袜，最爱歪头盯着你撒娇。',
    soundText: '喵呜～',
    primaryColor: '#8d9299',
    secondaryColor: '#f7f5f0',
    accentColor: '#4f545c',
    collarColor: '#e06c75',
    favoriteTreatIds: [
      'fish_carp',
      'fish_sunfish',
      'fish_trout',
      'fish_catfish',
      'fish_golden_koi',
      'prod_milk',
      'food_fried_fish',
    ],
    luckyGiftPool: ['fish_carp', 'fish_sunfish', 'fish_trout', 'res_fiber', 'gem_amethyst'],
  },
  cat_bicolor_tabby: {
    id: 'cat_bicolor_tabby',
    name: '棕斑加白圆脸猫',
    defaultPetName: '奶盖',
    originNote: '原型：桌面微信视频',
    personality: '大金眼吐舌萌 · 元气贪吃',
    description:
      '圆滚滚的棕虎斑八字开脸小可爱，有着闪亮大金眼、雪白大围兜和小短爪，激动时还会呆萌地吐出粉嫩小舌头！',
    soundText: '喵嗷～♪',
    primaryColor: '#7a5d3b',
    secondaryColor: '#faf7f0',
    accentColor: '#4a3520',
    collarColor: '#f29eb0',
    favoriteTreatIds: [
      'fish_carp',
      'fish_sunfish',
      'fish_trout',
      'fish_catfish',
      'fish_golden_koi',
      'prod_milk',
      'prod_egg',
      'food_fried_fish',
    ],
    luckyGiftPool: ['fish_carp', 'crop_strawberry', 'res_wood', 'ore_copper', 'gem_amethyst'],
  },
};

export const CAT_BREED_IDS: CatBreedId[] = ['cat_maine_silver', 'cat_bicolor_tabby'];

export function getCatBreedDef(breedId: CatBreedId): CatBreedDef {
  return CAT_BREEDS[breedId];
}
