export const TILE_SIZE = 16;
export const DEFAULT_CAMERA_ZOOM = 3;
export const TOWN_ENTRY = { x: 2.2, y: 9.5, facing: 'right' } as const;

export const MAP_COLS = 30;
export const MAP_ROWS = 22;

export const MAX_WATER_LEVEL = 20;
export const STARTING_GOLD = 300;
export const HOTBAR_SIZE = 9;
export const BACKPACK_SIZE = 36;
export const CHEST_SIZE = 24;

export interface RectArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Semantic layout landmarks for the starter farm map.
 */
export const FARM_LAYOUT = {
  /** Cozy farmhouse footprint (5x4 tiles) */
  house: { x: 4, y: 2, w: 5, h: 4 } as RectArea,
  /** Interactive porch door tile in front of the house */
  houseDoor: { x: 6, y: 6 },
  /** Cozy outdoor pet water bowl beside the farmhouse */
  petBowl: { x: 9, y: 4, w: 1, h: 1 } as RectArea,
  /** Shipping bin directly east of the farmhouse */
  shippingBin: { x: 10, y: 5, w: 2, h: 1 } as RectArea,
  /** Seed stall on the northeastern path */
  seedStall: { x: 19, y: 3, w: 3, h: 2 } as RectArea,
  /** North-East Mountain Trail entrance to The Mines */
  mineTrail: { x: 24, y: 0, w: 3, h: 2 } as RectArea,
  /** Seasonal Greenhouse plot (unlocked via Spring Crops Bundle) */
  greenhouse: { x: 13, y: 1, w: 5, h: 4 } as RectArea,
  /** Greenhouse fertile interior soil tiles (year-round planting!) */
  greenhousePlot: { x: 14, y: 2, w: 3, h: 2 } as RectArea,
  /** Shimmering farm pond for refilling watering can & fishing */
  pond: { x: 21, y: 12, w: 5, h: 4 } as RectArea,
  /** Coop pad (constructed by Robin) */
  coopPad: { x: 20, y: 17, w: 3, h: 2 } as RectArea,
  /** Barn pad (constructed by Robin) */
  barnPad: { x: 24, y: 17, w: 4, h: 2 } as RectArea,
  /** Main sunny tillable farmland clearing */
  farmPlot: { x: 5, y: 9, w: 13, h: 9 } as RectArea,
  /** Player initial spawn position (in tile coordinates) */
  spawnTile: { x: 6.5, y: 7.4 },
} as const;

export const STARTER_INVENTORY: { itemId: string; quantity: number }[] = [
  { itemId: 'tool_hoe', quantity: 1 },
  { itemId: 'tool_watering_can', quantity: 1 },
  { itemId: 'tool_axe', quantity: 1 },
  { itemId: 'tool_pickaxe', quantity: 1 },
  { itemId: 'tool_scythe', quantity: 1 },
  { itemId: 'tool_fishing_rod', quantity: 1 },
  { itemId: 'tool_sword', quantity: 1 },
  { itemId: 'seed_parsnip', quantity: 8 },
  { itemId: 'seed_tulip', quantity: 4 },
  { itemId: 'seed_strawberry', quantity: 2 },
  { itemId: 'tool_hand', quantity: 1 },
];
