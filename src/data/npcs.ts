import type { SeasonId } from './crops';

export type GiftReaction = 'loved' | 'liked' | 'neutral';

export interface NpcWaypoint {
  tileX: number;
  tileY: number;
  pauseSeconds: number;
}

export interface HeartEventDef {
  heartsRequired: 2 | 4;
  title: string;
  lines: string[];
  rewardType: 'recipe' | 'furniture' | 'gold';
  rewardId?: string;
  rewardGold?: number;
  rewardText: string;
}

export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  bio: string;
  spriteKey: string;
  portraitKey: string;
  shopKind?: 'seeds' | 'furniture' | 'blacksmith';
  lovedItemIds: string[];
  likedItemIds: string[];
  /** Time-of-day waypoint schedules */
  schedules: {
    morning: NpcWaypoint[]; // 06:00 - 11:59
    afternoon: NpcWaypoint[]; // 12:00 - 17:59
    evening: NpcWaypoint[]; // 18:00 - 24:00
  };
  festivalDialogues: Record<SeasonId, string>;
  heartEvents: HeartEventDef[];
  dialogues: {
    tier0: string[];
    tier1: string[];
    tier2: string[];
    giftLoved: string;
    giftLiked: string;
    giftNeutral: string;
    alreadyGifted: string;
  };
}

