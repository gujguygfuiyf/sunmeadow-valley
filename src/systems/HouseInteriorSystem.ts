import {
  getFurnitureDef,
  STARTER_OWNED_FURNITURE,
  STARTER_PLACED_FURNITURE,
  type PlacedFurniture,
} from '../data/furniture';
import { TILE_SIZE } from '../data/worldConfig';
import type { CollisionGrid } from './PlayerSystem';

export const HOUSE_COLS = 14;
export const HOUSE_ROWS = 11;

export const HOUSE_FIXTURES = {
  /** Bed footprint on left side of cabin */
  bed: { x: 2, y: 3, w: 2, h: 2 },
  /** Cozy stone fireplace centered along north wall */
  fireplace: { x: 6, y: 1, w: 2, h: 1 },
  /** Interactive retro TV for tomorrow's weather forecast & farming tips */
  tv: { x: 4, y: 2, w: 1, h: 1 },
  /** Interactive Kitchen Stove & Counter for cooking stamina dishes */
  kitchen: { x: 10, y: 2, w: 2, h: 1 },
  /** Cozy candlelit strawberry birthday cake table for Yiyi's 12.03 celebration */
  birthdayTable: { x: 9, y: 6, w: 2, h: 1 },
  /** Exit doormat at south doorway */
  doorExit: { x: 6, y: 9, w: 2, h: 1 },
  /** Spawn position when entering from the farm porch */
  entrySpawn: { x: 7, y: 8.4 },
  /** Wake-up position next to the bed after sleeping */
  bedWakeSpawn: { x: 4.5, y: 4.5 },
} as const;

/**
 * Manages the farmhouse interior floor layout, fixed fixtures (Bed, TV, Kitchen, Fireplace),
 * placed furniture collision, owned furniture storage, and interior decoration placement/pickup.
 */
export class HouseInteriorSystem implements CollisionGrid {
  readonly cols = HOUSE_COLS;
  readonly rows = HOUSE_ROWS;
  readonly tileSize = TILE_SIZE;

  placed: PlacedFurniture[] = [];
  owned: Record<string, number> = {};

  private uidSeq = 1;

  constructor() {
    this.resetToStarter();
  }

  get worldWidth(): number {
    return this.cols * this.tileSize;
  }

  get worldHeight(): number {
    return this.rows * this.tileSize;
  }

  resetToStarter(): void {
    this.placed = STARTER_PLACED_FURNITURE.map((f) => ({ ...f }));
    this.owned = { ...STARTER_OWNED_FURNITURE };
    this.uidSeq = 100;
  }

  inFloorBounds(tx: number, ty: number): boolean {
    return tx >= 1 && tx <= this.cols - 2 && ty >= 2 && ty <= this.rows - 2;
  }

  isSolid(tx: number, ty: number): boolean {
    if (!this.inFloorBounds(tx, ty)) return true;

    if (isInside(tx, ty, HOUSE_FIXTURES.bed)) return true;
    if (isInside(tx, ty, HOUSE_FIXTURES.tv)) return true;
    if (isInside(tx, ty, HOUSE_FIXTURES.kitchen)) return true;
    if (isInside(tx, ty, HOUSE_FIXTURES.birthdayTable)) return true;

    for (const item of this.placed) {
      const def = getFurnitureDef(item.furnitureId);
      if (!def || def.walkable) continue;
      if (
        tx >= item.x &&
        tx < item.x + def.widthTiles &&
        ty >= item.y &&
        ty < item.y + def.heightTiles
      ) {
        return true;
      }
    }

    return false;
  }

  isBedZone(tx: number, ty: number): boolean {
    const b = HOUSE_FIXTURES.bed;
    return tx >= b.x - 1 && tx <= b.x + b.w && ty >= b.y - 1 && ty <= b.y + b.h;
  }

  isTvZone(tx: number, ty: number): boolean {
    const t = HOUSE_FIXTURES.tv;
    return Math.abs(tx - t.x) <= 1 && Math.abs(ty - t.y) <= 1;
  }

  isKitchenZone(tx: number, ty: number): boolean {
    const k = HOUSE_FIXTURES.kitchen;
    return tx >= k.x - 1 && tx <= k.x + k.w && ty >= k.y - 1 && ty <= k.y + k.h;
  }

  isBirthdayTableZone(tx: number, ty: number): boolean {
    const t = HOUSE_FIXTURES.birthdayTable;
    return tx >= t.x - 1 && tx <= t.x + t.w && ty >= t.y - 1 && ty <= t.y + t.h;
  }

  isDoorExitTile(tx: number, ty: number): boolean {
    return isInside(tx, ty, HOUSE_FIXTURES.doorExit);
  }

