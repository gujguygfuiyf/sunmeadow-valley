# 晨露谷物语 (Sunmeadow Valley) · 完整工程架构指南

本项目采用 **TypeScript + HTML5 Canvas + Vite** 构建，实现了涵盖五大星露谷核心支柱的完整 2D 像素田园模拟游戏框架。

## 目录结构

```text
src/
├── core/
│   └── GameWorld.ts            # 跨场景共享的世界状态中枢（日结、天气、机器、牧场、矿洞、献祭与 v3 存档）
├── engine/                     # 2D 像素游戏引擎核心层
│   ├── GameLoop.ts             # 固定时间步长 (Fixed Timestep) 驱动循环
│   ├── EventBus.ts             # 强类型事件总线
│   ├── Camera.ts               # 像素对齐平滑跟随摄像机
│   ├── InputManager.ts         # 键盘/鼠标/长按控竿与全局快捷键管理
│   ├── SpriteAtlas.ts          # 精灵注册表（支持 loadImage 与 loadSpriteSheet 外部 PNG 图集切分）
│   ├── PixelArtExpansion.ts    # 室内、家具、小镇与立绘像素生成器
│   ├── PixelArtFullExpansion.ts# 四季地形、工具、矿物、鱼类、料理、机器、鸡舍畜棚、动物与矿洞像素生成器
│   ├── TiledMapLoader.ts       # 标准 Tiled JSON (.tmj) 地图解析与异步加载器
│   ├── AudioManager.ts         # Web Audio 复古音效 + 四季田园 BGM 合成器
│   └── SaveManager.ts          # Schema v3 版本化持久化（自动向后兼容 v1/v2 存档）
├── data/                       # 纯数据驱动配置表
│   ├── items.ts                # 工具、四季种子/作物、资源、矿石/金属锭/宝石、鱼类、制品、料理与机器
│   ├── crops.ts                # 春夏秋冬 4 季作物生长周期与重复采摘规则
│   ├── fish.ts                 # 5 种鱼类难度与天气/季节钓获权重
│   ├── recipes.ts              # 农舍厨房烹饪食谱
│   ├── crafting.ts             # 12 种制作配方（储物箱、稻草人、熔炉、洒水器、加工桶、围栏小路）
│   ├── animals.ts              # 鸡舍、畜棚与咯咯鸡/花斑奶牛/蓬蓬绵羊配置
│   ├── bundles.ts              # 4 大社区中心收集包奖励与全收集图鉴分类
│   ├── mining.ts               # 铜/铁/金农具升级表与矿洞矿脉配置
│   ├── furniture.ts            # 农舍可摆放家具目录
│   ├── npcs.ts                 # 4 位村民（艾米丽/皮埃尔/罗宾/克林特）早午晚日程、节日台词与 2/4 心剧情
│   ├── worldConfig.ts          # 农场布局、温室/鸡舍/畜棚/矿洞山路与 36 格背包配置
│   └── events.ts               # 强类型全局事件契约
├── systems/                    # 独立可测试的玩法系统层
│   ├── TimeSystem.ts           # 四季轮替、昼夜时钟与每季 14 日小镇节日
│   ├── WeatherSystem.ts        # 晴/微风/雨/雷雨天气、明日电视预报、雨天自动浇水与粒子特效
│   ├── PlayerStatsSystem.ts    # 体力/生命值、铜铁金农具蓄力范围计算与食谱解锁
│   ├── TileMapSystem.ts        # 农场地形、可砍伐野树/岩石/杂草、温室/牧场建筑地基
│   ├── CropSystem.ts           # 四季种植校验、温室全年免枯萎与稻草人防乌鸦
│   ├── MachineSystem.ts        # 洒水器、稻草人、24 格储物箱、熔炉与 5 种工匠加工桶
│   ├── FishingSystem.ts        # 经典星露谷垂直绿条惯性追鱼小游戏
│   ├── LivestockSystem.ts      # 鸡舍/畜棚与牧场动物巡游、每日抚摸与蛋奶羊毛产出
│   ├── MineSystem.ts           # 程序化地下矿洞（1-20F+）、矿脉/梯子与史莱姆近战战斗
│   ├── QuestSystem.ts          # 小镇公告栏每日求助委托
│   ├── CollectionSystem.ts     # 社区中心收集包献祭、永久解锁与全图鉴点亮
│   ├── NpcSystem.ts            # 村民分时巡逻 AI、节日对话、送礼与 2/4 心剧情事件
│   ├── HouseInteriorSystem.ts  # 农舍室内网格、电视/厨房/床铺与自由装修摆放
│   ├── InventorySystem.ts      # 36 格背包 + 9 格快捷栏、交换整理与出货箱结算
│   ├── PlayerSystem.ts         # 通用 CollisionGrid 角色移动碰撞
│   └── ParticleSystem.ts       # 泥土、水花、星光、爱心粒子与世界飘字
├── scenes/                     # 4 大可无缝漫游的场景
│   ├── SceneManager.ts         # 多场景注册与生命周期调度
│   ├── FarmScene.ts            # 晨露农场
│   ├── HouseInteriorScene.ts   # 农舍小屋（电视/厨房/床/装修）
│   ├── TownScene.ts            # 晨露小镇（杂货铺/社区中心/木工坊/铁匠铺/河畔垂钓/节日广场）
│   └── MineScene.ts            # 晨露矿洞（电梯/挖矿/史莱姆战斗）
└── ui/
    ├── MinimapRenderer.ts      # 四场景实时像素小地图渲染器
    └── HudController.ts        # 木质田园 HUD、钓鱼界面与 13 个功能弹窗
```

## 外部像素资源与 Tiled 地图工作流

- **替换外部像素精灵图集**：调用 `atlas.loadSpriteSheet('/assets/tiles.png', 16, 16, { grass_0: { col: 0, row: 0 }, ... })` 即可热替换任意程序化像素图。
- **加载 Tiled 地图**：参考 `public/maps/sample_clearing.tmj`，调用 `loadTiledMapFromUrl('/maps/sample_clearing.tmj')` 可直接解析 `ground`、`collision` 和 `objects` 图层。
