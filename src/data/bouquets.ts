export type BouquetId =
  | 'rose_red_white'
  | 'rose_red_black'
  | 'rose_ice_blue'
  | 'rose_white'
  | 'rose_lychee_balloon'
  | 'rose_lychee_orchid'
  | 'rose_floyd_black'
  | 'rose_purple'
  | 'rose_white_purple'
  | 'rose_yellow'
  | 'rose_isabella'
  | 'rose_mermaid'
  | 'rose_champagne_black'
  | 'rose_pink_snow'
  | 'rose_pink_balloon'
  | 'rose_pink_lights';

export type BouquetWrapTheme = 'white' | 'black' | 'purple' | 'ice_blue' | 'blush_white' | 'pearl_white';
export type BouquetBalloonTheme = 'none' | 'silver' | 'black_silver' | 'black_pink' | 'purple' | 'rosegold';

export interface BouquetDef {
  id: BouquetId;
  /** Romantic in-game name shown naturally to Yiyi (no prices or shop text) */
  name: string;
  /** Short poetic subtitle shown in flower picker */
  tagline: string;
  /** Warm flower meaning description */
  meaning: string;
  /** Exact florist screenshot label sent ONLY in the silent notification so the buyer never mixes up similar styles */
  floristSku: string;
  accentColor: string;
  /** Visual recipe used by PixelArtBouquets.ts to match the exact photo */
  rosePalette: string[];
  roseShadow: string;
  roseHighlight: string;
  wrapTheme: BouquetWrapTheme;
  ribbonColor: string;
  ribbonHighlight: string;
  balloons: BouquetBalloonTheme;
  hasOrchids?: boolean;
  hasFairyLights?: boolean;
  spriteKey: string;
  standSpriteKey: string;
}

/**
 * Private ntfy.sh channel receiving silent real-time notifications when Yiyi picks a bouquet.
 */
export const BOUQUET_NOTIFY_TOPIC = 'smv-yiyi-bouquet-1203-9f4c7a2e';