  getOwnedCount(furnitureId: string): number {
    return this.owned[furnitureId] ?? 0;
  }

  addOwnedFurniture(furnitureId: string, quantity = 1): void {
    if (!getFurnitureDef(furnitureId) || quantity <= 0) return;
    this.owned[furnitureId] = (this.owned[furnitureId] ?? 0) + quantity;
  }

  getOwnedFurnitureList(): { furnitureId: string; quantity: number }[] {
    return Object.entries(this.owned)
      .filter(([, qty]) => qty > 0)
      .map(([furnitureId, quantity]) => ({ furnitureId, quantity }));
  }

  canPlaceFurniture(
    furnitureId: string,
    tx: number,
    ty: number,
    playerTileX?: number,
    playerTileY?: number
  ): boolean {
    const def = getFurnitureDef(furnitureId);
    if (!def) return false;
    if (this.getOwnedCount(furnitureId) <= 0) return false;

    for (let dy = 0; dy < def.heightTiles; dy++) {
      for (let dx = 0; dx < def.widthTiles; dx++) {
        const cx = tx + dx;
        const cy = ty + dy;

        if (!this.inFloorBounds(cx, cy)) return false;
        if (isInside(cx, cy, HOUSE_FIXTURES.bed)) return false;
        if (isInside(cx, cy, HOUSE_FIXTURES.tv)) return false;
        if (isInside(cx, cy, HOUSE_FIXTURES.kitchen)) return false;
        if (isInside(cx, cy, HOUSE_FIXTURES.birthdayTable)) return false;
        if (isInside(cx, cy, HOUSE_FIXTURES.doorExit)) return false;

        if (!def.walkable && playerTileX === cx && playerTileY === cy) {
          return false;
        }

        for (const existing of this.placed) {
          const exDef = getFurnitureDef(existing.furnitureId);
          if (!exDef) continue;
          const overlaps =
            cx >= existing.x &&
            cx < existing.x + exDef.widthTiles &&
            cy >= existing.y &&
            cy < existing.y + exDef.heightTiles;
          if (!overlaps) continue;

          if (def.walkable === exDef.walkable) return false;
          if (def.walkable && !exDef.walkable) return false;
        }
      }
    }

    return true;
  }

  placeFurniture(
    furnitureId: string,
    tx: number,
    ty: number,
    playerTileX?: number,
    playerTileY?: number
  ): PlacedFurniture | null {
    if (!this.canPlaceFurniture(furnitureId, tx, ty, playerTileX, playerTileY)) {
      return null;
    }

    this.owned[furnitureId] = Math.max(0, (this.owned[furnitureId] ?? 0) - 1);
    if (this.owned[furnitureId] === 0) {
      delete this.owned[furnitureId];
    }

    const entry: PlacedFurniture = {
      uid: `furn_${Date.now()}_${this.uidSeq++}`,
      furnitureId,
      x: tx,
      y: ty,
    };
    this.placed.push(entry);
    return entry;
  }

  pickupFurnitureAt(tx: number, ty: number): PlacedFurniture | null {
    let matchIndex = -1;
    for (let i = this.placed.length - 1; i >= 0; i--) {
      const item = this.placed[i];
      const def = getFurnitureDef(item.furnitureId);
      if (!def) continue;
      if (
        tx >= item.x &&
        tx < item.x + def.widthTiles &&
        ty >= item.y &&
        ty < item.y + def.heightTiles
      ) {
        if (!def.walkable) {
          matchIndex = i;
          break;
        }
        if (matchIndex === -1) matchIndex = i;
      }
    }

    if (matchIndex === -1) return null;
    const [removed] = this.placed.splice(matchIndex, 1);
    this.addOwnedFurniture(removed.furnitureId, 1);
    return removed;
  }

  serialize(): { placed: PlacedFurniture[]; owned: Record<string, number> } {
    return {
      placed: this.placed.map((p) => ({ ...p })),
      owned: { ...this.owned },
    };
  }

  load(placed?: PlacedFurniture[], owned?: Record<string, number>): void {
    if (Array.isArray(placed)) {
      this.placed = placed
        .filter((p) => Boolean(getFurnitureDef(p.furnitureId)))
        .map((p) => ({ ...p }));
    } else {
      this.placed = STARTER_PLACED_FURNITURE.map((f) => ({ ...f }));
    }

    if (owned && typeof owned === 'object') {
      this.owned = {};
      for (const [id, qty] of Object.entries(owned)) {
        if (getFurnitureDef(id) && typeof qty === 'number' && qty > 0) {
          this.owned[id] = Math.floor(qty);
        }
      }
    } else {
      this.owned = { ...STARTER_OWNED_FURNITURE };
    }
  }
}

function isInside(
  x: number,
  y: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}
