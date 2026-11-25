import type { GameWorld } from '../core/GameWorld';
import { getNpcDef } from '../data/npcs';
import { DEFAULT_CAMERA_ZOOM, TILE_SIZE, TOWN_ENTRY, type RectArea } from '../data/worldConfig';
import { Camera } from '../engine/Camera';
import type { CollisionGrid } from '../systems/PlayerSystem';
import type { Scene } from './SceneManager';

const TOWN_COLS = 28;
const TOWN_ROWS = 21;

const TOWN_LAYOUT = {
  store: { x: 4, y: 2, w: 6, h: 4 } as RectArea,
  storeDoor: { x: 7, y: 6 },
  communityCenter: { x: 11, y: 1, w: 6, h: 4 } as RectArea,
  communityDoor: { x: 14, y: 5 },
  carpenter: { x: 18, y: 2, w: 6, h: 4 } as RectArea,
  carpenterDoor: { x: 21, y: 6 },
  blacksmith: { x: 21, y: 11, w: 5, h: 4 } as RectArea,
  blacksmithDoor: { x: 23, y: 15 },
  fountain: { x: 12, y: 11, w: 3, h: 3 } as RectArea,
  noticeBoard: { x: 11, y: 7, w: 2, h: 1 } as RectArea,
  river: { x: 4, y: 18, w: 20, h: 3 } as RectArea,
  farmReturnGate: { x: 0, y: 8, w: 2, h: 3 } as RectArea,
} as const;

type TownGround = 'grass' | 'path' | 'plaza' | 'water';

interface TownCell {
  ground: TownGround;
  variant: number;
  solid: boolean;
  prop: 'none' | 'flowerbed' | 'lamp' | 'tree' | 'sign';
}

interface Renderable {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Sunmeadow Town Scene:
 * - Pierre's General Store, Community Center Hall, Robin's Carpenter Workshop, Clint's Blacksmith Forge
 * - Central Fountain Plaza + Seasonal Festival celebration banners on Day 14
 * - Notice Board Daily Quests, Southern River Pier for fishing
 * - 4 Strolling Villagers (Emily, Pierre, Robin, Clint) on time-of-day schedules
 */
export class TownScene implements Scene, CollisionGrid {
  readonly id = 'town' as const;
  readonly camera: Camera;

  private readonly world: GameWorld;
  private readonly grid: TownCell[][] = [];
  private readonly trees: { tileX: number; tileY: number }[] = [];
  private readonly benches: { tileX: number; tileY: number }[] = [
    { tileX: 9, tileY: 12 },
    { tileX: 16, tileY: 12 },
  ];

  private elapsedTime = 0;
  private portalCooldown = 0;
  private lastContextPrompt: string | null = null;

  constructor(world: GameWorld) {
    this.world = world;
    this.buildTownMap();
    this.camera = new Camera(TOWN_COLS * TILE_SIZE, TOWN_ROWS * TILE_SIZE, DEFAULT_CAMERA_ZOOM);
  }

  enter(): void {
    this.portalCooldown = 0.5;
    this.lastContextPrompt = null;
    const player = this.world.player;
    if (player.collidesAt(player.x, player.y, this)) {
      player.setPositionTile(TOWN_ENTRY.x, TOWN_ENTRY.y, TOWN_ENTRY.facing);
    }
    this.camera.snapTo(player.x, player.y - 6);
  }

  exit(): void {
    this.world.saveGameState();
  }

  onViewportResize(width: number, height: number): void {
    this.camera.zoom = width < 760 ? 2 : DEFAULT_CAMERA_ZOOM;
    this.camera.setViewport(width, height);
  }

  isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= TOWN_COLS || ty >= TOWN_ROWS) return true;
    return this.grid[ty][tx].solid;
  }

  update(dt: number): void {
    this.elapsedTime += dt;
    if (this.portalCooldown > 0) {
      this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    }

    if (this.world.fishing.isActive()) {
      this.world.updateFishing(dt);
      this.world.weather.update(
        dt,
        this.camera.viewportWidth,
        this.camera.viewportHeight,
        this.world.time.seasonId
      );
      this.world.particles.update(dt);
      return;
    }

    const { dx, dy } = this.world.input.getMovementVector();
    this.world.player.update(dx, dy, dt, this);
    this.camera.follow(this.world.player.x, this.world.player.y - 6, dt);

    // Villagers follow time-of-day schedules
    this.world.npcs.update(dt, this.world.activeDialogueNpcId, this.world.time.hour);

    if (
      this.portalCooldown <= 0 &&
      this.world.player.tileX <= 0 &&
      this.world.player.tileY >= 8 &&
      this.world.player.tileY <= 10
    ) {
      this.returnToFarm();
      return;
    }

    this.world.advanceClock(dt);
    this.world.particles.update(dt);
    this.world.weather.update(
      dt,
      this.camera.viewportWidth,
      this.camera.viewportHeight,
      this.world.time.seasonId
    );
    this.refreshContextPrompt();
  }

  handlePrimaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;
    const wp = this.camera.screenToWorld(screenX, screenY);

    const clickedNpc = this.world.npcs.findNpcAtWorldPoint(wp.x, wp.y);
    if (clickedNpc) {
      const dist = Math.hypot(clickedNpc.x - this.world.player.x, clickedNpc.y - this.world.player.y);
      if (dist <= 44) {
        this.interactWithNpc(clickedNpc.id);
      } else {
        this.world.toast(`走近一点再和${getNpcDef(clickedNpc.id)?.name ?? '村民'}打招呼吧`);
      }
      return;
    }

    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);
    this.tryInteractLandmark(tx, ty);
  }

  handleSecondaryClick(screenX: number, screenY: number): void {
    this.handlePrimaryClick(screenX, screenY);
  }

  handleActionKey(): void {
    if (this.world.fishing.isActive()) return;
    const facing = this.world.player.getFacingTile();
    const held = this.world.inventory.getSelectedItemDef();
    if (held?.toolKind === 'fishing_rod' && isInsideRect(facing.x, facing.y, TOWN_LAYOUT.river)) {
      this.world.startFishing();
      return;
    }
    this.handleInteractKey();
  }

  handleInteractKey(): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;

    const nearbyNpc = this.world.npcs.findNearbyNpc(this.world.player.x, this.world.player.y, 30);
    if (nearbyNpc) {
      this.interactWithNpc(nearbyNpc.id);
      return;
    }

    const facing = this.world.player.getFacingTile();
    if (this.tryInteractLandmark(facing.x, facing.y)) return;
    this.tryInteractLandmark(this.world.player.tileX, this.world.player.tileY);
  }

  private interactWithNpc(npcId: string): void {
    // Check if player can deliver the active daily quest directly to this villager!
    const q = this.world.quests.currentQuest;
    if (
      q &&
      !q.completed &&
      q.npcId === npcId &&
      this.world.inventory.getItemCount(q.itemId) >= q.quantity
    ) {
      this.world.deliverDailyQuest();
      return;
    }

    const held = this.world.inventory.getSelectedItemDef();
    if (held && held.giftable) {
      this.world.giftToNpc(npcId, held.id);
      return;
    }
    this.world.talkToNpc(npcId);
  }

  private tryInteractLandmark(tx: number, ty: number): boolean {
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;

    // Fishing at Southern Town River
    if (
      isInsideRect(tx, ty, TOWN_LAYOUT.river) &&
      py >= TOWN_LAYOUT.river.y - 2 &&
      this.world.inventory.getSelectedItemDef()?.toolKind === 'fishing_rod'
    ) {
      this.world.startFishing();
      return true;
    }

    // Pierre's Store
    if (
      (isNearRect(tx, ty, TOWN_LAYOUT.store, 1) ||
        (tx === TOWN_LAYOUT.storeDoor.x && ty === TOWN_LAYOUT.storeDoor.y)) &&
      Math.abs(px - TOWN_LAYOUT.storeDoor.x) <= 3 &&
      Math.abs(py - TOWN_LAYOUT.storeDoor.y) <= 3
    ) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openShop', undefined);
      return true;
    }

    // Community Center Hall
    if (
      (isNearRect(tx, ty, TOWN_LAYOUT.communityCenter, 1) ||
        (tx === TOWN_LAYOUT.communityDoor.x && ty === TOWN_LAYOUT.communityDoor.y)) &&
      Math.abs(px - TOWN_LAYOUT.communityDoor.x) <= 3 &&
      Math.abs(py - TOWN_LAYOUT.communityDoor.y) <= 3
    ) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openBundles', undefined);
      return true;
    }

    // Robin's Carpenter & Ranch Shop
    if (
      (isNearRect(tx, ty, TOWN_LAYOUT.carpenter, 1) ||
        (tx === TOWN_LAYOUT.carpenterDoor.x && ty === TOWN_LAYOUT.carpenterDoor.y)) &&
      Math.abs(px - TOWN_LAYOUT.carpenterDoor.x) <= 3 &&
      Math.abs(py - TOWN_LAYOUT.carpenterDoor.y) <= 3
    ) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openFurnitureShop', undefined);
      return true;
    }

    // Clint's Blacksmith Forge
    if (
      (isNearRect(tx, ty, TOWN_LAYOUT.blacksmith, 1) ||
        (tx === TOWN_LAYOUT.blacksmithDoor.x && ty === TOWN_LAYOUT.blacksmithDoor.y)) &&
      Math.abs(px - TOWN_LAYOUT.blacksmithDoor.x) <= 3 &&
      Math.abs(py - TOWN_LAYOUT.blacksmithDoor.y) <= 3
    ) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openBlacksmith', undefined);
      return true;
    }

    // Notice Board -> Daily Quests
    if (
      isNearRect(tx, ty, TOWN_LAYOUT.noticeBoard, 1) &&
      isNearRect(px, py, TOWN_LAYOUT.noticeBoard, 2)
    ) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openQuests', undefined);
      return true;
    }

    // Return West Road
    if (isInsideRect(tx, ty, TOWN_LAYOUT.farmReturnGate) && px <= 3) {
      this.returnToFarm();
      return true;
    }

    return false;
  }

  private returnToFarm(): void {
    this.world.audio.play('ui');
    this.world.travelTo('farm', {
      x: this.world.tileMap.cols - 2.4,
      y: 7.5,
      facing: 'left',
    });
  }

  private refreshContextPrompt(): void {
    let prompt: string | null = null;

    const nearbyNpc = this.world.npcs.findNearbyNpc(this.world.player.x, this.world.player.y, 30);
    if (nearbyNpc) {
      const def = getNpcDef(nearbyNpc.id);
      const q = this.world.quests.currentQuest;
      if (
        q &&
        !q.completed &&
        q.npcId === nearbyNpc.id &&
        this.world.inventory.getItemCount(q.itemId) >= q.quantity
      ) {
        prompt = `按 E 交付委托给 ${def?.name ?? '村民'}（领 +${q.goldReward}G 与好感！）`;
      } else {
        const held = this.world.inventory.getSelectedItemDef();
        if (held && held.giftable) {
          prompt = `按 E 或点击 ${def?.name ?? '村民'}：赠送手中的【${held.name}】提升好感`;
        } else {
          prompt = `按 E 或点击 ${def?.name ?? '村民'}（${def?.role ?? ''}）：聊天互动`;
        }
      }
    } else {
      const px = this.world.player.tileX;
      const py = this.world.player.tileY;
      if (Math.abs(px - TOWN_LAYOUT.storeDoor.x) <= 2 && Math.abs(py - TOWN_LAYOUT.storeDoor.y) <= 1) {
        prompt = '按 E 进入皮埃尔杂货铺（四季种子 / 出售农产）';
      } else if (
        Math.abs(px - TOWN_LAYOUT.communityDoor.x) <= 2 &&
        Math.abs(py - TOWN_LAYOUT.communityDoor.y) <= 2
      ) {
        prompt = '按 E 进入【社区中心】（献祭收集包解锁温室与矿车）';
      } else if (
        Math.abs(px - TOWN_LAYOUT.carpenterDoor.x) <= 2 &&
        Math.abs(py - TOWN_LAYOUT.carpenterDoor.y) <= 1
      ) {
        prompt = '按 E 进入罗宾木工坊（选购家具 / 建鸡舍畜棚 / 领养动物）';
      } else if (
        Math.abs(px - TOWN_LAYOUT.blacksmithDoor.x) <= 2 &&
        Math.abs(py - TOWN_LAYOUT.blacksmithDoor.y) <= 1
      ) {
        prompt = '按 E 进入克林特铁匠铺（升级铜/铁/黄金农具）';
      } else if (isNearRect(px, py, TOWN_LAYOUT.noticeBoard, 1)) {
        prompt = '按 E 查看小镇公告栏【每日村民委托】';
      } else if (py >= TOWN_LAYOUT.river.y - 2 && px >= 4 && px <= 23) {
        prompt = '晨露河畔：切换竹钓竿(6)按空格或点击水面即可垂钓！';
      } else if (px <= 2 && py >= 7 && py <= 11) {
        prompt = '向左走或按 E：返回晨露农场';
      }
    }

    if (prompt !== this.lastContextPrompt) {
      this.lastContextPrompt = prompt;
      this.world.bus.emit('context:changed', { prompt });
    }
  }

  private buildTownMap(): void {
    for (let y = 0; y < TOWN_ROWS; y++) {
      const row: TownCell[] = [];
      for (let x = 0; x < TOWN_COLS; x++) {
        row.push({
          ground: 'grass',
          variant: (x * 7 + y * 13) % 12,
          solid: false,
          prop: 'none',
        });
      }
      this.grid.push(row);
    }

    // Roads & Square
    this.paintGround(0, 8, 9, 10, 'path');
    this.paintGround(6, 6, 22, 9, 'path');
    this.paintGround(13, 5, 14, 9, 'path');
    this.paintGround(18, 15, 24, 15, 'path');
    this.paintGround(13, 16, 14, 17, 'path'); // path down to river
    this.paintGround(9, 9, 18, 16, 'plaza');

    // Southern River for Fishing
    for (let y = TOWN_LAYOUT.river.y; y < TOWN_LAYOUT.river.y + TOWN_LAYOUT.river.h; y++) {
      for (let x = TOWN_LAYOUT.river.x; x < TOWN_LAYOUT.river.x + TOWN_LAYOUT.river.w; x++) {
        this.grid[y][x].ground = 'water';
        this.grid[y][x].solid = true;
      }
    }

    this.markSolidRect(TOWN_LAYOUT.store);
    this.markSolidRect(TOWN_LAYOUT.communityCenter);
    this.markSolidRect(TOWN_LAYOUT.carpenter);
    this.markSolidRect(TOWN_LAYOUT.blacksmith);
    this.markSolidRect(TOWN_LAYOUT.fountain);
    this.markSolidRect(TOWN_LAYOUT.noticeBoard);

    for (const bench of this.benches) {
      this.grid[bench.tileY][bench.tileX].solid = true;
      this.grid[bench.tileY][bench.tileX + 1].solid = true;
    }

    const flowerbeds: [number, number][] = [
      [10, 10], [17, 10], [10, 15], [17, 15],
    ];
    for (const [fx, fy] of flowerbeds) {
      this.grid[fy][fx].prop = 'flowerbed';
      this.grid[fy][fx].solid = true;
    }

    const lamps: [number, number][] = [
      [7, 10], [19, 10], [12, 7], [15, 7],
    ];
    for (const [lx, ly] of lamps) {
      this.grid[ly][lx].prop = 'lamp';
      this.grid[ly][lx].solid = true;
    }

    this.grid[7][2].prop = 'sign';
    this.grid[7][2].solid = true;

    const treeCoords: [number, number][] = [
      [1, 2], [2, 5], [1, 13], [2, 16],
      [25, 3], [26, 7], [26, 16], [5, 16],
    ];
    for (const [tx, ty] of treeCoords) {
      if (!this.grid[ty][tx].solid && this.grid[ty][tx].ground === 'grass') {
        this.grid[ty][tx].prop = 'tree';
        this.grid[ty][tx].solid = true;
        this.trees.push({ tileX: tx, tileY: ty });
      }
    }
  }

  private paintGround(x1: number, y1: number, x2: number, y2: number, ground: TownGround): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (y >= 0 && y < TOWN_ROWS && x >= 0 && x < TOWN_COLS) {
          this.grid[y][x].ground = ground;
        }
      }
    }
  }

  private markSolidRect(rect: RectArea): void {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (y >= 0 && y < TOWN_ROWS && x >= 0 && x < TOWN_COLS) {
          this.grid[y][x].solid = true;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void {
    ctx.imageSmoothingEnabled = false;
    const seasonId = this.world.time.seasonId;
    ctx.fillStyle =
      seasonId === 'winter' ? '#6d8ca3' : seasonId === 'fall' ? '#6e4c23' : '#33592a';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    const zoom = this.camera.zoom;
    const camX = this.camera.renderX;
    const camY = this.camera.renderY;
    const waterFrame = Math.floor(this.elapsedTime * 2) % 2;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    for (let y = 0; y < TOWN_ROWS; y++) {
      for (let x = 0; x < TOWN_COLS; x++) {
        const cell = this.grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        let sprite: HTMLCanvasElement | undefined;
        if (cell.ground === 'water') {
          sprite = this.world.atlas.get(`water_${waterFrame}`);
        } else if (cell.ground === 'plaza') {
          sprite = this.world.atlas.get(`town_plaza_${(x + y) % 2}`);
        } else if (cell.ground === 'path') {
          sprite = this.world.atlas.get('path_stone');
        } else if (seasonId !== 'spring') {
          sprite = this.world.atlas.get(`grass_${seasonId}`) ?? this.world.atlas.get('grass_0');
        } else if (cell.variant === 0) {
          sprite = this.world.atlas.get('grass_flower_yellow');
        } else if (cell.variant === 1) {
          sprite = this.world.atlas.get('grass_flower_pink');
        } else {
          sprite = this.world.atlas.get(`grass_${cell.variant % 3}`);
        }
        if (sprite) ctx.drawImage(sprite, px, py);
      }
    }

    // West return arrow
    const bob = Math.round(Math.sin(this.elapsedTime * 4) * 2);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(6 - bob, 9 * TILE_SIZE + 6, 5, 3);
    ctx.fillRect(4 - bob, 9 * TILE_SIZE + 4, 2, 7);

    // Festival Bunting Flags across Plaza on Festival Day 14!
    if (this.world.time.getTodayFestival()) {
      const colors = ['#ff6b8b', '#ffd942', '#70db62', '#64c2ff'];
      for (let i = 0; i < 16; i++) {
        const fx = 9 * TILE_SIZE + i * 10;
        const fy = 9 * TILE_SIZE + 2 + Math.round(Math.sin(i * 0.7 + this.elapsedTime * 3) * 1.5);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(fx, fy, 6, 5);
      }
    }

    const renderables: Renderable[] = [];

    const drawBldg = (key: string, rect: RectArea, yOff = -8): void => {
      const sprite = this.world.atlas.get(key);
      if (!sprite) return;
      renderables.push({
        sortY: (rect.y + rect.h) * TILE_SIZE,
        draw: (c) => c.drawImage(sprite, rect.x * TILE_SIZE, rect.y * TILE_SIZE + yOff),
      });
    };

    drawBldg('building_store', TOWN_LAYOUT.store, -8);
    drawBldg('building_community_center', TOWN_LAYOUT.communityCenter, 0);
    drawBldg('building_carpenter', TOWN_LAYOUT.carpenter, -8);
    drawBldg('building_blacksmith', TOWN_LAYOUT.blacksmith, 0);

    const fountainFrame = Math.floor(this.elapsedTime * 3.5) % 2;
    const fountainSprite = this.world.atlas.get(`town_fountain_${fountainFrame}`);
    if (fountainSprite) {
      renderables.push({
        sortY: (TOWN_LAYOUT.fountain.y + TOWN_LAYOUT.fountain.h) * TILE_SIZE - 2,
        draw: (c) =>
          c.drawImage(
            fountainSprite,
            TOWN_LAYOUT.fountain.x * TILE_SIZE,
            TOWN_LAYOUT.fountain.y * TILE_SIZE
          ),
      });
    }

    const boardSprite = this.world.atlas.get('town_notice_board');
    if (boardSprite) {
      const hasUnfinishedQuest =
        this.world.quests.currentQuest && !this.world.quests.currentQuest.completed;
      renderables.push({
        sortY: (TOWN_LAYOUT.noticeBoard.y + 1) * TILE_SIZE,
        draw: (c) => {
          const bx = TOWN_LAYOUT.noticeBoard.x * TILE_SIZE;
          const by = TOWN_LAYOUT.noticeBoard.y * TILE_SIZE - 12;
          c.drawImage(boardSprite, bx, by);
          if (hasUnfinishedQuest) {
            const qBob = Math.round(Math.sin(this.elapsedTime * 5) * 1.5);
            c.fillStyle = '#3b1f12';
            c.fillRect(bx + 12, by - 9 + qBob, 8, 8);
            c.fillStyle = '#ffd942';
            c.fillRect(bx + 13, by - 8 + qBob, 6, 6);
          }
        },
      });
    }

    const benchSprite = this.world.atlas.get('town_bench');
    if (benchSprite) {
      for (const bench of this.benches) {
        renderables.push({
          sortY: (bench.tileY + 1) * TILE_SIZE,
          draw: (c) => c.drawImage(benchSprite, bench.tileX * TILE_SIZE, bench.tileY * TILE_SIZE),
        });
      }
    }

    for (let y = 0; y < TOWN_ROWS; y++) {
      for (let x = 0; x < TOWN_COLS; x++) {
        const prop = this.grid[y][x].prop;
        if (prop === 'flowerbed' || prop === 'lamp' || prop === 'sign') {
          const key =
            prop === 'flowerbed' ? 'town_flowerbed' : prop === 'lamp' ? 'town_lamp' : 'town_sign';
          const sprite = this.world.atlas.get(key);
          if (sprite) {
            renderables.push({
              sortY: (y + 1) * TILE_SIZE - 1,
              draw: (c) => c.drawImage(sprite, x * TILE_SIZE, (y + 1) * TILE_SIZE - sprite.height),
            });
          }
        }
      }
    }

    const treeKey = seasonId === 'spring' ? 'tree_oak' : `tree_oak_${seasonId}`;
    const treeSprite = this.world.atlas.get(treeKey) ?? this.world.atlas.get('tree_oak');
    if (treeSprite) {
      for (const t of this.trees) {
        renderables.push({
          sortY: (t.tileY + 1) * TILE_SIZE,
          draw: (c) => c.drawImage(treeSprite, t.tileX * TILE_SIZE - 8, t.tileY * TILE_SIZE - 22),
        });
      }
    }

    // Town Villagers
    for (const npc of this.world.npcs.getAll()) {
      const sprite = this.world.atlas.get(this.world.npcs.getSpriteKey(npc));
      if (!sprite) continue;
      renderables.push({
        sortY: npc.y + 4,
        draw: (c) => {
          const drawX = Math.round(npc.x - 8);
          const drawY = Math.round(npc.y - 19);
          c.drawImage(sprite, drawX, drawY);
          if (!npc.talkedToday) {
            const bounce = Math.round(Math.sin(this.elapsedTime * 4 + npc.x) * 1);
            c.fillStyle = '#3b1f12';
            c.fillRect(drawX + 5, drawY - 6 + bounce, 6, 5);
            c.fillStyle = '#fff5cc';
            c.fillRect(drawX + 6, drawY - 5 + bounce, 4, 3);
          }
        },
      });
    }

    renderables.push({
      sortY: this.world.player.y + 4,
      draw: (c) => {
        const sprite = this.world.atlas.get(this.world.player.getSpriteKey());
        if (sprite) {
          c.drawImage(
            sprite,
            Math.round(this.world.player.x - 8),
            Math.round(this.world.player.y - 19)
          );
        }
      },
    });

    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const obj of renderables) obj.draw(ctx);

    this.world.particles.renderWorld(ctx);
    ctx.restore();

    this.world.weather.renderOutdoor(ctx, viewportWidth, viewportHeight, seasonId);

    const light = this.world.time.getAmbientLight();
    if (light.alpha > 0.005) {
      ctx.save();
      ctx.globalAlpha = light.alpha;
      ctx.fillStyle = light.color;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      ctx.restore();
    }

    this.renderTownNameplates(ctx, camX, camY, zoom);
    this.world.particles.renderFloatingTexts(ctx, camX, camY, zoom);
  }

  private renderTownNameplates(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number
  ): void {
    ctx.save();
    ctx.font = '700 11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';

    const drawLabel = (worldX: number, worldY: number, text: string, color = '#fff7dc'): void => {
      const sx = Math.round((worldX - camX) * zoom);
      const sy = Math.round((worldY - camY) * zoom);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(42, 22, 11, 0.9)';
      ctx.strokeText(text, sx, sy);
      ctx.fillStyle = color;
      ctx.fillText(text, sx, sy);
    };

    drawLabel((TOWN_LAYOUT.store.x + 3) * TILE_SIZE, TOWN_LAYOUT.store.y * TILE_SIZE - 10, '皮埃尔杂货铺', '#ffe599');
    drawLabel((TOWN_LAYOUT.communityCenter.x + 3) * TILE_SIZE, TOWN_LAYOUT.communityCenter.y * TILE_SIZE + 5, '★ 社区中心', '#9ef5c7');
    drawLabel((TOWN_LAYOUT.carpenter.x + 3) * TILE_SIZE, TOWN_LAYOUT.carpenter.y * TILE_SIZE - 10, '罗宾木工坊', '#c9f2a7');
    drawLabel((TOWN_LAYOUT.blacksmith.x + 2.5) * TILE_SIZE, TOWN_LAYOUT.blacksmith.y * TILE_SIZE - 4, '克林特铁匠铺', '#ffc699');

    for (const npc of this.world.npcs.getAll()) {
      const def = getNpcDef(npc.id);
      if (!def) continue;
      const dist = Math.hypot(npc.x - this.world.player.x, npc.y - this.world.player.y);
      if (dist <= 95) {
        drawLabel(npc.x, npc.y - 25, def.name, '#ffffff');
      }
    }

    ctx.restore();
  }
}

function isInsideRect(x: number, y: number, rect: RectArea): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function isNearRect(x: number, y: number, rect: RectArea, margin: number): boolean {
  return (
    x >= rect.x - margin &&
    x < rect.x + rect.w + margin &&
    y >= rect.y - margin &&
    y < rect.y + rect.h + margin
  );
}
