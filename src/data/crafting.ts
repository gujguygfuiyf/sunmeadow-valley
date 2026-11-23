export interface CraftIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  outputItemId: string;
  outputQuantity: number;
  name: string;
  description: string;
  ingredients: CraftIngredient[];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_chest',
    outputItemId: 'mach_chest',
    outputQuantity: 1,
    name: '木质储物箱',
    description: '摆放在农场提供 24 格额外存储空间',
    ingredients: [{ itemId: 'res_wood', quantity: 15 }],
  },
  {
    id: 'craft_scarecrow',
    outputItemId: 'mach_scarecrow',
    outputQuantity: 1,
    name: '田园稻草人',
    description: '保护 5 格半径内作物免遭夜间乌鸦偷吃',
    ingredients: [
      { itemId: 'res_wood', quantity: 10 },
      { itemId: 'res_fiber', quantity: 8 },
    ],
  },
  {
    id: 'craft_furnace',
    outputItemId: 'mach_furnace',
    outputQuantity: 1,
    name: '石砌熔炉',
    description: '将矿洞挖到的铜/铁/金矿石熔炼成金属锭',
    ingredients: [
      { itemId: 'res_stone', quantity: 12 },
      { itemId: 'ore_copper', quantity: 4 },
    ],
  },
  {
    id: 'craft_sprinkler',
    outputItemId: 'mach_sprinkler',
    outputQuantity: 1,
    name: '普通洒水器',
    description: '每天清晨自动浇灌上下左右 4 格耕地',
    ingredients: [
      { itemId: 'bar_copper', quantity: 1 },
      { itemId: 'res_stone', quantity: 6 },
    ],
  },
  {
    id: 'craft_quality_sprinkler',
    outputItemId: 'mach_quality_sprinkler',
    outputQuantity: 1,
    name: '优质洒水器',
    description: '每天清晨自动浇灌周围 3×3 共 8 格耕地',
    ingredients: [
      { itemId: 'bar_iron', quantity: 1 },
      { itemId: 'bar_copper', quantity: 1 },
    ],
  },
  {
    id: 'craft_preserves_jar',
    outputItemId: 'mach_preserves_jar',
    outputQuantity: 1,
    name: '腌菜果酱桶',
    description: '将任意收获作物加工为 220G 手工果酱',
    ingredients: [
      { itemId: 'res_wood', quantity: 15 },
      { itemId: 'res_stone', quantity: 8 },
    ],
  },
  {
    id: 'craft_keg',
    outputItemId: 'mach_keg',
    outputQuantity: 1,
    name: '橡木酿酒桶',
    description: '将作物发酵为 360G 陈酿果酒',
    ingredients: [
      { itemId: 'res_wood', quantity: 18 },
      { itemId: 'bar_copper', quantity: 1 },
      { itemId: 'bar_iron', quantity: 1 },
    ],
  },
  {
    id: 'craft_seed_maker',
    outputItemId: 'mach_seed_maker',
    outputQuantity: 1,
    name: '种子制造机',
    description: '将作物转化为 2-3 包对应种子',
    ingredients: [
      { itemId: 'res_wood', quantity: 12 },
      { itemId: 'bar_copper', quantity: 1 },
    ],
  },
  {
    id: 'craft_mayo_maker',
    outputItemId: 'mach_mayo_maker',
    outputQuantity: 1,
    name: '蛋黄酱机',
    description: '将新鲜鸡蛋加工为 165G 醇厚蛋黄酱',
    ingredients: [
      { itemId: 'res_wood', quantity: 10 },
      { itemId: 'res_stone', quantity: 8 },
      { itemId: 'bar_copper', quantity: 1 },
    ],
  },
  {
    id: 'craft_cheese_press',
    outputItemId: 'mach_cheese_press',
    outputQuantity: 1,
    name: '奶酪压制机',
    description: '将醇香鲜奶压制为 245G 农家奶酪',
    ingredients: [
      { itemId: 'res_wood', quantity: 12 },
      { itemId: 'res_stone', quantity: 10 },
      { itemId: 'bar_iron', quantity: 1 },
    ],
  },
  {
    id: 'craft_fence',
    outputItemId: 'mach_fence',
    outputQuantity: 4,
    name: '木质围栏 ×4',
    description: '自由布置农场围栏',
    ingredients: [{ itemId: 'res_wood', quantity: 4 }],
  },
  {
    id: 'craft_path',
    outputItemId: 'mach_path',
    outputQuantity: 4,
    name: '石板小路 ×4',
    description: '自由铺设农场石板路',
    ingredients: [{ itemId: 'res_stone', quantity: 4 }],
  },
];

export function getCraftingRecipe(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find((r) => r.id === id);
}