export const NPC_CATALOG: Record<string, NpcDefinition> = {
  emily: {
    id: 'emily',
    name: '艾米丽',
    role: '花艺与裁缝姑娘',
    bio: '热爱鲜花、宝石与手工布艺，随时间在喷泉广场与花坛间漫步。',
    spriteKey: 'npc_emily',
    portraitKey: 'portrait_emily',
    lovedItemIds: ['crop_tulip', 'crop_strawberry', 'prod_wool', 'gem_amethyst', 'gem_ruby'],
    likedItemIds: ['crop_parsnip', 'crop_blueberry', 'art_jam', 'food_berry_toast'],
    schedules: {
      morning: [
        { tileX: 10, tileY: 11, pauseSeconds: 4.0 },
        { tileX: 11, tileY: 14, pauseSeconds: 4.0 },
      ],
      afternoon: [
        { tileX: 11, tileY: 11, pauseSeconds: 3.5 },
        { tileX: 16, tileY: 11, pauseSeconds: 3.5 },
        { tileX: 16, tileY: 14, pauseSeconds: 4.0 },
        { tileX: 11, tileY: 14, pauseSeconds: 3.5 },
      ],
      evening: [
        { tileX: 9, tileY: 13, pauseSeconds: 5.0 },
        { tileX: 11, tileY: 15, pauseSeconds: 4.5 },
      ],
    },
    festivalDialogues: {
      spring: '春季花舞节快乐！我通宵缝制了彩色花环，广场是不是像童话一样？',
      summer: '夏日篝火节的晚风好温柔，大家围着喷泉赏星聊天真幸福！',
      fall: '晨露展览会开始了！今年你种出的农产品一定是最耀眼的展品！',
      winter: '冬日星光夜快乐！愿温暖的灯光陪伴你度过每一个丰收之年。',
    },
    heartEvents: [
      {
        heartsRequired: 2,
        title: '♥ 2心剧情 · 广场花语与暖灯',
        lines: [
          '艾米丽手里捧着一束刚编好的野花微笑着走向你：“最近晨露谷的风景因为你的农场变得越来越有生机了！”',
          '“我用新收的棉麻和木料做了一盏手工花瓶送你，摆在农舍小屋里一定特别温馨！”',
        ],
        rewardType: 'furniture',
        rewardId: 'furn_vase',
        rewardText: '获赠纪念家具【向日葵花瓶 ×1】！',
      },
      {
        heartsRequired: 4,
        title: '♥♥♥♥ 4心剧情 · 晨露秘传金瓜派',
        lines: [
          '艾米丽从布袋里拿出一本手绘食谱：“这是我奶奶传下来的肉桂金瓜派秘方，只有最要好的朋友我才会分享哦。”',
          '“以后去矿洞探险或者忙农活累了，记得在农舍厨房烤一个补充体力！”',
        ],
        rewardType: 'recipe',
        rewardId: 'recipe_pumpkin_pie',
        rewardText: '解锁农舍厨房秘方【肉桂金瓜派】！',
      },
    ],
    dialogues: {
      tier0: [
        '早安呀，农场主！晨露谷的微风是不是特别舒服？',
        '喷泉边的花坛刚抽芽呢，如果你种出郁金香或收集到羊毛，一定要给我看看！',
        '听说雨天水塘里的鱼群会不一样，你也可以去试着抛竿钓钓鱼。',
      ],
      tier1: [
        '每次看到你走过广场，我都觉得空气里弥漫着阳光和花果的香气！',
        '农舍里的电视每天都会预报明天的天气，下雨天就不用辛苦浇水啦。',
        '社区中心重新修缮的话，整个晨露谷都会焕发新的活力！',
      ],
      tier2: [
        '认识你以后，晨露小镇比以前热闹温柔了好多倍！',
        '无论今天收获多寡，累了就来广场找我聊聊，我永远为你加油。',
      ],
      giftLoved: '天哪，这正是我最喜欢的！色泽太美了，我要好好珍藏起来，谢谢你！',
      giftLiked: '哇，是你亲手准备的吗？新鲜又暖心，非常感谢！',
      giftNeutral: '谢谢你的心意！我会好好收下的。',
      alreadyGifted: '今天你已经送过我礼物啦，心意我满满收到了！',
    },
  },

  pierre: {
    id: 'pierre',
    name: '皮埃尔',
    role: '杂货铺老板',
    bio: '经营晨露杂货铺，供应四季精选种子并高价收购农产与加工品。',
    spriteKey: 'npc_pierre',
    portraitKey: 'portrait_pierre',
    shopKind: 'seeds',
    lovedItemIds: ['crop_pumpkin', 'crop_melon', 'art_wine', 'food_pumpkin_pie'],
    likedItemIds: ['crop_parsnip', 'crop_strawberry', 'art_jam', 'art_cheese'],
    schedules: {
      morning: [
        { tileX: 8, tileY: 7, pauseSeconds: 5.5 },
        { tileX: 10, tileY: 7, pauseSeconds: 4.0 },
      ],
      afternoon: [
        { tileX: 8, tileY: 7, pauseSeconds: 4.5 },
        { tileX: 12, tileY: 9, pauseSeconds: 4.0 },
      ],
      evening: [
        { tileX: 10, tileY: 12, pauseSeconds: 5.0 },
        { tileX: 8, tileY: 8, pauseSeconds: 4.5 },
      ],
    },
    festivalDialogues: {
      spring: '花舞节好！趁着好春光，多囤点防风草和草莓种子准没错！',
      summer: '夏日炎炎，来个清甜的粉甜蜜瓜或者蓝莓最解暑了！',
      fall: '展览会是展示你农场实力的好舞台，果酒和南瓜可是镇上抢手货！',
      winter: '冬日星光夜快乐！如果解锁了温室，冬天照样能种出四季佳果！',
    },
    heartEvents: [
      {
        heartsRequired: 2,
        title: '♥ 2心剧情 · 杂货铺的感谢金',
        lines: [
          '皮埃尔笑着拍了拍你的肩膀：“你提供的鲜果和工匠制品让晨露杂货铺口碑暴涨！”',
          '“这是给你的金牌供货商分红，再附赠一张金瓜派食谱，咱们继续合作共赢！”',
        ],
        rewardType: 'recipe',
        rewardId: 'recipe_pumpkin_pie',
        rewardText: '解锁农舍厨房秘方【肉桂金瓜派】！',
      },
      {
        heartsRequired: 4,
        title: '♥♥♥♥ 4心剧情 · 晨露金牌农场主',
        lines: [
          '皮埃尔激动地拿出一袋沉甸甸的金币：“镇上每个人都夸赞晨露农场的品质！”',
          '“这 500 G 是杂货铺年度分红，请务必收下！”',
        ],
        rewardType: 'gold',
        rewardGold: 500,
        rewardText: '获得皮埃尔分红【+500 G】！',
      },
    ],
    dialogues: {
      tier0: [
        '欢迎光临晨露杂货铺！每个季节货架都会换上当季最棒的种子。',
        '把作物放进果酱桶或酿酒桶再拿来卖，利润可是直接翻倍！',
        '广场公告栏每天都有村民发布的求助委托，报酬比平时高出一大截哦。',
      ],
      tier1: [
        '哈哈，你种出来的农产品品质越来越棒，镇上客人都抢着买！',
        '如果在社区中心修复了温室，四季的种子你都能全年种植！',
      ],
      tier2: [
        '有你这样的金牌农场主做伙伴，晨露杂货铺的招牌越来越亮了！',
        '随时来铺子喝杯热茶，老朋友永远最受欢迎。',
      ],
      giftLoved: '嚯！这品质堪称顶级！我太喜欢这个了，真是行家手艺！',
      giftLiked: '成色真不错，一看就是用心照料的，多谢你啦！',
      giftNeutral: '哦，谢谢你送来的东西，客气啦！',
      alreadyGifted: '今天已经收过你的大礼啦，留着明天再聊生意吧！',
    },
  },

  robin: {
    id: 'robin',
    name: '罗宾',
    role: '木匠与牧场建筑师',
    bio: '手艺精湛的木工大师，负责建造鸡舍、畜棚、领养牧场动物与制作精美家具。',
    spriteKey: 'npc_robin',
    portraitKey: 'portrait_robin',
    shopKind: 'furniture',
    lovedItemIds: ['crop_pumpkin', 'crop_strawberry', 'art_cheese', 'food_omelet'],
    likedItemIds: ['crop_parsnip', 'crop_melon', 'prod_milk', 'prod_egg'],
    schedules: {
      morning: [
        { tileX: 20, tileY: 7, pauseSeconds: 5.0 },
        { tileX: 22, tileY: 7, pauseSeconds: 4.0 },
      ],
      afternoon: [
        { tileX: 19, tileY: 9, pauseSeconds: 4.0 },
        { tileX: 16, tileY: 12, pauseSeconds: 4.5 },
      ],
      evening: [
        { tileX: 17, tileY: 13, pauseSeconds: 5.0 },
        { tileX: 20, tileY: 8, pauseSeconds: 4.0 },
      ],
    },
    festivalDialogues: {
      spring: '广场上的彩旗木架都是我亲手搭的，花舞节玩得开心点！',
      summer: '夏天的木材纹理最干爽，正是盖鸡舍和大畜棚的好时节！',
      fall: '展览会的木展台结实吧？听说你的牧场越办越红火啦！',
      winter: '冬日星光夜快乐！农舍壁炉烧得暖暖的，别忘了常回家烤烤火。',
    },
    heartEvents: [
      {
        heartsRequired: 2,
        title: '♥ 2心剧情 · 匠人手制暖光台灯',
        lines: [
          '罗宾递给你一盏刚上完清漆的木质台灯：“看你把农舍收拾得这么用心，我特意用上好红杉木做了这盏台灯。”',
          '“摆在床边，夜里回来就能看到温暖的光啦！”',
        ],
        rewardType: 'furniture',
        rewardId: 'furn_lamp',
        rewardText: '获赠纪念家具【暖光木台灯 ×1】！',
      },
      {
        heartsRequired: 4,
        title: '♥♥♥♥ 4心剧情 · 珍藏原木书架',
        lines: [
          '罗宾擦了擦额头的汗笑着说：“这是我最得意的一件作品——整木榫卯书架！”',
          '“已经帮你放到农舍家具收纳箱啦，回家按 F 就能摆出来！”',
        ],
        rewardType: 'furniture',
        rewardId: 'furn_bookshelf',
        rewardText: '获赠限定家具【原木书架 ×1】！',
      },
    ],
    dialogues: {
      tier0: [
        '嗨！想养小鸡、奶牛或者绵羊吗？来我木工坊就能建造【鸡舍】和【畜棚】哦！',
        '用斧头砍伐农场野树收集木材，既能开拓大片耕地，又能打造储物箱和牧场建筑。',
        '农舍小屋按 F 就能随时开启装修模式，把新买的家具自由摆放！',
      ],
      tier1: [
        '看到你的农场从杂草丛生变得井井有条，作为木匠我真替你骄傲！',
        '别忘了每天摸摸鸡舍和畜棚的小动物，它们开心就会产更多好东西！',
      ],
      tier2: [
        '你已经完全成为晨露谷的灵魂人物了！以后想建任何梦想庄园都包在我身上！',
        '累了一天回到亲手布置的小屋吃顿热汤，这就是最棒的田园生活！',
      ],
      giftLoved: '哇塞！干完木工活能收到最爱的美味，太幸福了吧，谢啦！',
      giftLiked: '真棒！农场出品就是新鲜，谢谢你特地带给我！',
      giftNeutral: '多谢啦！挺有意思的小礼物。',
      alreadyGifted: '今天已经收过你的礼物啦，等明天再来木工坊逛逛吧！',
    },
  },

  clint: {
    id: 'clint',
    name: '克林特',
    role: '小镇铁匠',
    bio: '守着炽热锻炉的沉默铁匠，擅长用铜铁金锭为你把农具升级至大范围蓄力神器。',
    spriteKey: 'npc_clint',
    portraitKey: 'portrait_clint',
    shopKind: 'blacksmith',
    lovedItemIds: ['gem_amethyst', 'gem_emerald', 'gem_ruby', 'bar_gold'],
    likedItemIds: ['bar_copper', 'bar_iron', 'crop_parsnip', 'food_fried_fish'],
    schedules: {
      morning: [
        { tileX: 22, tileY: 14, pauseSeconds: 5.5 },
        { tileX: 24, tileY: 14, pauseSeconds: 4.0 },
      ],
      afternoon: [
        { tileX: 22, tileY: 14, pauseSeconds: 5.0 },
        { tileX: 19, tileY: 14, pauseSeconds: 4.0 },
      ],
      evening: [
        { tileX: 16, tileY: 15, pauseSeconds: 5.0 },
        { tileX: 21, tileY: 15, pauseSeconds: 4.5 },
      ],
    },
    festivalDialogues: {
      spring: '花舞节难得离开锻炉透透气……希望你的农具还趁手。',
      summer: '锻炉夏天太热了，不过能看到大家开心的笑脸也挺值得。',
      fall: '展览会快乐！如果在矿洞挖到紫水晶或红宝石，欢迎随时带来给我鉴赏。',
      winter: '冬天在铁匠铺烤火最舒服，需要升级黄金工具随时找我！',
    },
    heartEvents: [
      {
        heartsRequired: 2,
        title: '♥ 2心剧情 · 铁匠的矿洞秘诀',
        lines: [
          '克林特递给你一把磨得发亮的试锤：“看你常往东北山路的矿洞跑，这 250 G 算我赞助你的探险经费！”',
          '“记得在 5 层以下多留意铁矿石，做出优质洒水器后种田会轻松十倍！”',
        ],
        rewardType: 'gold',
        rewardGold: 250,
        rewardText: '获得克林特探险赞助【+250 G】！',
      },
      {
        heartsRequired: 4,
        title: '♥♥♥♥ 4心剧情 · 锻造大师的赠礼',
        lines: [
          '克林特难得露出了爽朗的笑容：“你是我见过最有毅力的矿工和农夫！”',
          '“这 600 G 是帮矿业公会代发的地质探索奖金，请收下吧！”',
        ],
        rewardType: 'gold',
        rewardGold: 600,
        rewardText: '获得地质探索奖金【+600 G】！',
      },
    ],
    dialogues: {
      tier0: [
        '你好，我是铁匠克林特。从农场东北山路可以进入【晨露矿洞】采矿。',
        '把挖到的矿石放进石砌熔炉熔成铜锭、铁锭或金锭，来找我就能升级锄头、喷壶、斧头和十字镐！',
        '升级后的锄头和喷壶可以一次作用 3 格甚至 3×3 九宫格，效率极高。',
      ],
      tier1: [
        '矿洞每深入 5 层就会出现更稀有的矿脉和宝石，记得带上铁剑和热饭防身。',
        '把铜矿、铁矿和紫水晶献祭给社区中心，还能修好矿洞全层直达电梯！',
      ],
      tier2: [
        '能结识你这样的朋友，连打铁的叮当声都听起来格外轻快了。',
        '随时带着宝石和矿石来铁匠铺坐坐，我这儿炉火常暖！',
      ],
      giftLoved: '哇……这成色、这火彩！太不可思议了，这是我收到过最棒的礼物！',
      giftLiked: '哦，实用的好东西！谢谢你特意送来！',
      giftNeutral: '嗯，多谢你的心意。',
      alreadyGifted: '今天已经收过你的礼物了，留着自己用吧！',
    },
  },
};

export const NPC_IDS = ['emily', 'pierre', 'robin', 'clint'] as const;

export function getNpcDef(id: string): NpcDefinition | undefined {
  return NPC_CATALOG[id];
}
