export type BundleRewardKind =
  | 'unlock_greenhouse'
  | 'unlock_fast_travel'
  | 'gift_sprinklers'
  | 'unlock_mine_elevator';

export interface BundleDefinition {
  id: string;
  name: string;
  description: string;
  requiredItemIds: string[];
  rewardKind: BundleRewardKind;
  rewardText: string;
}

export const COMMUNITY_BUNDLES: BundleDefinition[] = [
  {
    id: 'bundle_crops',
    name: '春季丰收收集包',
    description: '向社区中心献祭晨露谷代表作物',
    requiredItemIds: ['crop_parsnip', 'crop_tulip', 'crop_strawberry'],
    rewardKind: 'unlock_greenhouse',
    rewardText: '解锁农场【四季温室】（温室耕地四季皆可种植，换季永不枯萎！）',
  },
  {
    id: 'bundle_artisan',
    name: '工匠牧场收集包',
    description: '献祭农家加工品与新鲜牧场产物',
    requiredItemIds: ['art_jam', 'prod_egg', 'prod_milk'],
    rewardKind: 'unlock_fast_travel',
    rewardText: '解锁【矿车快速旅行驿站】（地图一键直达农场、小镇与矿洞）',
  },
  {
    id: 'bundle_fishing',
    name: '湖畔垂钓收集包',
    description: '献祭晨露谷水域的特色鱼获',
    requiredItemIds: ['fish_carp', 'fish_sunfish', 'fish_trout'],
    rewardKind: 'gift_sprinklers',
    rewardText: '奖励【优质洒水器 ×2】与 500 G 社区嘉奖！',
  },
  {
    id: 'bundle_mining',
    name: '矿洞地质收集包',
    description: '献祭矿洞采集的金属矿石与宝石',
    requiredItemIds: ['ore_copper', 'ore_iron', 'gem_amethyst'],
    rewardKind: 'unlock_mine_elevator',
    rewardText: '解锁【矿洞直达电梯（1F / 5F / 10F / 15F）】+ 400 G 奖励！',
  },
];

export interface CollectionGroup {
  id: string;
  title: string;
  itemIds: string[];
}

export const COLLECTION_GROUPS: CollectionGroup[] = [
  {
    id: 'crops',
    title: '四季农作物',
    itemIds: [
      'crop_parsnip',
      'crop_tulip',
      'crop_strawberry',
      'crop_blueberry',
      'crop_melon',
      'crop_pumpkin',
      'crop_cranberry',
      'crop_snow_yam',
    ],
  },
  {
    id: 'fish',
    title: '水产垂钓图鉴',
    itemIds: ['fish_carp', 'fish_sunfish', 'fish_trout', 'fish_catfish', 'fish_golden_koi'],
  },
  {
    id: 'minerals',
    title: '矿产与宝石',
    itemIds: [
      'ore_copper',
      'ore_iron',
      'ore_gold',
      'bar_copper',
      'bar_iron',
      'bar_gold',
      'gem_amethyst',
      'gem_emerald',
      'gem_ruby',
    ],
  },
  {
    id: 'artisan',
    title: '牧场与工匠珍品',
    itemIds: [
      'prod_egg',
      'prod_milk',
      'prod_wool',
      'art_jam',
      'art_wine',
      'art_mayo',
      'art_cheese',
    ],
  },
  {
    id: 'cooking',
    title: '农舍料理图鉴',
    itemIds: [
      'food_parsnip_soup',
      'food_berry_toast',
      'food_pumpkin_pie',
      'food_fried_fish',
      'food_omelet',
    ],
  },
];
