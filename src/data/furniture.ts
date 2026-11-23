export interface FurnitureDefinition {
  id: string;
  name: string;
  description: string;
  spriteKey: string;
  price: number;
  widthTiles: number;
  heightTiles: number;
  /** True if the player can walk over it (e.g. rugs) */
  walkable: boolean;
}

export interface PlacedFurniture {
  uid: string;
  furnitureId: string;
  x: number;
  y: number;
}

export const FURNITURE_CATALOG: Record<string, FurnitureDefinition> = {
  furn_rug: {
    id: 'furn_rug',
    name: '田园编织地毯',
    description: '温暖红米条纹地毯，铺在地板上可自由行走',
    spriteKey: 'furn_rug',
    price: 60,
    widthTiles: 2,
    heightTiles: 2,
    walkable: true,
  },
  furn_plant: {
    id: 'furn_plant',
    name: '陶盆绿植',
    description: '生机勃勃的室内观叶盆栽',
    spriteKey: 'furn_plant',
    price: 45,
    widthTiles: 1,
    heightTiles: 1,
    walkable: false,
  },
  furn_bookshelf: {
    id: 'furn_bookshelf',
    name: '原木书架',
    description: '摆满农学笔记与小镇故事书的实木书架',
    spriteKey: 'furn_bookshelf',
    price: 110,
    widthTiles: 2,
    heightTiles: 1,
    walkable: false,
  },
  furn_table: {
    id: 'furn_table',
    name: '橡木小圆桌',
    description: '手工打磨的温润木桌，适合摆放茶点',
    spriteKey: 'furn_table',
    price: 85,
    widthTiles: 1,
    heightTiles: 1,
    walkable: false,
  },
  furn_vase: {
    id: 'furn_vase',
    name: '向日葵花瓶',
    description: '插着新鲜田园花束的陶瓷花瓶',
    spriteKey: 'furn_vase',
    price: 55,
    widthTiles: 1,
    heightTiles: 1,
    walkable: false,
  },
  furn_lamp: {
    id: 'furn_lamp',
    name: '暖光木台灯',
    description: '夜晚为农舍增添琥珀色暖光的落地小灯',
    spriteKey: 'furn_lamp',
    price: 75,
    widthTiles: 1,
    heightTiles: 1,
    walkable: false,
  },
};

export const FURNITURE_SHOP_IDS = [
  'furn_plant',
  'furn_rug',
  'furn_vase',
  'furn_lamp',
  'furn_table',
  'furn_bookshelf',
] as const;

export function getFurnitureDef(id: string): FurnitureDefinition | undefined {
  return FURNITURE_CATALOG[id];
}

export const STARTER_PLACED_FURNITURE: PlacedFurniture[] = [
  { uid: 'starter_rug_1', furnitureId: 'furn_rug', x: 6, y: 5 },
  { uid: 'starter_plant_1', furnitureId: 'furn_plant', x: 10, y: 3 },
  { uid: 'starter_table_1', furnitureId: 'furn_table', x: 8, y: 4 },
];

export const STARTER_OWNED_FURNITURE: Record<string, number> = {
  furn_vase: 1,
  furn_lamp: 1,
};
