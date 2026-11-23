import type { GameWorld } from '../core/GameWorld';
import { getFurnitureDef } from '../data/furniture';
import { DEFAULT_CAMERA_ZOOM, FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';
import { Camera } from '../engine/Camera';
import { HOUSE_FIXTURES } from '../systems/HouseInteriorSystem';
import type { Scene } from './SceneManager';

interface Renderable {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Cozy Farmhouse Interior Scene:
 * - Warm oak floorboards, timber walls, crackling fireplace, sunlit windows
 * - Interactive TV (tomorrow's Weather Forecast & Daily Farming Tip)
 * - Interactive Kitchen Stove (cook stamina-restoring dishes)
 * - Bed interaction to sleep and advance the day
 * - Interactive Decoration Mode (press F) to place/pick up customizable furniture
 */
export class HouseInteriorScene implements Scene {
  readonly id = 'house' as const;
  readonly camera: Camera;

  private readonly world: GameWorld;
  private elapsedTime = 0;
  private hoveredTile: { x: number; y: number } | null = null;
  private lastContextPrompt: string | null = null;
  private exitCooldown = 0;

  constructor(world: GameWorld) {
    this.world = world;
    this.camera = new Camera(
      world.house.worldWidth,
      world.house.worldHeight,
      DEFAULT_CAMERA_ZOOM
    );
  }

  enter(): void {
    this.exitCooldown = 0.55;
    this.lastContextPrompt = null;
    this.camera.snapTo(this.world.house.worldWidth / 2, this.world.house.worldHeight / 2);
  }

  exit(): void {
    this.world.setDecorateMode(false);
    this.world.saveGameState();
  }

  onViewportResize(width: number, height: number): void {
    this.camera.zoom = width < 760 ? 2 : DEFAULT_CAMERA_ZOOM;
    this.camera.setViewport(width, height);
  }

  update(dt: number): void {
    this.elapsedTime += dt;
    if (this.exitCooldown > 0) {
      this.exitCooldown = Math.max(0, this.exitCooldown - dt);
    }

    const { dx, dy } = this.world.input.getMovementVector();
    this.world.player.update(dx, dy, dt, this.world.house);
    this.camera.follow(this.world.player.x, this.world.player.y - 6, dt);

    if (
      this.exitCooldown <= 0 &&
      !this.world.decorateMode &&
      dy > 0.2 &&
      this.world.house.isDoorExitTile(this.world.player.tileX, this.world.player.tileY)
    ) {
      this.exitToFarm();
      return;
    }

    this.world.advanceClock(dt);
    this.world.particles.update(dt);

    if (this.world.input.pointer.isInsideCanvas) {
      const wp = this.camera.screenToWorld(
        this.world.input.pointer.screenX,
        this.world.input.pointer.screenY
      );
      const tx = Math.floor(wp.x / TILE_SIZE);
      const ty = Math.floor(wp.y / TILE_SIZE);
      this.hoveredTile =
        tx >= 0 && ty >= 0 && tx < this.world.house.cols && ty < this.world.house.rows
          ? { x: tx, y: ty }
          : null;
    } else {
      this.hoveredTile = null;
    }

    this.refreshContextPrompt();
  }

  handlePrimaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition) return;
    const wp = this.camera.screenToWorld(screenX, screenY);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);

    if (this.world.decorateMode) {
      this.tryPlaceSelectedFurniture(tx, ty);
      return;
    }

    if (this.world.house.isTvZone(tx, ty)) {
      this.world.openTvBroadcast();
      return;
    }

    if (this.world.house.isKitchenZone(tx, ty)) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openCooking', undefined);
      return;
    }

    if (
      this.world.house.isBedZone(tx, ty) &&
      this.world.house.isBedZone(this.world.player.tileX, this.world.player.tileY)
    ) {
      this.world.triggerSleep();
      return;
    }

    if (this.world.house.isDoorExitTile(tx, ty)) {
      this.exitToFarm();
      return;
    }

    this.world.toast('提示：点击【电视】看明日天气 · 点击【厨房】烹饪料理 · 按 F 开启自由装修');
  }

  handleSecondaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition) return;
    const wp = this.camera.screenToWorld(screenX, screenY);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);

    if (this.world.decorateMode) {
      const picked = this.world.house.pickupFurnitureAt(tx, ty);
      if (picked) {
        const def = getFurnitureDef(picked.furnitureId);
        this.world.audio.play('ui');
        this.world.particles.spawnDirtBurst((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE);
        this.world.toast(`已收回【${def?.name ?? '家具'}】到家具收纳箱`);
        this.world.selectFurnitureToPlace(picked.furnitureId);
        this.world.saveGameState();
      }
      return;
    }

    if (this.world.house.isTvZone(tx, ty)) {
      this.world.openTvBroadcast();
    } else if (this.world.house.isKitchenZone(tx, ty)) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openCooking', undefined);
    } else if (this.world.house.isBedZone(tx, ty)) {
      this.world.triggerSleep();
    }
  }

  handleActionKey(): void {
    if (this.world.decorateMode) {
      const target = this.hoveredTile ?? this.world.player.getFacingTile();
      this.tryPlaceSelectedFurniture(target.x, target.y);
      return;
    }
    this.handleInteractKey();
  }

  handleInteractKey(): void {
    if (this.world.sleepingTransition) return;
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;

    if (this.world.house.isTvZone(px, py)) {
      this.world.openTvBroadcast();
      return;
    }
    if (this.world.house.isKitchenZone(px, py)) {
      this.world.audio.play('ui');
      this.world.bus.emit('ui:openCooking', undefined);
      return;
    }
    if (this.world.house.isBedZone(px, py)) {
      this.world.triggerSleep();
      return;
    }

    const facing = this.world.player.getFacingTile();
    if (
      this.world.house.isDoorExitTile(px, py) ||
      this.world.house.isDoorExitTile(facing.x, facing.y)
    ) {
      this.exitToFarm();
    }
  }

  private tryPlaceSelectedFurniture(tx: number, ty: number): void {
    const selectedId = this.world.selectedFurnitureId;
    if (!selectedId) {
      this.world.toast('请先在底部装修栏选择一件家具，或右键收回现有家具');
      return;
    }
    const placed = this.world.house.placeFurniture(
      selectedId,
      tx,
      ty,
      this.world.player.tileX,
      this.world.player.tileY
    );
    if (!placed) {
      this.world.toast('这里无法摆放该家具（不能挡住床铺、电视、厨房、门口或墙壁）');
      return;
    }
    const def = getFurnitureDef(selectedId);
    this.world.audio.play('plant');
    this.world.particles.spawnHarvestSparkle(
      (tx + (def?.widthTiles ?? 1) * 0.5) * TILE_SIZE,
      (ty + (def?.heightTiles ?? 1) * 0.5) * TILE_SIZE
    );
    this.world.toast(`已摆放【${def?.name ?? '家具'}】`);

    if (this.world.house.getOwnedCount(selectedId) <= 0) {
      const next = this.world.house.getOwnedFurnitureList()[0]?.furnitureId ?? null;
      this.world.selectFurnitureToPlace(next);
    } else {
      this.world.bus.emit('house:decorateChanged', {
        active: this.world.decorateMode,
        selectedFurnitureId: selectedId,
      });
    }
    this.world.saveGameState();
  }

  private exitToFarm(): void {
    this.world.audio.play('ui');
    this.world.travelTo('farm', {
      x: FARM_LAYOUT.houseDoor.x + 0.5,
      y: FARM_LAYOUT.houseDoor.y + 0.9,
      facing: 'down',
    });
  }

  private refreshContextPrompt(): void {
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;
    let prompt: string | null = null;

    if (this.world.decorateMode) {
      prompt = '装修模式已开启：左键摆放选中家具 · 右键收回地板上的家具 · 按 F 退出装修';
    } else if (this.world.house.isTvZone(px, py)) {
      prompt = '按 E 或点击复古电视：收看【明日天气预报】与【农耕小贴士】';
    } else if (this.world.house.isKitchenZone(px, py)) {
      prompt = '按 E 或点击农舍灶台：打开【厨房烹饪】制作恢复体力的美食';
    } else if (this.world.house.isBedZone(px, py)) {
      prompt = '按 E 或点击床铺：上床休息，恢复体力并推进至明天';
    } else if (this.world.house.isDoorExitTile(px, py)) {
      prompt = '按 E 或向下走：走出农舍返回晨露农场';
    } else {
      prompt = '农舍小屋：电视看天气 · 灶台做料理 · 按 F 自由装修 · 靠近床铺休息';
    }

    if (prompt !== this.lastContextPrompt) {
      this.lastContextPrompt = prompt;
      this.world.bus.emit('context:changed', { prompt });
    }
  }

  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1f140e';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    const zoom = this.camera.zoom;
    const camX = this.camera.renderX;
    const camY = this.camera.renderY;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const house = this.world.house;

    for (let y = 0; y < house.rows; y++) {
      for (let x = 0; x < house.cols; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (y === 0 || y === house.rows - 1 || x === 0 || x === house.cols - 1) {
          ctx.fillStyle = '#3b2113';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#52301c';
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          continue;
        }
        if (y === 1) {
          const wall = this.world.atlas.get('wall_cabin');
          if (wall) ctx.drawImage(wall, px, py);
          continue;
        }
        const floor = this.world.atlas.get(`floor_wood_${(x + y) % 2}`);
        if (floor) ctx.drawImage(floor, px, py);
      }
    }

    const winSprite = this.world.atlas.get('interior_window');
    if (winSprite) {
      ctx.drawImage(winSprite, 2.2 * TILE_SIZE, 8);
      ctx.drawImage(winSprite, 8.2 * TILE_SIZE, 8);
    }

    const fireFrame = Math.floor(this.elapsedTime * 5) % 2;
    const fireplace = this.world.atlas.get(`interior_fireplace_${fireFrame}`);
    if (fireplace) {
      ctx.drawImage(
        fireplace,
        HOUSE_FIXTURES.fireplace.x * TILE_SIZE,
        HOUSE_FIXTURES.fireplace.y * TILE_SIZE - 14
      );
    }

    const doormat = this.world.atlas.get('doormat');
    if (doormat) {
      ctx.drawImage(
        doormat,
        HOUSE_FIXTURES.doorExit.x * TILE_SIZE,
        HOUSE_FIXTURES.doorExit.y * TILE_SIZE
      );
    }

    for (const item of house.placed) {
      const def = getFurnitureDef(item.furnitureId);
      if (!def || !def.walkable) continue;
      const sprite = this.world.atlas.get(def.spriteKey);
      if (sprite) ctx.drawImage(sprite, item.x * TILE_SIZE, item.y * TILE_SIZE);
    }

    if (this.world.decorateMode) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 244, 198, 0.22)';
      ctx.lineWidth = 0.5;
      for (let y = 2; y <= house.rows - 2; y++) {
        for (let x = 1; x <= house.cols - 2; x++) {
          ctx.strokeRect(
            x * TILE_SIZE + 0.25,
            y * TILE_SIZE + 0.25,
            TILE_SIZE - 0.5,
            TILE_SIZE - 0.5
          );
        }
      }
      ctx.restore();
    }

    const renderables: Renderable[] = [];

    // Bed
    const bedSprite = this.world.atlas.get('interior_bed');
    if (bedSprite) {
      renderables.push({
        sortY: (HOUSE_FIXTURES.bed.y + HOUSE_FIXTURES.bed.h) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            bedSprite,
            HOUSE_FIXTURES.bed.x * TILE_SIZE,
            HOUSE_FIXTURES.bed.y * TILE_SIZE - 8
          ),
      });
    }

    // Retro Weather TV
    const tvSprite = this.world.atlas.get('interior_tv');
    if (tvSprite) {
      renderables.push({
        sortY: (HOUSE_FIXTURES.tv.y + 1) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            tvSprite,
            HOUSE_FIXTURES.tv.x * TILE_SIZE - 2,
            HOUSE_FIXTURES.tv.y * TILE_SIZE - 8
          ),
      });
    }

    // Kitchen Stove
    const kitchenSprite = this.world.atlas.get('interior_kitchen');
    if (kitchenSprite) {
      renderables.push({
        sortY: (HOUSE_FIXTURES.kitchen.y + 1) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            kitchenSprite,
            HOUSE_FIXTURES.kitchen.x * TILE_SIZE,
            HOUSE_FIXTURES.kitchen.y * TILE_SIZE - 8
          ),
      });
    }

    // Placed solid furniture
    for (const item of house.placed) {
      const def = getFurnitureDef(item.furnitureId);
      if (!def || def.walkable) continue;
      const sprite = this.world.atlas.get(def.spriteKey);
      if (!sprite) continue;
      const drawX = item.x * TILE_SIZE;
      const drawY = (item.y + def.heightTiles) * TILE_SIZE - sprite.height;
      renderables.push({
        sortY: (item.y + def.heightTiles) * TILE_SIZE,
        draw: (c) => {
          c.drawImage(sprite, drawX, drawY);
          if (def.id === 'furn_lamp') {
            c.save();
            c.globalAlpha = 0.16 + Math.sin(this.elapsedTime * 3) * 0.03;
            c.fillStyle = '#ffda75';
            c.beginPath();
            c.arc(drawX + 8, drawY + 6, 18, 0, Math.PI * 2);
            c.fill();
            c.restore();
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

    if (this.world.decorateMode && this.hoveredTile && this.world.selectedFurnitureId) {
      const def = getFurnitureDef(this.world.selectedFurnitureId);
      const sprite = def ? this.world.atlas.get(def.spriteKey) : undefined;
      if (def && sprite) {
        const valid = this.world.house.canPlaceFurniture(
          def.id,
          this.hoveredTile.x,
          this.hoveredTile.y,
          this.world.player.tileX,
          this.world.player.tileY
        );
        const gx = this.hoveredTile.x * TILE_SIZE;
        const gy = (this.hoveredTile.y + def.heightTiles) * TILE_SIZE - sprite.height;
        ctx.save();
        ctx.fillStyle = valid ? 'rgba(130, 224, 88, 0.34)' : 'rgba(230, 74, 60, 0.36)';
        ctx.fillRect(
          gx,
          this.hoveredTile.y * TILE_SIZE,
          def.widthTiles * TILE_SIZE,
          def.heightTiles * TILE_SIZE
        );
        ctx.globalAlpha = 0.78;
        ctx.drawImage(sprite, gx, gy);
        ctx.strokeStyle = valid ? '#b4ff8a' : '#ff8c80';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          gx + 0.5,
          this.hoveredTile.y * TILE_SIZE + 0.5,
          def.widthTiles * TILE_SIZE - 1,
          def.heightTiles * TILE_SIZE - 1
        );
        ctx.restore();
      }
    }

    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(this.elapsedTime * 7) * 0.025;
    ctx.fillStyle = '#ff9d3b';
    ctx.beginPath();
    ctx.arc(7 * TILE_SIZE, 2.4 * TILE_SIZE, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.world.particles.renderWorld(ctx);
    ctx.restore();

    this.world.particles.renderFloatingTexts(ctx, camX, camY, zoom);
  }
}