export const BOUQUET_CATALOG: Record<BouquetId, BouquetDef> = {
  rose_red_white: {
    id: 'rose_red_white',
    name: '红玫瑰 · 白纱红丝带',
    tagline: '炽热偏爱 · 经典浪漫',
    meaning: '饱满深红的丝绒玫瑰搭配纯白褶皱裙摆与酒红长丝带，热烈又纯粹的心动。',
    floristSku: '999朵红玫瑰花（白纱红丝带 · 图 41/57）',
    accentColor: '#d92642',
    rosePalette: ['#b81630', '#d92341', '#c71b37', '#e83854'],
    roseShadow: '#730a1c',
    roseHighlight: '#ff7088',
    wrapTheme: 'white',
    ribbonColor: '#9e1930',
    ribbonHighlight: '#e04f67',
    balloons: 'none',
    spriteKey: 'bouquet_rose_red_white',
    standSpriteKey: 'interior_flower_stand_rose_red_white',
  },
  rose_red_black: {
    id: 'rose_red_black',
    name: '红玫瑰 · 黑纱心形气球',
    tagline: '暗夜炽爱 · 高级复古',
    meaning: '深绯红玫瑰映衬哑光黑纱与黑银爱心气球，像夜景灯光下最瞩目的告白。',
    floristSku: '999朵红玫瑰花束（黑纱气球款 · 图 40/57）',
    accentColor: '#c91e3a',
    rosePalette: ['#a8122b', '#cc1d38', '#bf1833', '#e0314c'],
    roseShadow: '#660817',
    roseHighlight: '#ff667e',
    wrapTheme: 'black',
    ribbonColor: '#9e1930',
    ribbonHighlight: '#e34962',
    balloons: 'black_silver',
    spriteKey: 'bouquet_rose_red_black',
    standSpriteKey: 'interior_flower_stand_rose_red_black',
  },
  rose_ice_blue: {
    id: 'rose_ice_blue',
    name: '碎冰蓝玫瑰',
    tagline: '星辰大海 · 清澈温柔',
    meaning: '白底晕染冰蓝的碎冰蓝玫瑰裹着轻盈天蓝欧根纱，像把晴空与冬日星光捧在怀里。',
    floristSku: '999朵碎冰蓝花束（图 43/57）',
    accentColor: '#6cb4f2',
    rosePalette: ['#7ab8f0', '#a6d4fa', '#e8f5ff', '#5b9ee0'],
    roseShadow: '#3f76b3',
    roseHighlight: '#ffffff',
    wrapTheme: 'ice_blue',
    ribbonColor: '#7cbce8',
    ribbonHighlight: '#d9f0ff',
    balloons: 'none',
    spriteKey: 'bouquet_rose_ice_blue',
    standSpriteKey: 'interior_flower_stand_rose_ice_blue',
  },
  rose_white: {
    id: 'rose_white',
    name: '初雪白玫瑰',
    tagline: '纯净无瑕 · 十二月初雪',
    meaning: '奶白色玫瑰花海配微光珍珠白薄纱，干净圣洁，像为你落下的第一场温柔初雪。',
    floristSku: '999朵白玫瑰花（图 44/57）',
    accentColor: '#dce6f5',
    rosePalette: ['#f7f7f0', '#fffef7', '#eceee2', '#f2f5eb'],
    roseShadow: '#c7ccb8',
    roseHighlight: '#ffffff',
    wrapTheme: 'pearl_white',
    ribbonColor: '#dfe6f2',
    ribbonHighlight: '#ffffff',
    balloons: 'none',
    spriteKey: 'bouquet_rose_white',
    standSpriteKey: 'interior_flower_stand_rose_white',
  },
  rose_lychee_balloon: {
    id: 'rose_lychee_balloon',
    name: '粉荔枝 · 银色爱心气球',
    tagline: '甜美心动 · 少女梦境',
    meaning: '软糯粉荔枝玫瑰搭洁白层叠纱纸与三只闪亮银色爱心气球，甜得刚刚好。',
    floristSku: '999朵粉荔枝 + 气球（图 45/57）',
    accentColor: '#f28eb0',
    rosePalette: ['#f088ab', '#faa7c2', '#e8769d', '#ffc4d7'],
    roseShadow: '#b84c72',
    roseHighlight: '#ffe8f0',
    wrapTheme: 'white',
    ribbonColor: '#f5b3c8',
    ribbonHighlight: '#ffe8f0',
    balloons: 'silver',
    spriteKey: 'bouquet_rose_lychee_balloon',
    standSpriteKey: 'interior_flower_stand_rose_lychee_balloon',
  },
  rose_lychee_orchid: {
    id: 'rose_lychee_orchid',
    name: '粉荔枝 · 蝴蝶兰款',
    tagline: '仙气灵动 · 花间蝶影',
    meaning: '娇嫩粉荔枝玫瑰间点缀着紫白蝴蝶兰，像春风里翩翩停驻的仙女花园。',
    floristSku: '999朵粉荔枝花束 + 蝴蝶兰（图 46/57）',
    accentColor: '#f094ba',
    rosePalette: ['#f291b4', '#fab4cd', '#e87ca3', '#ffd1e1'],
    roseShadow: '#b55378',
    roseHighlight: '#fff0f6',
    wrapTheme: 'white',
    ribbonColor: '#d998ad',
    ribbonHighlight: '#f7d5e0',
    balloons: 'none',
    hasOrchids: true,
    spriteKey: 'bouquet_rose_lychee_orchid',
    standSpriteKey: 'interior_flower_stand_rose_lychee_orchid',
  },
  rose_floyd_black: {
    id: 'rose_floyd_black',
    name: '弗洛伊德 · 玫红黑纱',
    tagline: '明艳惊艳 · 绝美气场',
    meaning: '浓郁饱和的复古玫红弗洛伊德玫瑰配黑金丝光包装与黑粉气球，明艳动人。',
    floristSku: '999朵弗洛伊德花束（图 47/57）',
    accentColor: '#e0246b',
    rosePalette: ['#d61a62', '#eb387c', '#bf1254', '#f75c97'],
    roseShadow: '#7d0936',
    roseHighlight: '#ff9ec2',
    wrapTheme: 'black',
    ribbonColor: '#d93272',
    ribbonHighlight: '#ff85b3',
    balloons: 'black_pink',
    spriteKey: 'bouquet_rose_floyd_black',
    standSpriteKey: 'interior_flower_stand_rose_floyd_black',
  },
  rose_purple: {
    id: 'rose_purple',
    name: '烟灰紫玫瑰',
    tagline: '法式优雅 · 神秘浪漫',
    meaning: '温柔低饱和的冷美人紫玫瑰配同色香芋紫与奶白包纸，自带法式庄园氛围。',
    floristSku: '999朵紫玫瑰（图 49/57）',
    accentColor: '#b584bd',
    rosePalette: ['#a674b0', '#c496cc', '#94629e', '#d9b5e0'],
    roseShadow: '#633c6b',
    roseHighlight: '#f4e3f7',
    wrapTheme: 'purple',
    ribbonColor: '#b08ec2',
    ribbonHighlight: '#e8d9f0',
    balloons: 'none',
    spriteKey: 'bouquet_rose_purple',
    standSpriteKey: 'interior_flower_stand_rose_purple',
  },
  rose_white_purple: {
    id: 'rose_white_purple',
    name: '白紫星雾混合玫瑰',
    tagline: '温柔星语 · 梦幻轻盈',
    meaning: '奶油白玫瑰与薰衣草紫玫瑰温柔交错，配垂坠灰紫丝带与梦幻紫气球。',
    floristSku: '999朵白紫色混合花束（图 48/57）',
    accentColor: '#c993db',
    rosePalette: ['#fff5eb', '#f5e6d8', '#b86ec7', '#fae8dc', '#d49be0'],
    roseShadow: '#875794',
    roseHighlight: '#ffffff',
    wrapTheme: 'blush_white',
    ribbonColor: '#b894cf',
    ribbonHighlight: '#e8d9f5',
    balloons: 'purple',
    spriteKey: 'bouquet_rose_white_purple',
    standSpriteKey: 'interior_flower_stand_rose_white_purple',
  },
  rose_yellow: {
    id: 'rose_yellow',
    name: '暖阳黄玫瑰',
    tagline: '眼里有光 · 灿烂明媚',
    meaning: '满满一团金灿灿的鹅黄玫瑰配纯净白纸，像把整个暖冬午后的阳光抱进屋里。',
    floristSku: '999朵黄玫瑰（图 50/57）',
    accentColor: '#f5be2e',
    rosePalette: ['#f2b51d', '#ffd447', '#e09d12', '#ffe57a'],
    roseShadow: '#9e6706',
    roseHighlight: '#fff6ba',
    wrapTheme: 'white',
    ribbonColor: '#e8c456',
    ribbonHighlight: '#fff4bd',
    balloons: 'none',
    spriteKey: 'bouquet_rose_yellow',
    standSpriteKey: 'interior_flower_stand_rose_yellow',
  },
  rose_isabella: {
    id: 'rose_isabella',
    name: '伊莎贝拉 · 粉紫蓝梦',
    tagline: '童话仙境 · 梦幻撞色',
    meaning: '粉嫩玫瑰与薰衣草蓝紫交织成油画般的花穹，配雪白蓬松大蝴蝶结，宛如童话公主。',
    floristSku: '999朵伊莎贝拉（图 51/57）',
    accentColor: '#b894f0',
    rosePalette: ['#f299c2', '#9c92eb', '#f7bdd7', '#b8a3f2', '#ffd6e8'],
    roseShadow: '#6d5ea8',
    roseHighlight: '#fff2fa',
    wrapTheme: 'white',
    ribbonColor: '#f2edf7',
    ribbonHighlight: '#ffffff',
    balloons: 'none',
    spriteKey: 'bouquet_rose_isabella',
    standSpriteKey: 'interior_flower_stand_rose_isabella',
  },
  rose_mermaid: {
    id: 'rose_mermaid',
    name: '人鱼姬幻彩玫瑰',
    tagline: '星海珍珠 · 柔光幻彩',
    meaning: '蜜桃粉、珍珠白、冰雾蓝与浅香槟柔和晕染，像人鱼鳞片在月光下泛出的温柔微光。',
    floristSku: '999朵人鱼姬花束（图 52/57）',
    accentColor: '#f0b8c8',
    rosePalette: ['#f7d0cf', '#cce4f5', '#f5e8d0', '#dfd2f2', '#d2ede4'],
    roseShadow: '#9ea8b8',
    roseHighlight: '#ffffff',
    wrapTheme: 'white',
    ribbonColor: '#f0d5de',
    ribbonHighlight: '#fff7fa',
    balloons: 'none',
    spriteKey: 'bouquet_rose_mermaid',
    standSpriteKey: 'interior_flower_stand_rose_mermaid',
  },
  rose_champagne_black: {
    id: 'rose_champagne_black',
    name: '香槟玫瑰 · 黑纱丝带',
    tagline: '一生挚爱 · 温柔高级',
    meaning: '奶油暖杏香槟玫瑰撞色高级黑纱与法式黑丝带蝴蝶结，温柔又充满质感。',
    floristSku: '999朵香槟花束（图 53/57）',
    accentColor: '#f2ba88',
    rosePalette: ['#f2ba88', '#ffd6ad', '#e3a16b', '#ffe6c9'],
    roseShadow: '#a66b3c',
    roseHighlight: '#fff5e6',
    wrapTheme: 'black',
    ribbonColor: '#292930',
    ribbonHighlight: '#6b6b78',
    balloons: 'none',
    spriteKey: 'bouquet_rose_champagne_black',
    standSpriteKey: 'interior_flower_stand_rose_champagne_black',
  },
  rose_pink_snow: {
    id: 'rose_pink_snow',
    name: '粉雪山 · 樱粉轻纱',
    tagline: '清甜初恋 · 仙气满格',
    meaning: '清透柔和的粉雪山玫瑰覆盖轻盈粉纱与白色蝴蝶兰，配长长丝带浪漫飘逸。',
    floristSku: '999朵粉雪山花束（图 38/57）',
    accentColor: '#f7a6c4',
    rosePalette: ['#f5a2c0', '#ffc2d8', '#eb8fb1', '#ffdbe8'],
    roseShadow: '#b86082',
    roseHighlight: '#fff5f8',
    wrapTheme: 'blush_white',
    ribbonColor: '#f7c8d9',
    ribbonHighlight: '#fff2f7',
    balloons: 'none',
    hasOrchids: true,
    spriteKey: 'bouquet_rose_pink_snow',
    standSpriteKey: 'interior_flower_stand_rose_pink_snow',
  },
  rose_pink_balloon: {
    id: 'rose_pink_balloon',
    name: '蜜桃粉玫瑰 · 玫瑰金气球',
    tagline: '满心欢喜 · 甜蜜告白',
    meaning: '温柔蜜桃粉玫瑰搭配蓬松层叠白纱与闪耀玫瑰金爱心气球，仪式感拉满。',
    floristSku: '999朵粉玫瑰花束【气球】（图 4/57）',
    accentColor: '#f58ca8',
    rosePalette: ['#eb7c9c', '#fa9db8', '#de6a8c', '#ffc2d4'],
    roseShadow: '#ad4263',
    roseHighlight: '#ffe8ef',
    wrapTheme: 'white',
    ribbonColor: '#f2a2b9',
    ribbonHighlight: '#ffe3ec',
    balloons: 'rosegold',
    spriteKey: 'bouquet_rose_pink_balloon',
    standSpriteKey: 'interior_flower_stand_rose_pink_balloon',
  },
  rose_pink_lights: {
    id: 'rose_pink_lights',
    name: '粉玫瑰 · 星光灯串款',
    tagline: '星光浪漫 · 暖灯珍珠',
    meaning: '柔粉玫瑰花海缠绕着点点暖金星光灯串与垂坠珍珠链，夜晚微光闪烁如梦似幻。',
    floristSku: '999朵粉玫瑰灯串花束（图 3/57）',
    accentColor: '#f7a1bc',
    rosePalette: ['#f299b5', '#ffb8cf', '#e882a3', '#ffd4e2'],
    roseShadow: '#b85676',
    roseHighlight: '#fff0f5',
    wrapTheme: 'white',
    ribbonColor: '#f5dbe3',
    ribbonHighlight: '#ffffff',
    balloons: 'none',
    hasFairyLights: true,
    spriteKey: 'bouquet_rose_pink_lights',
    standSpriteKey: 'interior_flower_stand_rose_pink_lights',
  },
};

