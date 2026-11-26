import type { GameWorld } from '../core/GameWorld';
import { FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';
import { HOUSE_COLS, HOUSE_ROWS, HOUSE_FIXTURES } from '../systems/HouseInteriorSystem';
import { MINE_COLS, MINE_ROWS } from '../systems/MineSystem';

/**
 * Renders a crisp real-time wooden pixel minimap of the active scene
 * (Farm, House Interior, Sunmeadow Town, or Underground Mine).
 */
export class MinimapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly farmTerrain = document.createElement('canvas');
  private readonly farmCrops = document.createElement('canvas');
  private terrainRevision = -1;
  private cropRevision = -1;
  private season = '';
  private bowlFilled = false;
  private letterRead = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize minimap 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(world: GameWorld): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (world.currentSceneId === 'farm') {
      this.renderFarm(world, w, h);
    } else if (world.currentSceneId === 'house') {
      this.renderHouse(world, w, h);
    } else if (world.currentSceneId === 'town') {
      this.renderTown(world, w, h);
    } else {
      this.renderMine(world, w, h);
    }
  }

  private renderFarm(world: GameWorld, w: number, h: number): void {
    const ctx = this.ctx;
    const map = world.tileMap;
    const sx = w / map.cols;
    const sy = h / map.rows;
    const resized = this.farmTerrain.width !== w || this.farmTerrain.height !== h;
    if (resized) {
      this.farmTerrain.width = this.farmCrops.width = w;
      this.farmTerrain.height = this.farmCrops.height = h;
    }
    if (resized || this.terrainRevision !== map.terrainRevision ||
        this.season !== world.time.seasonId || this.bowlFilled !== world.pets.bowlFilledToday ||
        this.letterRead !== world.birthdayLetterRead) {
      this.paintFarmTerrain(world, sx, sy);
      this.terrainRevision = map.terrainRevision;
      this.season = world.time.seasonId;
      this.bowlFilled = world.pets.bowlFilledToday;
      this.letterRead = world.birthdayLetterRead;
    }
    if (resized || this.cropRevision !== world.crops.revision) {
      const marks = this.farmCrops.getContext('2d')!;
      marks.clearRect(0, 0, w, h);
      marks.fillStyle = '#ffe55c';
      for (const crop of world.crops.getAll()) {
        if (world.crops.isReadyToHarvest(crop)) {
          marks.fillRect(crop.x * sx, crop.y * sy, Math.max(2, sx), Math.max(2, sy));
        }
      }
      this.cropRevision = world.crops.revision;
    }

    ctx.drawImage(this.farmTerrain, 0, 0);
    ctx.fillStyle = '#ffffff';
    for (const a of world.livestock.animals) {
      ctx.fillRect((a.x / TILE_SIZE) * sx - 1, (a.y / TILE_SIZE) * sy - 1, 2.5, 2.5);
    }
    if (world.pets.isInScene('farm', world.weather.isRainy(), world.time.minutes)) {
      for (const cat of world.pets.cats) {
        const cx = (cat.x / TILE_SIZE) * sx;
        const cy = (cat.y / TILE_SIZE) * sy;
        ctx.fillStyle = '#3b1f12';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
        ctx.fillStyle = '#ff8bb3';
        ctx.fillRect(cx - 1.2, cy - 1.2, 2.4, 2.4);
      }
    }
    ctx.drawImage(this.farmCrops, 0, 0);
    this.drawPlayerDot(world.player.x / TILE_SIZE, world.player.y / TILE_SIZE, sx, sy);
  }

  private paintFarmTerrain(world: GameWorld, sx: number, sy: number): void {
    const ctx = this.farmTerrain.getContext('2d')!;
    const map = world.tileMap;
    const season = world.time.seasonId;
    const grassCol =
      season === 'winter' ? '#d4e6f2' : season === 'fall' ? '#c98e3e' : '#6cb043';

    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const cell = map.grid[y][x];
        if (cell.ground === 'water') ctx.fillStyle = '#469ad1';
        else if (cell.ground === 'path') ctx.fillStyle = '#d9bf94';
        else if (cell.tilled) ctx.fillStyle = cell.watered ? '#5e351c' : '#a86b3a';
        else if (cell.ground === 'dirt') ctx.fillStyle = '#d6a469';
        else ctx.fillStyle = grassCol;
        ctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }

    // Buildings
    ctx.fillStyle = '#b84a35';
    ctx.fillRect(
      FARM_LAYOUT.house.x * sx,
      FARM_LAYOUT.house.y * sy,
      FARM_LAYOUT.house.w * sx,
      FARM_LAYOUT.house.h * sy
    );
    ctx.fillStyle = map.greenhouseUnlocked ? '#6be0f2' : '#7a6856';
    ctx.fillRect(
      FARM_LAYOUT.greenhouse.x * sx,
      FARM_LAYOUT.greenhouse.y * sy,
      FARM_LAYOUT.greenhouse.w * sx,
      FARM_LAYOUT.greenhouse.h * sy
    );
    ctx.fillStyle = '#494257';
    ctx.fillRect(
      FARM_LAYOUT.mineTrail.x * sx,
      FARM_LAYOUT.mineTrail.y * sy,
      FARM_LAYOUT.mineTrail.w * sx,
      FARM_LAYOUT.mineTrail.h * sy
    );

    if (world.livestock.hasBuilding('coop')) {
      ctx.fillStyle = '#d48d46';
      ctx.fillRect(
        FARM_LAYOUT.coopPad.x * sx,
        FARM_LAYOUT.coopPad.y * sy,
        FARM_LAYOUT.coopPad.w * sx,
        FARM_LAYOUT.coopPad.h * sy
      );
    }
    if (world.livestock.hasBuilding('barn')) {
      ctx.fillStyle = '#bd382c';
      ctx.fillRect(
        FARM_LAYOUT.barnPad.x * sx,
        FARM_LAYOUT.barnPad.y * sy,
        FARM_LAYOUT.barnPad.w * sx,
        FARM_LAYOUT.barnPad.h * sy
      );
    }

    // Porch mailbox
    ctx.fillStyle = world.birthdayLetterRead ? '#698db0' : '#f04d63';
    ctx.fillRect(
      FARM_LAYOUT.mailbox.x * sx,
      FARM_LAYOUT.mailbox.y * sy,
      Math.max(2, sx),
      Math.max(2, sy)
    );

    // Pet water bowl
    ctx.fillStyle = world.pets.bowlFilledToday ? '#6bd6ff' : '#a88463';
    ctx.fillRect(
      FARM_LAYOUT.petBowl.x * sx,
      FARM_LAYOUT.petBowl.y * sy,
      Math.max(2, sx),
      Math.max(2, sy)
    );

  }

  private renderHouse(world: GameWorld, w: number, h: number): void {
    const ctx = this.ctx;
    const sx = w / HOUSE_COLS;
    const sy = h / HOUSE_ROWS;
    ctx.fillStyle = '#3b2113';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9935a';
    ctx.fillRect(sx, sy * 2, (HOUSE_COLS - 2) * sx, (HOUSE_ROWS - 3) * sy);

    ctx.fillStyle = '#62a346';
    ctx.fillRect(HOUSE_FIXTURES.bed.x * sx, HOUSE_FIXTURES.bed.y * sy, 2 * sx, 2 * sy);
    ctx.fillStyle = '#5ec4f2';
    ctx.fillRect(HOUSE_FIXTURES.tv.x * sx, HOUSE_FIXTURES.tv.y * sy, sx, sy);
    ctx.fillStyle = '#d97836';
    ctx.fillRect(HOUSE_FIXTURES.kitchen.x * sx, HOUSE_FIXTURES.kitchen.y * sy, 2 * sx, sy);
    ctx.fillStyle = '#ff9bb8';
    ctx.fillRect(
      HOUSE_FIXTURES.birthdayTable.x * sx,
      HOUSE_FIXTURES.birthdayTable.y * sy,
      HOUSE_FIXTURES.birthdayTable.w * sx,
      HOUSE_FIXTURES.birthdayTable.h * sy
    );

    // Companion cats indoors
    if (
      world.indoorBirthdayGathering ||
      world.pets.isInScene('house', world.weather.isRainy(), world.time.minutes)
    ) {
      for (const cat of world.pets.cats) {
        const cx = (cat.x / TILE_SIZE) * sx;
        const cy = (cat.y / TILE_SIZE) * sy;
        ctx.fillStyle = '#3b1f12';
        ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
        ctx.fillStyle = '#ff8bb3';
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    }

    this.drawPlayerDot(world.player.x / TILE_SIZE, world.player.y / TILE_SIZE, sx, sy);
  }

  private renderTown(world: GameWorld, w: number, h: number): void {
    const ctx = this.ctx;
    const cols = 28;
    const rows = 21;
    const sx = w / cols;
    const sy = h / rows;

    ctx.fillStyle =
      world.time.seasonId === 'winter'
        ? '#d4e6f2'
        : world.time.seasonId === 'fall'
          ? '#c98e3e'
          : '#6cb043';
    ctx.fillRect(0, 0, w, h);

    // Plaza & river
    ctx.fillStyle = '#e2d2b4';
    ctx.fillRect(9 * sx, 9 * sy, 10 * sx, 8 * sy);
    ctx.fillStyle = '#469ad1';
    ctx.fillRect(4 * sx, 18 * sy, 20 * sx, 3 * sy);
    ctx.fillRect(12 * sx, 11 * sy, 3 * sx, 3 * sy);

    // Buildings
    ctx.fillStyle = '#436e9e';
    ctx.fillRect(4 * sx, 2 * sy, 6 * sx, 4 * sy);
    ctx.fillStyle = '#3e996c';
    ctx.fillRect(11 * sx, 1 * sy, 6 * sx, 4 * sy);
    ctx.fillStyle = '#b86c36';
    ctx.fillRect(18 * sx, 2 * sy, 6 * sx, 4 * sy);
    ctx.fillStyle = '#575e6b';
    ctx.fillRect(21 * sx, 11 * sy, 5 * sx, 4 * sy);

    // Villager dots
    ctx.fillStyle = '#ff7da3';
    for (const npc of world.npcs.getAll()) {
      ctx.fillRect((npc.x / TILE_SIZE) * sx - 1.5, (npc.y / TILE_SIZE) * sy - 1.5, 3, 3);
    }

    this.drawPlayerDot(world.player.x / TILE_SIZE, world.player.y / TILE_SIZE, sx, sy);
  }

  private renderMine(world: GameWorld, w: number, h: number): void {
    const ctx = this.ctx;
    const sx = w / MINE_COLS;
    const sy = h / MINE_ROWS;

    ctx.fillStyle = '#29242e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5c534c';
    ctx.fillRect(sx, sy * 2, (MINE_COLS - 2) * sx, (MINE_ROWS - 3) * sy);

    // Rocks
    ctx.fillStyle = '#8b8f96';
    for (const r of world.mine.rocks.values()) {
      ctx.fillStyle =
        r.kind === 'copper'
          ? '#e67d3c'
          : r.kind === 'iron'
            ? '#d0e0f0'
            : r.kind === 'gold'
              ? '#ffd942'
              : r.kind === 'gem'
                ? '#c86bff'
                : '#888c94';
      ctx.fillRect(r.x * sx, r.y * sy, Math.ceil(sx), Math.ceil(sy));
    }

    // Ladders
    ctx.fillStyle = '#ffe55c';
    ctx.fillRect(
      world.mine.exitLadderTile.x * sx,
      world.mine.exitLadderTile.y * sy,
      Math.ceil(sx),
      Math.ceil(sy)
    );
    if (world.mine.downLadderTile) {
      ctx.fillStyle = '#7dff8b';
      ctx.fillRect(
        world.mine.downLadderTile.x * sx,
        world.mine.downLadderTile.y * sy,
        Math.ceil(sx),
        Math.ceil(sy)
      );
    }

    // Slimes
    ctx.fillStyle = '#ff526b';
    for (const s of world.mine.slimes) {
      ctx.fillRect((s.x / TILE_SIZE) * sx - 1.5, (s.y / TILE_SIZE) * sy - 1.5, 3.5, 3.5);
    }

    this.drawPlayerDot(world.player.x / TILE_SIZE, world.player.y / TILE_SIZE, sx, sy);
  }

  private drawPlayerDot(tx: number, ty: number, sx: number, sy: number): void {
    const ctx = this.ctx;
    const px = tx * sx;
    const py = ty * sy;
    ctx.fillStyle = '#3b1f12';
    ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    ctx.fillStyle = '#fff15c';
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
}
