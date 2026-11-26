import {
  FARM_LAYOUT,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  type RectArea,
} from '../data/worldConfig';
import type { SerializedFarmNode, SerializedSoilTile } from '../engine/SaveManager';
import type { CollisionGrid } from './PlayerSystem';

export type GroundKind = 'grass' | 'dirt' | 'path' | 'water';
export type PropKind = 'none' | 'fence_h' | 'fence_v' | 'rock' | 'tree' | 'sign' | 'weed';
export type InteractiveZoneKind =
  | 'house_door'
  | 'mailbox'
  | 'pet_bowl'
  | 'shipping_bin'
  | 'seed_stall'
  | 'pond'
  | 'town_exit'
  | 'mine_exit'
  | 'greenhouse';

export interface TileCell {
  x: number;
  y: number;
  ground: GroundKind;
  variant: number;
  prop: PropKind;
  nodeHp: number;
  solid: boolean;
  farmable: boolean;
  tilled: boolean;
  watered: boolean;
}

export interface HarvestNodeResult {
  cleared: boolean;
  kind: 'tree' | 'rock' | 'weed';
  drops: { itemId: string; quantity: number }[];
}

/**
 * Multi-layer farm tilemap supporting tillable soil, rain auto-watering,
 * destructible wild trees/rocks/weeds, Greenhouse plot, Coop/Barn pads,
 * and portals to Farmhouse, Sunmeadow Town, and The Mines.
 */
export class TileMapSystem implements CollisionGrid {
  readonly cols = MAP_COLS;
  readonly rows = MAP_ROWS;
  readonly tileSize = TILE_SIZE;
  readonly grid: TileCell[][] = [];
  terrainRevision = 0;

  greenhouseUnlocked = false;
  coopBuilt = false;
  barnBuilt = false;

  constructor() {
    this.buildInitialFarmMap();
  }

  get worldWidth(): number {
    return this.cols * this.tileSize;
  }

  get worldHeight(): number {
    return this.rows * this.tileSize;
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows;
  }

  getTile(tx: number, ty: number): TileCell | null {
    if (!this.inBounds(tx, ty)) return null;
    return this.grid[ty][tx];
  }

  isSolid(tx: number, ty: number): boolean {
    const tile = this.getTile(tx, ty);
    if (!tile) return true;
    return tile.solid;
  }

  isGreenhouseSoilTile(tx: number, ty: number): boolean {
    return this.greenhouseUnlocked && isInsideRect(tx, ty, FARM_LAYOUT.greenhousePlot);
  }

  setGreenhouseUnlocked(unlocked: boolean): void {
    this.terrainRevision++;
    this.greenhouseUnlocked = unlocked;
    const gh = FARM_LAYOUT.greenhouse;
    for (let y = gh.y; y < gh.y + gh.h; y++) {
      for (let x = gh.x; x < gh.x + gh.w; x++) {
        const tile = this.getTile(x, y);
        if (!tile) continue;
        const isInteriorPlot = isInsideRect(x, y, FARM_LAYOUT.greenhousePlot);
        const isDoorRow = y === gh.y + gh.h - 1 && x === gh.x + 2;
        if (unlocked && (isInteriorPlot || isDoorRow)) {
          tile.solid = false;
          tile.farmable = isInteriorPlot;
          tile.ground = isInteriorPlot ? 'dirt' : 'path';
          if (isInteriorPlot) tile.tilled = true;
        } else {
          tile.solid = true;
          tile.farmable = false;
        }
      }
    }
  }

  setBuildingBuilt(kind: 'coop' | 'barn', built: boolean): void {
    this.terrainRevision++;
    if (kind === 'coop') {
      this.coopBuilt = built;
      this.applyBuildingPad(FARM_LAYOUT.coopPad, built);
    } else {
      this.barnBuilt = built;
      this.applyBuildingPad(FARM_LAYOUT.barnPad, built);
    }
  }