export const BOUQUET_IDS: BouquetId[] = [
  'rose_red_white',
  'rose_red_black',
  'rose_lychee_balloon',
  'rose_lychee_orchid',
  'rose_pink_lights',
  'rose_pink_snow',
  'rose_pink_balloon',
  'rose_ice_blue',
  'rose_white',
  'rose_floyd_black',
  'rose_purple',
  'rose_white_purple',
  'rose_yellow',
  'rose_isabella',
  'rose_mermaid',
  'rose_champagne_black',
];

/** Backwards-compatible mapping in case an older save stored one of the initial 6 classic IDs. */
const LEGACY_BOUQUET_MAP: Record<string, BouquetId> = {
  rose_red: 'rose_red_white',
  rose_pink: 'rose_lychee_balloon',
  tulip_pink: 'rose_pink_snow',
  sunflower: 'rose_yellow',
  hydrangea_blue: 'rose_ice_blue',
  lily_valley: 'rose_white',
};

export function getBouquetDef(id: string | null | undefined): BouquetDef | undefined {
  if (!id) return undefined;
  const mapped = (LEGACY_BOUQUET_MAP[id] ?? id) as BouquetId;
  return BOUQUET_CATALOG[mapped];
}

/**
 * Returns the relative/base-aware URL for the AI-generated cozy pixel-art transparent PNG
 * bouquet sprite bundled in `public/assets/bouquets/sprites/<id>.png`.
 */
export function getBouquetSpriteUrl(id: BouquetId): string {
  const base = (import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/');
  return `${base}assets/bouquets/sprites/${id}.png`;
}

export function getBouquetArtSpriteKey(id: BouquetId): string {
  return `bouquet_art_${id}`;
}
