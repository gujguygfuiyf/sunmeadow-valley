export interface CookingIngredient {
  itemId: string;
  quantity: number;
}

export interface CookingRecipe {
  id: string;
  outputItemId: string;
  name: string;
  description: string;
  ingredients: CookingIngredient[];
  /** If true, starts unlocked; otherwise unlocked via Heart Events or Friendship */
  starterUnlocked: boolean;
  unlockHint?: string;
}

export const COOKING_RECIPES: CookingRecipe[] = [
  {
    id: 'recipe_parsnip_soup',
    outputItemId: 'food_parsnip_soup',
    name: '奶油防风草浓汤',
    description: '家常暖胃浓汤，快速恢复 60 体力与 35 生命',
    ingredients: [{ itemId: 'crop_parsnip', quantity: 2 }],
    starterUnlocked: true,
  },
  {
    id: 'recipe_fried_fish',
    outputItemId: 'food_fried_fish',
    name: '香煎田园鲜鱼',
    description: '任意田园鲤鱼或太阳鱼现煎，恢复 70 体力与 45 生命',
    ingredients: [{ itemId: 'fish_carp', quantity: 1 }],
    starterUnlocked: true,
  },
  {
    id: 'recipe_berry_toast',
    outputItemId: 'food_berry_toast',
    name: '浆果蜂蜜吐司',
    description: '香甜草莓吐司，恢复 75 体力与 40 生命',
    ingredients: [{ itemId: 'crop_strawberry', quantity: 1 }],
    starterUnlocked: true,
  },
  {
    id: 'recipe_omelet',
    outputItemId: 'food_omelet',
    name: '田园芝士煎蛋卷',
    description: '鸡蛋与鲜奶制作的营养料理，恢复 85 体力与 55 生命',
    ingredients: [
      { itemId: 'prod_egg', quantity: 1 },
      { itemId: 'prod_milk', quantity: 1 },
    ],
    starterUnlocked: true,
  },
  {
    id: 'recipe_pumpkin_pie',
    outputItemId: 'food_pumpkin_pie',
    name: '肉桂金瓜派',
    description: '星露谷传统丰收甜点，恢复 100 体力与 65 生命',
    ingredients: [
      { itemId: 'crop_pumpkin', quantity: 1 },
      { itemId: 'prod_milk', quantity: 1 },
    ],
    starterUnlocked: false,
    unlockHint: '与皮埃尔或艾米丽达到 2 心好感剧情后获赠秘方（或直接解锁）',
  },
];

export function getRecipeDef(id: string): CookingRecipe | undefined {
  return COOKING_RECIPES.find((r) => r.id === id);
}