  private applyBuildingPad(rect: RectArea, built: boolean): void {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        const tile = this.getTile(x, y);
        if (!tile) continue;
        tile.solid = built;
        tile.farmable = false;
        if (built) {
          tile.prop = 'none';
          tile.nodeHp = 0;
        }
      }
    }
  }

  tillTile(tx: number, ty: number): boolean {
    const tile = this.getTile(tx, ty);
    if (!tile || tile.solid || !tile.farmable || tile.tilled) return false;
    if (tile.prop !== 'none') return false;
    tile.tilled = true;
    this.terrainRevision++;
    return true;
  }

  waterTile(tx: number, ty: number): boolean {
    const tile = this.getTile(tx, ty);
    if (!tile || !tile.tilled) return false;
    if (!tile.watered) this.terrainRevision++;
    tile.watered = true;
    return true;
  }

  /** Rainy/stormy mornings auto-water every tilled outdoor tile. */
  waterAllTilled(includeGreenhouse = false): number {
    this.terrainRevision++;
    let count = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (!cell.tilled) continue;
        if (!includeGreenhouse && this.isGreenhouseSoilTile(x, y)) continue;
        cell.watered = true;
        count += 1;
      }
    }
    return count;
  }

  isWatered(tx: number, ty: number): boolean {
    return this.getTile(tx, ty)?.watered ?? false;
  }

  isTilled(tx: number, ty: number): boolean {
    return this.getTile(tx, ty)?.tilled ?? false;
  }

  dryAllSoil(): void {
    this.terrainRevision++;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x].watered = false;
      }
    }
  }

  /** Damages a wild tree, rock, or weed on the farm. Clears & returns resource drops when HP hits 0. */
  hitWildNode(
    tx: number,
    ty: number,
    tool: 'axe' | 'pickaxe' | 'scythe',
    power = 1,
    rng: () => number = Math.random
  ): HarvestNodeResult | null {
    const tile = this.getTile(tx, ty);
    if (!tile) return null;

    if (tile.prop === 'tree' && tool === 'axe') {
      tile.nodeHp = Math.max(0, tile.nodeHp - power);
      if (tile.nodeHp <= 0) {
        tile.prop = 'none';
        tile.solid = false;
        tile.farmable = tile.ground === 'grass' || tile.ground === 'dirt';
        return {
          cleared: true,
          kind: 'tree',
          drops: [{ itemId: 'res_wood', quantity: 5 + Math.floor(rng() * 3) }],
        };
      }
      return { cleared: false, kind: 'tree', drops: [] };
    }

    if (tile.prop === 'rock' && tool === 'pickaxe') {
      tile.nodeHp = Math.max(0, tile.nodeHp - power);
      if (tile.nodeHp <= 0) {
        tile.prop = 'none';
        tile.solid = false;
        tile.farmable = tile.ground === 'grass' || tile.ground === 'dirt';
        const drops: { itemId: string; quantity: number }[] = [
          { itemId: 'res_stone', quantity: 3 + Math.floor(rng() * 3) },
        ];
        if (rng() < 0.35) {
          drops.push({ itemId: 'ore_copper', quantity: 1 });
        }
        return { cleared: true, kind: 'rock', drops };
      }
      return { cleared: false, kind: 'rock', drops: [] };
    }

    if (tile.prop === 'weed' && (tool === 'scythe' || tool === 'axe')) {
      tile.prop = 'none';
      tile.nodeHp = 0;
      tile.solid = false;
      const drops: { itemId: string; quantity: number }[] = [
        { itemId: 'res_fiber', quantity: 1 + Math.floor(rng() * 2) },
      ];
      if (rng() < 0.16) {
        drops.push({ itemId: 'seed_parsnip', quantity: 1 });
      }
      return { cleared: true, kind: 'weed', drops };
    }

    return null;
  }

  /** Lets the player freely lay crafted cobblestone paths or wooden fences on the farm. */
  placeFarmPathOrFence(tx: number, ty: number, kind: 'path' | 'fence'): boolean {
    const tile = this.getTile(tx, ty);
    if (!tile || tile.solid || tile.prop !== 'none' || tile.tilled) return false;
    if (kind === 'path') {
      if (tile.ground === 'path' || tile.ground === 'water') return false;
      tile.ground = 'path';
      this.terrainRevision++;
      tile.farmable = false;
      return true;
    }
    tile.prop = 'fence_h';
    tile.solid = true;
    tile.farmable = false;
    return true;
  }

  /** Spawns a handful of fresh wild weeds/stones on empty perimeter meadow tiles at new seasons. */
  respawnSeasonalDebris(rng: () => number = Math.random): void {
    let added = 0;
    for (let attempt = 0; attempt < 30 && added < 6; attempt++) {
      const tx = 2 + Math.floor(rng() * (this.cols - 5));
      const ty = 8 + Math.floor(rng() * (this.rows - 10));
      const tile = this.getTile(tx, ty);
      if (!tile || tile.solid || tile.tilled || tile.prop !== 'none' || tile.ground !== 'grass') {
        continue;
      }
      if (isInsideRect(tx, ty, FARM_LAYOUT.coopPad) || isInsideRect(tx, ty, FARM_LAYOUT.barnPad)) {
        continue;
      }
      if (rng() < 0.65) {
        tile.prop = 'weed';
        tile.nodeHp = 1;
      } else {
        tile.prop = 'rock';
        tile.nodeHp = 3;
        tile.solid = true;
      }
      added += 1;
    }
  }

  getInteractiveZoneAt(tx: number, ty: number): InteractiveZoneKind | null {
    if (
      (tx === FARM_LAYOUT.houseDoor.x && ty === FARM_LAYOUT.houseDoor.y) ||
      (tx === FARM_LAYOUT.houseDoor.x && ty === FARM_LAYOUT.houseDoor.y - 1)
    ) {
      return 'house_door';
    }
    if (isInsideRect(tx, ty, FARM_LAYOUT.mailbox)) return 'mailbox';
    if (isInsideRect(tx, ty, FARM_LAYOUT.petBowl)) return 'pet_bowl';
    if (isInsideRect(tx, ty, FARM_LAYOUT.shippingBin)) return 'shipping_bin';
    if (isInsideRect(tx, ty, FARM_LAYOUT.seedStall)) return 'seed_stall';
    if (isInsideRect(tx, ty, FARM_LAYOUT.pond)) return 'pond';
    if (tx >= this.cols - 2 && ty >= 6 && ty <= 8) return 'town_exit';
    if (isInsideRect(tx, ty, FARM_LAYOUT.mineTrail)) return 'mine_exit';
    if (!this.greenhouseUnlocked && isInsideRect(tx, ty, FARM_LAYOUT.greenhouse)) {
      return 'greenhouse';
    }
    return null;
  }

  getNearbyInteractiveZone(playerTileX: number, playerTileY: number): InteractiveZoneKind | null {
    const offsets = [
      [0, 0],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    for (const [ox, oy] of offsets) {
      const zone = this.getInteractiveZoneAt(playerTileX + ox, playerTileY + oy);
      if (zone) return zone;
    }
    return null;
  }

  serializeSoil(): SerializedSoilTile[] {
    const out: SerializedSoilTile[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.tilled) {
          out.push({ x, y, tilled: cell.tilled, watered: cell.watered });
        }
      }
    }
    return out;
  }

  serializeWildNodes(): SerializedFarmNode[] {
    const out: SerializedFarmNode[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.prop === 'tree' || cell.prop === 'rock' || cell.prop === 'weed') {
          out.push({ x, y, kind: cell.prop, hp: cell.nodeHp });
        }
      }
    }
    return out;
  }

  loadSoil(soilTiles: SerializedSoilTile[]): void {
    this.terrainRevision++;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x].tilled = false;
        this.grid[y][x].watered = false;
      }
    }
    for (const saved of soilTiles) {
      const cell = this.getTile(saved.x, saved.y);
      if (cell && cell.farmable && !cell.solid) {
        cell.tilled = saved.tilled;
        cell.watered = saved.watered;
      }
    }
  }

  loadWildNodes(nodes?: SerializedFarmNode[]): void {
    if (!Array.isArray(nodes)) return;
    // Clear default wild nodes first
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.prop === 'tree' || cell.prop === 'rock' || cell.prop === 'weed') {
          cell.prop = 'none';
          cell.nodeHp = 0;
          cell.solid = false;
        }
      }
    }
    for (const n of nodes) {
      const cell = this.getTile(n.x, n.y);
      if (!cell || cell.ground === 'water' || cell.ground === 'path') continue;
      cell.prop = n.kind;
      cell.nodeHp = n.hp;
      cell.solid = n.kind !== 'weed';
    }
  }

  resetToDefault(): void {
    this.greenhouseUnlocked = false;
    this.coopBuilt = false;
    this.barnBuilt = false;
    this.buildInitialFarmMap();
  }

  private buildInitialFarmMap(): void {
    this.grid.length = 0;

    for (let y = 0; y < this.rows; y++) {
      const row: TileCell[] = [];
      for (let x = 0; x < this.cols; x++) {
        const hash = deterministicHash(x, y);
        row.push({
          x,
          y,
          ground: 'grass',
          variant: hash % 12,
          prop: 'none',
          nodeHp: 0,
          solid: false,
          farmable: false,
          tilled: false,
          watered: false,
        });
      }
      this.grid.push(row);
    }

    // 1. Main sunlit tillable farmland clearing
    const plot = FARM_LAYOUT.farmPlot;
    for (let y = plot.y; y < plot.y + plot.h; y++) {
      for (let x = plot.x; x < plot.x + plot.w; x++) {
        const tile = this.grid[y][x];
        tile.ground = 'dirt';
        tile.variant = (x + y) % 2;
        tile.farmable = true;
      }
    }

    for (let y = plot.y - 1; y <= plot.y + plot.h; y++) {
      for (let x = plot.x - 1; x <= plot.x + plot.w; x++) {
        const tile = this.getTile(x, y);
        if (tile && tile.ground === 'grass') {
          tile.farmable = true;
        }
      }
    }

    // 2. Cobblestone paths connecting farmhouse, shipping bin, greenhouse, seed stall, mine trail, pond & East Town Road
    this.paintPath(6, 6, 6, 8);
    this.paintPath(6, 7, 29, 7);
    this.paintPath(20, 5, 20, 11);
    this.paintPath(10, 6, 11, 6);
    this.paintPath(15, 5, 15, 7); // path to Greenhouse
    this.paintPath(25, 2, 25, 7); // North-East trail to The Mines!
    this.paintPath(18, 13, 20, 13);
    this.paintPath(27, 6, 29, 8);

    const signTile = this.getTile(27, 5);
    if (signTile) {
      signTile.prop = 'sign';
      signTile.solid = true;
      signTile.farmable = false;
    }

    // 3. Solid landmarks
    this.markSolidRect(FARM_LAYOUT.house);
    this.markSolidRect(FARM_LAYOUT.mailbox);
    this.markSolidRect(FARM_LAYOUT.petBowl);
    this.markSolidRect(FARM_LAYOUT.shippingBin);
    this.markSolidRect(FARM_LAYOUT.seedStall);
    this.setGreenhouseUnlocked(false);

    // 4. Farm pond water tiles
    const pond = FARM_LAYOUT.pond;
    for (let y = pond.y; y < pond.y + pond.h; y++) {
      for (let x = pond.x; x < pond.x + pond.w; x++) {
        const tile = this.grid[y][x];
        tile.ground = 'water';
        tile.solid = true;
        tile.farmable = false;
      }
    }

    // 5. Decorative wooden farm fence bordering north & west edges of the field
    for (let x = 4; x <= 18; x++) {
      if (x === 6 || x === 7 || x === 12 || x === 13) continue;
      const tile = this.getTile(x, 8);
      if (tile && tile.ground !== 'path') {
        tile.prop = 'fence_h';
        tile.solid = true;
        tile.farmable = false;
      }
    }
    for (let y = 9; y <= 18; y++) {
      const leftFence = this.getTile(4, y);
      if (leftFence) {
        leftFence.prop = 'fence_v';
        leftFence.solid = true;
        leftFence.farmable = false;
      }
    }

    // 6. Choppable Oak Trees framing the valley perimeter (HP = 4)
    const treeCoords: [number, number][] = [
      [1, 2], [2, 5], [1, 9], [1, 14], [2, 18],
      [11, 2], [22, 2], [28, 4], [27, 10],
      [27, 15], [19, 19], [10, 20], [5, 20],
      [3, 15], [14, 19],
    ];
    for (const [tx, ty] of treeCoords) {
      const tile = this.getTile(tx, ty);
      if (tile && !tile.solid && tile.ground === 'grass') {
        tile.prop = 'tree';
        tile.nodeHp = 4;
        tile.solid = true;
      }
    }

    // 7. Smashable Rocks (HP = 3)
    const rocks: [number, number][] = [
      [20, 16], [26, 12], [12, 16], [16, 15], [3, 12], [9, 16],
    ];
    for (const [rx, ry] of rocks) {
      const tile = this.getTile(rx, ry);
      if (tile && !tile.solid && tile.prop === 'none' && tile.ground !== 'path') {
        tile.prop = 'rock';
        tile.nodeHp = 3;
        tile.solid = true;
      }
    }

    // 8. Scythe-clearable Wild Weeds (HP = 1)
    const weeds: [number, number][] = [
      [11, 14], [12, 14], [14, 15], [15, 16], [16, 11], [17, 10], [8, 15], [9, 14],
    ];
    for (const [wx, wy] of weeds) {
      const tile = this.getTile(wx, wy);
      if (tile && !tile.solid && tile.prop === 'none' && tile.ground !== 'path') {
        tile.prop = 'weed';
        tile.nodeHp = 1;
      }
    }

    // 9. Pre-till welcoming 3x2 starter patch
    for (let y = 10; y <= 11; y++) {
      for (let x = 6; x <= 8; x++) {
        this.tillTile(x, y);
      }
    }
  }

  private paintPath(x1: number, y1: number, x2: number, y2: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = this.getTile(x, y);
        if (tile) {
          tile.ground = 'path';
          tile.farmable = false;
        }
      }
    }
  }

  private markSolidRect(rect: RectArea): void {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        const tile = this.getTile(x, y);
        if (tile) {
          tile.solid = true;
          tile.farmable = false;
        }
      }
    }
  }
}

function isInsideRect(x: number, y: number, rect: RectArea): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function deterministicHash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  n = (n ^ (n >> 13)) * 1274126177;
  return Math.abs(n ^ (n >> 16));
}
