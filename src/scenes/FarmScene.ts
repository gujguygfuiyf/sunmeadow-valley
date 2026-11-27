import type { GameWorld } from '../core/GameWorld';
import { ANIMAL_CATALOG } from '../data/animals';
import { getCropDef } from '../data/crops';
import type { TileInspectPayload } from '../data/events';
import { getItemDef } from '../data/items';
import { DEFAULT_CAMERA_ZOOM, FARM_LAYOUT, TILE_SIZE, TOWN_ENTRY } from '../data/worldConfig';
import { Camera } from '../engine/Camera';
import { HOUSE_FIXTURES } from '../systems/HouseInteriorSystem';
import type { CollisionGrid } from '../systems/PlayerSystem';
import type { InteractiveZoneKind } from '../systems/TileMapSystem';
import type { Scene } from './SceneManager';
import { drawCat, pickCat } from './CompanionCatSprite';

interface RenderableObject {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Primary outdoor farm scene:
 * - 4-season visuals & live weather (rain, petals, autumn leaves, snow, lightning)
 * - Upgraded AoE tools, wild foraging (trees/rocks/weeds), machines & chests
 * - Greenhouse (year-round planting), Coop/Barn + wandering animals, pond fishing
 * - Portals to Farmhouse Interior, Sunmeadow Town, and The Mines
 */
export class FarmScene implements Scene {
  readonly id = 'farm' as const;
  readonly camera: Camera;

  private readonly world: GameWorld;
  private readonly farmCollision: CollisionGrid;

  private elapsedTime = 0;
  private hoveredTile: { x: number; y: number } | null = null;
  private lastContextPrompt: string | null = null;
  private lastInspectKey = '';
  private portalCooldown = 0;

  constructor(world: GameWorld) {
    this.world = world;
    this.camera = new Camera(
      world.tileMap.worldWidth,
      world.tileMap.worldHeight,
      DEFAULT_CAMERA_ZOOM
    );
    this.farmCollision = {
      isSolid: (tx, ty) =>
        this.world.tileMap.isSolid(tx, ty) || this.world.machines.isSolidAt(tx, ty),
    };
  }

  enter(): void {
    this.portalCooldown = 0.45;
    this.lastContextPrompt = null;
    this.lastInspectKey = '';
    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      for (const cat of this.world.pets.cats) {
        if (cat.x < TILE_SIZE || cat.y < TILE_SIZE || cat.x > this.world.tileMap.worldWidth - TILE_SIZE) {
          this.world.pets.placeForScene('farm');
          break;
        }
      }
    }
    this.camera.snapTo(this.world.player.x, this.world.player.y - 6);
  }

  exit(): void {
    this.world.saveGameState();
  }

  onViewportResize(width: number, height: number): void {
    this.camera.zoom = width < 760 ? 2 : DEFAULT_CAMERA_ZOOM;
    this.camera.setViewport(width, height);
  }

  update(dt: number): void {
    this.elapsedTime += dt;
    if (this.portalCooldown > 0) {
      this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    }

    // Freeze player movement while Fishing Mini-Game is active
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
    this.world.player.update(dx, dy, dt, this.farmCollision);
    this.camera.follow(this.world.player.x, this.world.player.y - 6, dt);

    // East Road -> Sunmeadow Town
    if (
      this.portalCooldown <= 0 &&
      this.world.player.tileX >= this.world.tileMap.cols - 1 &&
      this.world.player.tileY >= 6 &&
      this.world.player.tileY <= 8
    ) {
      this.world.audio.play('ui');
      this.world.travelTo('town', TOWN_ENTRY);
      return;
    }

    // North-East Mountain Trail -> The Mines
    if (
      this.portalCooldown <= 0 &&
      this.world.player.tileX >= FARM_LAYOUT.mineTrail.x &&
      this.world.player.tileX < FARM_LAYOUT.mineTrail.x + FARM_LAYOUT.mineTrail.w &&
      this.world.player.tileY <= 2 &&
      dy < -0.1
    ) {
      this.world.audio.play('ui');
      this.world.enterMineFloor(1);
      return;
    }

    this.world.advanceClock(dt);
    this.world.livestock.update(dt);
    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      this.world.pets.update(
        dt,
        'farm',
        this.world.player.x,
        this.world.player.y,
        this.farmCollision
      );
    }
    this.world.particles.update(dt);
    this.world.weather.update(
      dt,
      this.camera.viewportWidth,
      this.camera.viewportHeight,
      this.world.time.seasonId
    );

    if (this.world.input.pointer.isInsideCanvas) {
      const worldPos = this.camera.screenToWorld(
        this.world.input.pointer.screenX,
        this.world.input.pointer.screenY
      );
      const tx = Math.floor(worldPos.x / TILE_SIZE);
      const ty = Math.floor(worldPos.y / TILE_SIZE);
      this.hoveredTile = this.world.tileMap.inBounds(tx, ty) ? { x: tx, y: ty } : null;
    } else {
      this.hoveredTile = null;
    }

    this.refreshContextPrompt();
    this.refreshTileInspector();
  }

  /* =========================================================
     INPUT & FARMING / MACHINE / ANIMAL ACTIONS
     ========================================================= */

  handlePrimaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    // 0. Clicking a nearby companion cat pets / collects morning gift / feeds treat
    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      const clickedCat = pickCat(this.world, worldPos.x, worldPos.y);
      if (clickedCat) {
        const d = Math.hypot(clickedCat.x - this.world.player.x, clickedCat.y - this.world.player.y);
        if (d <= 44) {
          this.world.interactWithCat(clickedCat);
          return;
        }
      }
    }

    // 1. Clicking a nearby farm animal pets / collects product
    const clickedAnimal = this.world.livestock.findNearbyAnimal(worldPos.x, worldPos.y, 16);
    if (clickedAnimal) {
      const d = Math.hypot(clickedAnimal.x - this.world.player.x, clickedAnimal.y - this.world.player.y);
      if (d <= 44) {
        this.interactWithAnimal(clickedAnimal);
        return;
      }
    }

    const tx = Math.floor(worldPos.x / TILE_SIZE);
    const ty = Math.floor(worldPos.y / TILE_SIZE);
    if (!this.world.tileMap.inBounds(tx, ty)) return;

    // 2. Machine interaction
    const machine = this.world.machines.getAt(tx, ty);
    if (machine && this.world.player.isTileWithinReach(tx, ty)) {
      this.world.player.faceTowardsTile(tx, ty);
      this.interactWithMachine(tx, ty);
      return;
    }

    // 3. Landmark zones (except pond with fishing rod -> fish!)
    const zone = this.world.tileMap.getInteractiveZoneAt(tx, ty);
    const held = this.world.inventory.getSelectedItemDef();
    if (zone === 'pond' && held?.toolKind === 'fishing_rod' && this.isNearZone('pond')) {
      this.world.player.faceTowardsTile(tx, ty);
      this.world.startFishing();
      return;
    }
    if (zone && this.isNearZone(zone)) {
      this.world.player.faceTowardsTile(tx, ty);
      this.interactWithZone(zone);
      return;
    }

    if (!this.world.player.isTileWithinReach(tx, ty)) {
      this.world.toast('距离太远啦，走近一点再操作吧');
      return;
    }

    this.world.player.faceTowardsTile(tx, ty);
    this.performTileAction(tx, ty);
  }

  handleSecondaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      const clickedCat = pickCat(this.world, worldPos.x, worldPos.y);
      if (clickedCat) {
        const d = Math.hypot(clickedCat.x - this.world.player.x, clickedCat.y - this.world.player.y);
        if (d <= 44) {
          this.world.interactWithCat(clickedCat);
          return;
        }
      }
    }

    const clickedAnimal = this.world.livestock.findNearbyAnimal(worldPos.x, worldPos.y, 16);
    if (clickedAnimal) {
      const d = Math.hypot(clickedAnimal.x - this.world.player.x, clickedAnimal.y - this.world.player.y);
      if (d <= 44) {
        this.interactWithAnimal(clickedAnimal);
        return;
      }
    }

    const tx = Math.floor(worldPos.x / TILE_SIZE);
    const ty = Math.floor(worldPos.y / TILE_SIZE);
    if (!this.world.tileMap.inBounds(tx, ty)) return;

    // Right-clicking a machine interacts with it (or picks up empty machine with pickaxe)
    const machine = this.world.machines.getAt(tx, ty);
    if (machine && this.world.player.isTileWithinReach(tx, ty)) {
      this.interactWithMachine(tx, ty);
      return;
    }

    const zone = this.world.tileMap.getInteractiveZoneAt(tx, ty);
    if (zone && this.isNearZone(zone)) {
      this.world.player.faceTowardsTile(tx, ty);
      this.interactWithZone(zone);
      return;
    }

    if (this.world.player.isTileWithinReach(tx, ty)) {
      this.world.player.faceTowardsTile(tx, ty);
      this.tryHarvestTile(tx, ty);
    }
  }

  handleActionKey(): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;
    const target = this.world.player.getFacingTile();
    if (!this.world.tileMap.inBounds(target.x, target.y)) return;

    const held = this.world.inventory.getSelectedItemDef();
    const zone = this.world.tileMap.getInteractiveZoneAt(target.x, target.y);
    if (zone === 'pond' && held?.toolKind === 'fishing_rod') {
      this.world.startFishing();
      return;
    }
    if (zone) {
      this.interactWithZone(zone);
      return;
    }
    if (this.world.machines.getAt(target.x, target.y)) {
      this.interactWithMachine(target.x, target.y);
      return;
    }

    this.performTileAction(target.x, target.y);
  }

  handleInteractKey(): void {
    if (this.world.sleepingTransition || this.world.fishing.isActive()) return;

    // 0. Nearby companion cat
    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      const nearCat = this.world.pets.findNearbyCat(this.world.player.x, this.world.player.y, 26);
      if (nearCat) {
        this.world.interactWithCat(nearCat);
        return;
      }
    }

    // 1. Nearby farm animal
    const nearAnimal = this.world.livestock.findNearbyAnimal(
      this.world.player.x,
      this.world.player.y,
      26
    );
    if (nearAnimal) {
      this.interactWithAnimal(nearAnimal);
      return;
    }

    // 2. Facing machine
    const facing = this.world.player.getFacingTile();
    if (this.world.machines.getAt(facing.x, facing.y)) {
      this.interactWithMachine(facing.x, facing.y);
      return;
    }

    // 3. Nearby landmark zone
    const nearbyZone = this.world.tileMap.getNearbyInteractiveZone(
      this.world.player.tileX,
      this.world.player.tileY
    );
    if (nearbyZone) {
      const held = this.world.inventory.getSelectedItemDef();
      if (nearbyZone === 'pond' && held?.toolKind === 'fishing_rod') {
        this.world.startFishing();
        return;
      }
      this.interactWithZone(nearbyZone);
      return;
    }

    // 4. Harvest mature crop
    if (this.tryHarvestTile(facing.x, facing.y)) return;
    if (this.tryHarvestTile(this.world.player.tileX, this.world.player.tileY)) return;

    // 5. Eat held edible food / crop!
    const held = this.world.inventory.getSelectedItemDef();
    if (held && (held.energyRestore || held.healthRestore)) {
      this.world.eatFromSlot(this.world.inventory.selectedSlot);
    }
  }

  private performTileAction(tx: number, ty: number): void {
    const selectedDef = this.world.inventory.getSelectedItemDef();
    const cropHere = this.world.crops.getAt(tx, ty);

    // Quick harvest with hand, scythe, or empty slot
    if (
      cropHere &&
      this.world.crops.isReadyToHarvest(cropHere) &&
      (!selectedDef ||
        selectedDef.toolKind === 'hand' ||
        selectedDef.toolKind === 'scythe' ||
        selectedDef.category === 'crop')
    ) {
      this.tryHarvestTile(tx, ty);
      return;
    }

    if (!selectedDef) {
      this.tryHarvestTile(tx, ty);
      return;
    }

    const wx = (tx + 0.5) * TILE_SIZE;
    const wy = (ty + 0.5) * TILE_SIZE;

    // 1. Hoe (AoE scaled by upgrade tier!)
    if (selectedDef.toolKind === 'hoe') {
      const area = this.world.stats.getToolAreaTiles('hoe', tx, ty, this.world.player.facing);
      const validTiles = area.filter((p) => {
        const cell = this.world.tileMap.getTile(p.x, p.y);
        return cell && !cell.solid && cell.farmable && !cell.tilled && cell.prop === 'none' && !this.world.machines.getAt(p.x, p.y);
      });
      if (validTiles.length === 0) {
        const tile = this.world.tileMap.getTile(tx, ty);
        if (tile && tile.tilled) this.world.toast('这块土地已经开垦好了，可以播种啦');
        return;
      }
      if (!this.world.tryConsumeEnergy(2)) return;
      this.world.player.triggerToolSwing();
      for (const p of validTiles) {
        this.world.tileMap.tillTile(p.x, p.y);
        this.world.particles.spawnDirtBurst((p.x + 0.5) * TILE_SIZE, (p.y + 0.5) * TILE_SIZE);
      }
      this.world.audio.play('hoe');
      this.world.saveGameState();
      return;
    }

    // 2. Watering Can (AoE scaled by upgrade tier!)
    if (selectedDef.toolKind === 'watering_can') {
      if (this.world.tileMap.getInteractiveZoneAt(tx, ty) === 'pet_bowl') {
        this.world.player.triggerToolSwing();
        this.world.waterPetBowl();
        return;
      }
      if (this.world.tileMap.getInteractiveZoneAt(tx, ty) === 'pond') {
        this.world.player.triggerToolSwing();
        this.refillWateringCan(wx, wy);
        return;
      }
      const area = this.world.stats.getToolAreaTiles(
        'watering_can',
        tx,
        ty,
        this.world.player.facing
      );
      const tilledTargets = area.filter((p) => this.world.tileMap.isTilled(p.x, p.y));
      if (tilledTargets.length === 0) {
        this.world.toast('请先用锄头开垦土地，再浇水');
        return;
      }
      if (this.world.inventory.waterLevel <= 0) {
        this.world.toast('喷壶没水啦！请到右侧水塘边点击装满');
        return;
      }
      if (!this.world.tryConsumeEnergy(1)) return;
      this.world.player.triggerToolSwing();
      this.world.inventory.consumeWater(1);
      for (const p of tilledTargets) {
        this.world.tileMap.waterTile(p.x, p.y);
        this.world.particles.spawnWaterSplash((p.x + 0.5) * TILE_SIZE, (p.y + 0.5) * TILE_SIZE);
      }
      this.world.audio.play('water');
      this.world.bus.emit('inventory:changed', undefined);
      this.world.saveGameState();
      return;
    }

    // 3. Axe: chop wild trees
    if (selectedDef.toolKind === 'axe') {
      const tile = this.world.tileMap.getTile(tx, ty);
      if (tile?.prop !== 'tree' && tile?.prop !== 'weed') {
        this.world.toast('靠近农场边缘的橡树使用伐木斧可砍伐获取木材！');
        return;
      }
      if (!this.world.tryConsumeEnergy(3)) return;
      this.world.player.triggerToolSwing();
      const power = this.world.stats.getToolPower('axe');
      const res = this.world.tileMap.hitWildNode(tx, ty, 'axe', power);
      this.world.audio.play('chop');
      this.world.particles.spawnDirtBurst(wx, wy);
      if (res?.cleared) {
        this.grantDrops(res.drops, wx, wy);
      }
      this.world.saveGameState();
      return;
    }

    // 4. Pickaxe: smash farm rocks (or pick up empty placed machine!)
    if (selectedDef.toolKind === 'pickaxe') {
      const placedMach = this.world.machines.getAt(tx, ty);
      if (placedMach) {
        const removed = this.world.machines.removeAt(tx, ty);
        if (removed) {
          this.world.inventory.addItem(`mach_${removed.kind}`, 1);
          this.world.audio.play('mine');
          this.world.bus.emit('inventory:changed', undefined);
          this.world.toast('已将机器收回背包！');
          this.world.saveGameState();
        } else {
          this.world.toast('请先清空储物箱内的物品再收回！');
        }
        return;
      }

      const tile = this.world.tileMap.getTile(tx, ty);
      if (tile?.prop !== 'rock') {
        this.world.toast('对农场石块使用十字镐获取石头/铜矿，或去东北山路进入矿洞！');
        return;
      }
      if (!this.world.tryConsumeEnergy(3)) return;
      this.world.player.triggerToolSwing();
      const power = this.world.stats.getToolPower('pickaxe');
      const res = this.world.tileMap.hitWildNode(tx, ty, 'pickaxe', power);
      this.world.audio.play('mine');
      this.world.particles.spawnDirtBurst(wx, wy);
      if (res?.cleared) {
        this.grantDrops(res.drops, wx, wy);
      }
      this.world.saveGameState();
      return;
    }

    // 5. Scythe: zero-energy weed clearing
    if (selectedDef.toolKind === 'scythe') {
      this.world.player.triggerToolSwing();
      const res = this.world.tileMap.hitWildNode(tx, ty, 'scythe', 1);
      if (res?.cleared) {
        this.world.audio.play('slash');
        this.world.particles.spawnHarvestSparkle(wx, wy);
        this.grantDrops(res.drops, wx, wy);
        this.world.saveGameState();
      } else {
        this.tryHarvestTile(tx, ty);
      }
      return;
    }

    // 6. Fishing Rod
    if (selectedDef.toolKind === 'fishing_rod') {
      if (this.world.tileMap.getInteractiveZoneAt(tx, ty) === 'pond') {
        this.world.startFishing();
      } else {
        this.world.toast('请面朝右侧水塘或小镇河岸使用竹钓竿甩竿钓鱼！');
      }
      return;
    }

    // 7. Hand / Basket
    if (selectedDef.toolKind === 'hand') {
      if (!this.tryHarvestTile(tx, ty)) {
        this.world.toast('这里还没有成熟的作物可以采摘');
      }
      return;
    }

    // 8. Placeable Machines, Fences & Paths
    if (selectedDef.category === 'machine' && selectedDef.machineKind) {
      if (selectedDef.machineKind === 'fence' || selectedDef.machineKind === 'path') {
        if (this.world.tileMap.placeFarmPathOrFence(tx, ty, selectedDef.machineKind)) {
          this.world.inventory.removeFromSlot(this.world.inventory.selectedSlot, 1);
          this.world.audio.play('plant');
          this.world.bus.emit('inventory:changed', undefined);
          this.world.saveGameState();
        } else {
          this.world.toast('这块空地无法铺设围栏或小路');
        }
        return;
      }

      const cell = this.world.tileMap.getTile(tx, ty);
      if (
        !cell ||
        cell.solid ||
        cell.prop !== 'none' ||
        this.world.crops.hasCropAt(tx, ty) ||
        this.world.machines.getAt(tx, ty) ||
        (tx === this.world.player.tileX && ty === this.world.player.tileY)
      ) {
        this.world.toast('请选择一块未被占用的平地摆放机器');
        return;
      }

      if (this.world.machines.place(selectedDef.machineKind, tx, ty)) {
        this.world.inventory.removeFromSlot(this.world.inventory.selectedSlot, 1);
        this.world.audio.play('craft');
        this.world.particles.spawnDirtBurst(wx, wy);
        this.world.particles.spawnFloatingText(wx, wy, `放置 ${selectedDef.name}`, '#ffe58f');
        this.world.bus.emit('inventory:changed', undefined);
        this.world.saveGameState();
      }
      return;
    }

    // 9. Seeds: seasonal check + greenhouse immunity!
    if (selectedDef.category === 'seed' && selectedDef.cropId) {
      if (!this.world.tileMap.isTilled(tx, ty)) {
        this.world.toast('种子只能播在已开垦的土地上（按 1 切换锄头）');
        return;
      }
      const inGreenhouse = this.world.tileMap.isGreenhouseSoilTile(tx, ty);
      const planted = this.world.crops.plant(
        tx,
        ty,
        selectedDef.cropId,
        this.world.time.seasonId,
        inGreenhouse
      );
      if (!planted.ok) {
        this.world.toast(planted.reason ?? '无法在此播种');
        return;
      }
      this.world.inventory.removeFromSlot(this.world.inventory.selectedSlot, 1);
      this.world.audio.play('plant');
      this.world.particles.spawnDirtBurst(wx, wy);
      this.world.particles.spawnFloatingText(wx, wy, `播下${selectedDef.name}`, '#d9f79c');
      this.world.bus.emit('inventory:changed', undefined);
      this.world.saveGameState();
      return;
    }

    // 10. Edible food/crop hint
    if (selectedDef.energyRestore) {
      this.world.toast(`按 E 可直接食用【${selectedDef.name}】恢复体力，或放进加工桶/出货箱！`);
    }
  }

  private interactWithMachine(tx: number, ty: number): void {
    const machine = this.world.machines.getAt(tx, ty);
    if (!machine) return;

    const result = this.world.machines.interact(machine, this.world.inventory);
    const wx = (tx + 0.5) * TILE_SIZE;
    const wy = (ty + 0.5) * TILE_SIZE;

    if (result.action === 'open_chest') {
      this.world.openChest(machine.uid);
      return;
    }
    if (result.action === 'collected' && result.collectedItemId) {
      this.world.collections.recordDiscovery(result.collectedItemId);
      this.world.audio.play('harvest');
      this.world.particles.spawnHarvestSparkle(wx, wy);
      this.world.particles.spawnFloatingText(wx, wy, result.message, '#ffe570');
      this.world.bus.emit('inventory:changed', undefined);
      this.world.bus.emit('bundles:changed', undefined);
      this.world.saveGameState();
      return;
    }
    if (result.action === 'started') {
      this.world.audio.play('craft');
      this.world.particles.spawnDirtBurst(wx, wy);
      this.world.bus.emit('inventory:changed', undefined);
      this.world.toast(result.message);
      this.world.saveGameState();
      return;
    }
    this.world.toast(result.message);
  }

  private interactWithAnimal(animal: ReturnType<GameWorld['livestock']['findNearbyAnimal']>): void {
    if (!animal) return;
    const res = this.world.livestock.interact(animal);
    this.world.audio.play('pet');
    this.world.particles.spawnHeartBurst(animal.x, animal.y);

    if (res.collectedItemId) {
      if (this.world.inventory.canAddItem(res.collectedItemId, 1)) {
        this.world.inventory.addItem(res.collectedItemId, 1);
        this.world.collections.recordDiscovery(res.collectedItemId);
        const itemName = getItemDef(res.collectedItemId)?.name ?? '产物';
        this.world.particles.spawnFloatingText(animal.x, animal.y - 12, `+1 ${itemName}`, '#ffe570');
        this.world.bus.emit('inventory:changed', undefined);
        this.world.bus.emit('bundles:changed', undefined);
        this.world.toast(`抚摸了【${animal.name}】（${res.soundText}），收获【${itemName}】！`);
      } else {
        animal.hasProductReady = true;
        this.world.toast('背包已满，请先腾出空间再收取牧场产物！');
      }
    } else if (res.pettedNow) {
      this.world.particles.spawnFloatingText(animal.x, animal.y - 12, `♥ ${res.soundText}`, '#ff9db8');
      this.world.toast(`温柔抚摸了【${animal.name}】，心情值提升至 ${animal.happiness}！`);
    } else {
      this.world.particles.spawnFloatingText(animal.x, animal.y - 12, res.soundText, '#fff4cc');
    }
    this.world.saveGameState();
  }

  private grantDrops(
    drops: { itemId: string; quantity: number }[],
    wx: number,
    wy: number
  ): void {
    for (const d of drops) {
      this.world.inventory.addItem(d.itemId, d.quantity);
      this.world.collections.recordDiscovery(d.itemId);
      const name = getItemDef(d.itemId)?.name ?? d.itemId;
      this.world.particles.spawnFloatingText(wx, wy, `+${d.quantity} ${name}`, '#ffe896');
    }
    this.world.bus.emit('inventory:changed', undefined);
    this.world.bus.emit('bundles:changed', undefined);
  }

  private tryHarvestTile(tx: number, ty: number): boolean {
    const crop = this.world.crops.getAt(tx, ty);
    if (!crop || !this.world.crops.isReadyToHarvest(crop)) return false;

    const cropDef = getCropDef(crop.cropId);
    if (!cropDef) return false;
    if (!this.world.inventory.canAddItem(cropDef.harvestItemId, cropDef.harvestMax)) {
      this.world.toast('背包已满！请先放入出货箱、储物箱或在种子铺出售');
      return false;
    }

    const result = this.world.crops.harvest(tx, ty);
    if (!result) return false;

    this.world.inventory.addItem(result.itemId, result.quantity);
    this.world.collections.recordDiscovery(result.itemId);

    const wx = (tx + 0.5) * TILE_SIZE;
    const wy = (ty + 0.5) * TILE_SIZE;
    this.world.player.triggerToolSwing();
    this.world.audio.play('harvest');
    this.world.particles.spawnHarvestSparkle(wx, wy);
    this.world.particles.spawnFloatingText(
      wx,
      wy,
      `+${result.quantity} ${result.cropDef.name}`,
      '#ffe570'
    );
    if (result.regrows) {
      this.world.toast(`采摘了${result.cropDef.name}！继续浇水 ${result.cropDef.regrowDays} 天后会再次结果`);
    }
    this.world.bus.emit('inventory:changed', undefined);
    this.world.bus.emit('bundles:changed', undefined);
    this.world.saveGameState();
    return true;
  }

  private interactWithZone(zone: InteractiveZoneKind): void {
    switch (zone) {
      case 'house_door':
        this.world.audio.play('ui');
        this.world.travelTo('house', {
          x: HOUSE_FIXTURES.entrySpawn.x,
          y: HOUSE_FIXTURES.entrySpawn.y,
          facing: 'up',
        });
        break;
      case 'mailbox':
        this.world.openPorchMailbox();
        break;
      case 'pet_bowl': {
        const held = this.world.inventory.getSelectedItemDef();
        if (held?.toolKind === 'watering_can') {
          this.world.player.triggerToolSwing();
        }
        this.world.waterPetBowl();
        break;
      }
      case 'town_exit':
        this.world.audio.play('ui');
        this.world.travelTo('town', TOWN_ENTRY);
        break;
      case 'mine_exit':
        this.world.audio.play('ui');
        this.world.enterMineFloor(1);
        break;
      case 'greenhouse':
        this.world.audio.play('ui');
        this.world.toast('破旧温室：在社区中心（按 C）完成【春季丰收收集包】即可修复为四季温室！');
        this.world.bus.emit('ui:openBundles', undefined);
        break;
      case 'seed_stall':
        this.world.audio.play('ui');
        this.world.bus.emit('ui:openShop', undefined);
        break;
      case 'pond': {
        const wx = (FARM_LAYOUT.pond.x + 1.5) * TILE_SIZE;
        const wy = (FARM_LAYOUT.pond.y + 1) * TILE_SIZE;
        this.refillWateringCan(wx, wy);
        break;
      }
      case 'shipping_bin': {
        const shipped = this.world.inventory.shipSelectedSlot(1);
        if (shipped.ok && shipped.itemName && shipped.itemId) {
          this.world.collections.recordDiscovery(shipped.itemId);
          const wx = (FARM_LAYOUT.shippingBin.x + 1) * TILE_SIZE;
          const wy = FARM_LAYOUT.shippingBin.y * TILE_SIZE;
          this.world.audio.play('coin');
          this.world.particles.spawnHarvestSparkle(wx, wy);
          this.world.particles.spawnFloatingText(
            wx,
            wy,
            `出货 ${shipped.itemName} (+${shipped.expectedGold}G)`,
            '#ffd86b'
          );
          this.world.bus.emit('inventory:changed', undefined);
          this.world.bus.emit('bundles:changed', undefined);
          this.world.saveGameState();
        } else {
          this.world.toast('请先在底部快捷栏选中作物/鱼获/制品，再点击出货箱寄售');
        }
        break;
      }
    }
  }

  private refillWateringCan(wx: number, wy: number): void {
    this.world.inventory.refillWater();
    this.world.audio.play('refill');
    this.world.particles.spawnWaterSplash(wx, wy);
    this.world.particles.spawnFloatingText(
      wx,
      wy,
      `喷壶已装满 ${this.world.inventory.waterLevel}/${this.world.inventory.maxWaterLevel}`,
      '#96e4ff'
    );
    this.world.bus.emit('inventory:changed', undefined);
    this.world.saveGameState();
  }

  private isNearZone(zone: InteractiveZoneKind): boolean {
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;
    const checkRect = (x: number, y: number, w: number, h: number): boolean =>
      px >= x - 2 && px <= x + w + 1 && py >= y - 2 && py <= y + h + 1;

    switch (zone) {
      case 'house_door':
        return (
          Math.abs(px - FARM_LAYOUT.houseDoor.x) <= 2 &&
          Math.abs(py - FARM_LAYOUT.houseDoor.y) <= 2
        );
      case 'mailbox':
        return checkRect(
          FARM_LAYOUT.mailbox.x,
          FARM_LAYOUT.mailbox.y,
          FARM_LAYOUT.mailbox.w,
          FARM_LAYOUT.mailbox.h
        );
      case 'pet_bowl':
        return checkRect(
          FARM_LAYOUT.petBowl.x,
          FARM_LAYOUT.petBowl.y,
          FARM_LAYOUT.petBowl.w,
          FARM_LAYOUT.petBowl.h
        );
      case 'town_exit':
        return px >= this.world.tileMap.cols - 4 && py >= 5 && py <= 9;
      case 'mine_exit':
        return checkRect(
          FARM_LAYOUT.mineTrail.x,
          FARM_LAYOUT.mineTrail.y,
          FARM_LAYOUT.mineTrail.w,
          FARM_LAYOUT.mineTrail.h
        );
      case 'greenhouse':
        return checkRect(
          FARM_LAYOUT.greenhouse.x,
          FARM_LAYOUT.greenhouse.y,
          FARM_LAYOUT.greenhouse.w,
          FARM_LAYOUT.greenhouse.h
        );
      case 'shipping_bin':
        return checkRect(
          FARM_LAYOUT.shippingBin.x,
          FARM_LAYOUT.shippingBin.y,
          FARM_LAYOUT.shippingBin.w,
          FARM_LAYOUT.shippingBin.h
        );
      case 'seed_stall':
        return checkRect(
          FARM_LAYOUT.seedStall.x,
          FARM_LAYOUT.seedStall.y,
          FARM_LAYOUT.seedStall.w,
          FARM_LAYOUT.seedStall.h
        );
      case 'pond':
        return checkRect(
          FARM_LAYOUT.pond.x,
          FARM_LAYOUT.pond.y,
          FARM_LAYOUT.pond.w,
          FARM_LAYOUT.pond.h
        );
    }
  }

  private refreshContextPrompt(): void {
    let prompt: string | null = null;

    const catsOnFarm = this.world.pets.isInScene(
      'farm',
      this.world.weather.isRainy(),
      this.world.time.minutes
    );
    const nearCat = catsOnFarm
      ? this.world.pets.findNearbyCat(this.world.player.x, this.world.player.y, 26)
      : null;

    const nearAnimal = !nearCat
      ? this.world.livestock.findNearbyAnimal(this.world.player.x, this.world.player.y, 26)
      : null;

    if (nearCat) {
      const hearts = this.world.pets.getHearts(nearCat);
      const held = this.world.inventory.getSelectedItemDef();
      if (nearCat.pendingGiftItemId) {
        prompt = `按 E 抚摸【${nearCat.name}】并领取它清晨叼回的小礼物！`;
      } else if (!nearCat.pettedToday) {
        prompt = `按 E 抚摸【${nearCat.name}】（♥ ${hearts}/5 · 今日可撸猫）`;
      } else if (
        !nearCat.treatGivenToday &&
        held &&
        this.world.pets.isFavoriteTreat(nearCat.breedId, held.id)
      ) {
        prompt = `按 E 给【${nearCat.name}】投喂【${held.name}】（好感 +20）`;
      } else {
        prompt = `按 E 蹭蹭【${nearCat.name}】（♥ ${hearts}/5 · 按 P 打开猫咪面板）`;
      }
    } else if (nearAnimal) {
      const def = ANIMAL_CATALOG[nearAnimal.kind];
      prompt = nearAnimal.hasProductReady
        ? `按 E 抚摸【${nearAnimal.name}】并收获${def.name}产物！`
        : `按 E 抚摸【${nearAnimal.name}】（心情 ${nearAnimal.happiness}）`;
    } else {
      const facing = this.world.player.getFacingTile();
      const mach = this.world.machines.getAt(facing.x, facing.y);
      if (mach) {
        const mDef = getItemDef(`mach_${mach.kind}`);
        if (mach.kind === 'chest') {
          prompt = '按 E 打开木质储物箱（24 格存储）';
        } else if (this.world.machines.isOutputReady(mach)) {
          prompt = `按 E 收取【${mDef?.name ?? '机器'}】已完成的制品！`;
        } else {
          prompt = `按 E 与【${mDef?.name ?? '机器'}】交互（十字镐可收回）`;
        }
      } else {
        const nearbyZone = this.world.tileMap.getNearbyInteractiveZone(
          this.world.player.tileX,
          this.world.player.tileY
        );
        if (nearbyZone === 'house_door') {
          prompt = '按 E 进入农舍小屋（电视天气预报 / 厨房烹饪 / 自由装修 / 休息）';
        } else if (nearbyZone === 'mailbox') {
          if (!this.world.isBirthdayActive()) {
            prompt = '门廊信箱：按 E 查看信箱（暂时还没有新来信）';
          } else {
            prompt = this.world.birthdayLetterRead
              ? '门廊信箱：按 E 重读寄给依依的 12.03 火漆来信'
              : '门廊信箱：按 E 或点击拆开一封寄给依依的火漆来信';
          }
        } else if (nearbyZone === 'pet_bowl') {
          if (!this.world.pets.hasAnyCat()) {
            prompt = '猫咪水碗：按 E 或点击领养你的两只专属小猫咪！(按 P)';
          } else if (this.world.pets.bowlFilledToday) {
            prompt = '猫咪水碗：已装满清甜泉水 ✓（明早双猫好感 +24）';
          } else {
            prompt = '猫咪水碗：按 E 或用喷壶添水（明早提升小猫咪好感度）';
          }
        } else if (nearbyZone === 'town_exit') {
          prompt = '继续向东走或按 E：前往晨露小镇（村民 / 铁匠铺 / 木工坊 / 社区中心）';
        } else if (nearbyZone === 'mine_exit') {
          prompt = '向上走或按 E：进入【晨露矿洞】采集矿石宝石与挑战史莱姆';
        } else if (nearbyZone === 'greenhouse') {
          prompt = '按 E 查看社区中心收集包（修复为四季温室）';
        } else if (nearbyZone === 'seed_stall') {
          prompt = '按 E 打开田园种子铺';
        } else if (nearbyZone === 'pond') {
          const held = this.world.inventory.getSelectedItemDef();
          prompt =
            held?.toolKind === 'fishing_rod'
              ? '按 空格 / 左键 甩竿钓鱼！'
              : '水塘：用喷壶装水，或切换竹钓竿(6)甩竿钓鱼！';
        } else if (nearbyZone === 'shipping_bin') {
          const held = this.world.inventory.getSelectedItemDef();
          prompt =
            held && held.sellPrice !== undefined
              ? `按 E 放入出货箱：${held.name}（次日结算 +${held.sellPrice} G）`
              : '出货箱：选中可出售物品按 E 寄售';
        } else {
          const crop = this.world.crops.getAt(facing.x, facing.y);
          if (crop && this.world.crops.isReadyToHarvest(crop)) {
            const def = getCropDef(crop.cropId);
            prompt = `按 E / 右键采摘成熟的 ${def?.name ?? '作物'}！`;
          }
        }
      }
    }

    if (prompt !== this.lastContextPrompt) {
      this.lastContextPrompt = prompt;
      this.world.bus.emit('context:changed', { prompt });
    }
  }

  private refreshTileInspector(): void {
    const inspectTarget = this.hoveredTile ?? this.world.player.getFacingTile();
    const crop = this.world.crops.getAt(inspectTarget.x, inspectTarget.y);

    if (!crop) {
      if (this.lastInspectKey !== '') {
        this.lastInspectKey = '';
        this.world.bus.emit('inspector:changed', null);
      }
      return;
    }

    const def = getCropDef(crop.cropId);
    if (!def) return;

    const watered = this.world.tileMap.isWatered(crop.x, crop.y);
    const ready = this.world.crops.isReadyToHarvest(crop);
    const key = `${crop.x},${crop.y},${crop.cropId},${crop.daysGrown},${watered ? 1 : 0}`;
    if (key === this.lastInspectKey) return;
    this.lastInspectKey = key;

    const payload: TileInspectPayload = {
      title: def.name,
      statusLabel: ready ? '可采摘' : watered ? '已浇水' : '需浇水',
      statusKind: ready ? 'ready' : watered ? 'watered' : 'dry',
      progressPercent: Math.min(100, Math.round((crop.daysGrown / def.daysToGrow) * 100)),
      metaText: ready
        ? def.regrowDays
          ? `已成熟！采摘后每 ${def.regrowDays} 天可再收`
          : '已完全成熟，右键或按 E 采摘！'
        : `生长进度 ${crop.daysGrown} / ${def.daysToGrow} 天`,
    };
    this.world.bus.emit('inspector:changed', payload);
  }

  /* =========================================================
     RENDERING
     ========================================================= */

  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void {
    ctx.imageSmoothingEnabled = false;
    const seasonId = this.world.time.seasonId;
    ctx.fillStyle =
      seasonId === 'winter' ? '#6d8ca3' : seasonId === 'fall' ? '#6e4c23' : '#33592a';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    const zoom = this.camera.zoom;
    const camX = this.camera.renderX;
    const camY = this.camera.renderY;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const waterFrame = Math.floor(this.elapsedTime * 2) % 2;
    const tileMap = this.world.tileMap;

    const minCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
    const maxCol = Math.min(
      tileMap.cols - 1,
      Math.ceil((camX + this.camera.viewWorldWidth) / TILE_SIZE) + 1
    );
    const minRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
    const maxRow = Math.min(
      tileMap.rows - 1,
      Math.ceil((camY + this.camera.viewWorldHeight) / TILE_SIZE) + 1
    );

    // Layer 1: Ground & Soil
    for (let ty = minRow; ty <= maxRow; ty++) {
      for (let tx = minCol; tx <= maxCol; tx++) {
        const cell = tileMap.grid[ty][tx];
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        const groundSprite = this.getGroundSprite(cell.ground, cell.variant, waterFrame);
        if (groundSprite) ctx.drawImage(groundSprite, px, py);

        if (cell.ground === 'water') {
          this.drawPondRim(ctx, tx, ty, px, py);
        }
        if (cell.tilled) {
          const soilSprite = this.world.atlas.get(cell.watered ? 'soil_watered' : 'soil_tilled');
          if (soilSprite) ctx.drawImage(soilSprite, px, py);
        }
      }
    }

    // Greenhouse floor frame when unlocked (drawn beneath crops)
    if (tileMap.greenhouseUnlocked) {
      const gh = FARM_LAYOUT.greenhouse;
      ctx.fillStyle = 'rgba(130, 224, 240, 0.22)';
      ctx.fillRect(gh.x * TILE_SIZE, gh.y * TILE_SIZE, gh.w * TILE_SIZE, gh.h * TILE_SIZE);
      ctx.strokeStyle = '#6098ad';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        gh.x * TILE_SIZE + 0.75,
        gh.y * TILE_SIZE + 0.75,
        gh.w * TILE_SIZE - 1.5,
        gh.h * TILE_SIZE - 1.5
      );
    }

    // Portal directional hints (East to Town, North-East to Mines)
    const arrowBob = Math.round(Math.sin(this.elapsedTime * 4) * 2);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect((tileMap.cols - 1) * TILE_SIZE + 5 + arrowBob, 7 * TILE_SIZE + 6, 5, 3);
    ctx.fillRect((tileMap.cols - 1) * TILE_SIZE + 8 + arrowBob, 7 * TILE_SIZE + 4, 2, 7);

    // Mine Entrance Arch
    const mineArch = this.world.atlas.get('mine_entrance');
    if (mineArch) {
      ctx.drawImage(
        mineArch,
        FARM_LAYOUT.mineTrail.x * TILE_SIZE,
        FARM_LAYOUT.mineTrail.y * TILE_SIZE
      );
    }

    this.renderTargetCursor(ctx);

    // Layer 2: Y-Sorted World Objects
    const renderables: RenderableObject[] = [];

    const houseSprite = this.world.atlas.get('house');
    if (houseSprite) {
      renderables.push({
        sortY: (FARM_LAYOUT.house.y + FARM_LAYOUT.house.h) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            houseSprite,
            FARM_LAYOUT.house.x * TILE_SIZE,
            FARM_LAYOUT.house.y * TILE_SIZE - 8
          ),
      });
    }

    // Ruined Greenhouse before unlock
    if (!tileMap.greenhouseUnlocked) {
      const ruinSprite = this.world.atlas.get('building_greenhouse_ruin');
      if (ruinSprite) {
        renderables.push({
          sortY: (FARM_LAYOUT.greenhouse.y + FARM_LAYOUT.greenhouse.h) * TILE_SIZE,
          draw: (c) =>
            c.drawImage(
              ruinSprite,
              FARM_LAYOUT.greenhouse.x * TILE_SIZE,
              FARM_LAYOUT.greenhouse.y * TILE_SIZE
            ),
        });
      }
    }

    // Coop & Barn when built
    if (this.world.livestock.hasBuilding('coop')) {
      const coopSprite = this.world.atlas.get('building_coop');
      if (coopSprite) {
        renderables.push({
          sortY: (FARM_LAYOUT.coopPad.y + FARM_LAYOUT.coopPad.h) * TILE_SIZE,
          draw: (c) =>
            c.drawImage(
              coopSprite,
              FARM_LAYOUT.coopPad.x * TILE_SIZE,
              FARM_LAYOUT.coopPad.y * TILE_SIZE - 8
            ),
        });
      }
    }
    if (this.world.livestock.hasBuilding('barn')) {
      const barnSprite = this.world.atlas.get('building_barn');
      if (barnSprite) {
        renderables.push({
          sortY: (FARM_LAYOUT.barnPad.y + FARM_LAYOUT.barnPad.h) * TILE_SIZE,
          draw: (c) =>
            c.drawImage(
              barnSprite,
              FARM_LAYOUT.barnPad.x * TILE_SIZE,
              FARM_LAYOUT.barnPad.y * TILE_SIZE - 16
            ),
        });
      }
    }

    const binSprite = this.world.atlas.get('shipping_bin');
    if (binSprite) {
      renderables.push({
        sortY: (FARM_LAYOUT.shippingBin.y + FARM_LAYOUT.shippingBin.h) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            binSprite,
            FARM_LAYOUT.shippingBin.x * TILE_SIZE,
            FARM_LAYOUT.shippingBin.y * TILE_SIZE - 8
          ),
      });
    }

    // Porch Mailbox beside the farmhouse front door (shows unread 12.03 mail only once Dec 3 arrives)
    const hasUnreadBirthdayMail =
      this.world.isBirthdayActive() && !this.world.birthdayLetterRead;
    const mailboxSprite = this.world.atlas.get(
      hasUnreadBirthdayMail ? 'farm_mailbox_unread' : 'farm_mailbox_read'
    );
    if (mailboxSprite) {
      renderables.push({
        sortY: (FARM_LAYOUT.mailbox.y + FARM_LAYOUT.mailbox.h) * TILE_SIZE,
        draw: (c) => {
          const mx = FARM_LAYOUT.mailbox.x * TILE_SIZE;
          const my = (FARM_LAYOUT.mailbox.y + 1) * TILE_SIZE - mailboxSprite.height;
          c.drawImage(mailboxSprite, mx, my);
          // Classic Stardew unread letter bubble bobbing gently above mailbox (only on/after Dec 3)
          if (hasUnreadBirthdayMail) {
            const bob = Math.round(Math.sin(this.elapsedTime * 3.8) * 1.6);
            const ex = mx + 3;
            const ey = my - 8 + bob;
            c.fillStyle = '#3b1f12';
            c.fillRect(ex - 1, ey - 1, 10, 8);
            c.fillStyle = '#fff9ee';
            c.fillRect(ex, ey, 8, 6);
            c.fillStyle = '#d4b89c';
            c.fillRect(ex + 1, ey + 1, 1, 1);
            c.fillRect(ex + 6, ey + 1, 1, 1);
            c.fillRect(ex + 2, ey + 2, 1, 1);
            c.fillRect(ex + 5, ey + 2, 1, 1);
            // Tiny crimson heart wax seal
            c.fillStyle = '#e04869';
            c.fillRect(ex + 3, ey + 2, 2, 2);
          }
        },
      });
    }

    // Outdoor Pet Water Bowl beside the farmhouse
    const bowlSprite = this.world.atlas.get(
      this.world.pets.bowlFilledToday ? 'pet_bowl_full' : 'pet_bowl_empty'
    );
    if (bowlSprite) {
      renderables.push({
        sortY: (FARM_LAYOUT.petBowl.y + FARM_LAYOUT.petBowl.h) * TILE_SIZE,
        draw: (c) => {
          const bx = FARM_LAYOUT.petBowl.x * TILE_SIZE;
          const by = FARM_LAYOUT.petBowl.y * TILE_SIZE;
          c.drawImage(bowlSprite, bx, by);
          if (this.world.pets.bowlFilledToday && Math.sin(this.elapsedTime * 4) > 0.35) {
            c.fillStyle = '#ffffff';
            c.fillRect(bx + 6, by + 6, 1, 1);
            c.fillRect(bx + 10, by + 8, 1, 1);
          }
        },
      });
    }

    const stallSprite = this.world.atlas.get('seed_stall');
    if (stallSprite) {
      renderables.push({
        sortY: (FARM_LAYOUT.seedStall.y + FARM_LAYOUT.seedStall.h) * TILE_SIZE,
        draw: (c) =>
          c.drawImage(
            stallSprite,
            FARM_LAYOUT.seedStall.x * TILE_SIZE,
            FARM_LAYOUT.seedStall.y * TILE_SIZE - 8
          ),
      });
    }

    // Tile Props (Fences, Rocks, Sign, Weeds, Seasonal Oak Trees)
    const treeSpriteKey =
      seasonId === 'spring' ? 'tree_oak' : `tree_oak_${seasonId}`;
    const treeSprite = this.world.atlas.get(treeSpriteKey) ?? this.world.atlas.get('tree_oak');

    for (let ty = minRow; ty <= maxRow; ty++) {
      for (let tx = minCol; tx <= maxCol; tx++) {
        const cell = tileMap.grid[ty][tx];
        if (cell.prop === 'tree' && treeSprite) {
          const px = tx * TILE_SIZE - 8;
          const py = ty * TILE_SIZE - 22;
          renderables.push({
            sortY: (ty + 1) * TILE_SIZE,
            draw: (c) => c.drawImage(treeSprite, px, py),
          });
        } else if (
          cell.prop === 'fence_h' ||
          cell.prop === 'fence_v' ||
          cell.prop === 'rock' ||
          cell.prop === 'sign' ||
          cell.prop === 'weed'
        ) {
          const key =
            cell.prop === 'rock'
              ? 'rock_small'
              : cell.prop === 'sign'
                ? 'town_sign'
                : cell.prop === 'weed'
                  ? 'wild_weed'
                  : cell.prop;
          const sprite = this.world.atlas.get(key);
          if (sprite) {
            const px = tx * TILE_SIZE;
            const py = ty * TILE_SIZE;
            renderables.push({
              sortY: (ty + 1) * TILE_SIZE - 1,
              draw: (c) => c.drawImage(sprite, px, py),
            });
          }
        }
      }
    }

    // Placed Craftable Machines
    for (const m of this.world.machines.getAll()) {
      const sprite = this.world.atlas.get(`mach_${m.kind}`);
      if (!sprite) continue;
      const px = m.x * TILE_SIZE;
      const py = (m.y + 1) * TILE_SIZE - sprite.height;
      const ready = this.world.machines.isOutputReady(m);
      const processing = Boolean(m.processingOutputId) && !ready;

      renderables.push({
        sortY: (m.y + 1) * TILE_SIZE,
        draw: (c) => {
          const wobble = processing ? Math.round(Math.sin(this.elapsedTime * 12) * 0.7) : 0;
          c.drawImage(sprite, px + wobble, py);
          if (ready) {
            const bob = Math.round(Math.sin(this.elapsedTime * 5) * 1.5);
            c.fillStyle = '#3b1f12';
            c.fillRect(px + 4, py - 9 + bob, 8, 8);
            c.fillStyle = '#fff7d4';
            c.fillRect(px + 5, py - 8 + bob, 6, 6);
            c.fillStyle = '#6ec242';
            c.fillRect(px + 7, py - 6 + bob, 2, 2);
          }
        },
      });
    }

    // Planted Crops
    for (const crop of this.world.crops.getAll()) {
      const stage = this.world.crops.getStageIndex(crop);
      const sprite = this.world.atlas.get(`crop_${crop.cropId}_${stage}`);
      if (!sprite) continue;
      const ready = this.world.crops.isReadyToHarvest(crop);
      const px = crop.x * TILE_SIZE;
      const py = crop.y * TILE_SIZE - 4;
      const pulse = ready ? Math.sin(this.elapsedTime * 5 + crop.x + crop.y) : 0;

      renderables.push({
        sortY: (crop.y + 0.85) * TILE_SIZE,
        draw: (c) => {
          c.drawImage(sprite, px, py);
          if (ready && pulse > 0.2) {
            const sy = py + 1 - Math.round(pulse * 2);
            c.fillStyle = '#fff9c4';
            c.fillRect(px + 7, sy, 2, 2);
            c.fillStyle = '#ffd54f';
            c.fillRect(px + 6, sy + 1, 1, 1);
            c.fillRect(px + 9, sy + 1, 1, 1);
          }
        },
      });
    }

    // Farm Livestock Animals
    for (const animal of this.world.livestock.animals) {
      const def = ANIMAL_CATALOG[animal.kind];
      const sprite = this.world.atlas.get(def.spriteKey);
      if (!sprite) continue;
      renderables.push({
        sortY: animal.y + 4,
        draw: (c) => {
          const ax = Math.round(animal.x - sprite.width / 2);
          const ay = Math.round(animal.y - sprite.height + 4);
          c.drawImage(sprite, ax, ay);
          if (animal.hasProductReady) {
            const bob = Math.round(Math.sin(this.elapsedTime * 5 + animal.x) * 1.5);
            c.fillStyle = '#3b1f12';
            c.fillRect(ax + 5, ay - 7 + bob, 7, 6);
            c.fillStyle = '#ffe570';
            c.fillRect(ax + 6, ay - 6 + bob, 5, 4);
          }
        },
      });
    }

    // Companion Cats (sunny/breezy daytime on Farm!)
    if (
      this.world.pets.isInScene('farm', this.world.weather.isRainy(), this.world.time.minutes)
    ) {
      for (const cat of this.world.pets.cats) {
        const sprite = this.world.atlas.get(this.world.pets.getSpriteKey(cat));
        if (!sprite) continue;
        renderables.push({
          sortY: cat.y + 4,
          draw: (c) => drawCat(c, sprite, cat, this.elapsedTime),
        });
      }
    }

    // Player Character
    renderables.push({
      sortY: this.world.player.y + 4,
      draw: (c) => this.renderPlayer(c),
    });

    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const obj of renderables) obj.draw(ctx);

    this.world.particles.renderWorld(ctx);
    ctx.restore();

    // Outdoor Weather Layer
    this.world.weather.renderOutdoor(ctx, viewportWidth, viewportHeight, seasonId);

    // Optional Yiyi 12.03 Romantic Sakura & Rose Petal Shower on Farm!
    if (this.world.isBirthdayActive() && this.world.pets.celebratingOnFarm) {
      this.renderBirthdayPetalShower(ctx, viewportWidth, viewportHeight);
    }

    // Ambient Daylight / Dusk Tint
    const light = this.world.time.getAmbientLight();
    if (light.alpha > 0.005) {
      ctx.save();
      ctx.globalAlpha = light.alpha;
      ctx.fillStyle = light.color;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      ctx.restore();
    }

    this.renderFarmSignLabels(ctx, camX, camY, zoom);
    this.world.particles.renderFloatingTexts(ctx, camX, camY, zoom);
  }

  private renderBirthdayPetalShower(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    ctx.save();
    const petalColors = [
      'rgba(255, 176, 205, 0.82)',
      'rgba(255, 214, 228, 0.78)',
      'rgba(255, 228, 178, 0.72)',
    ];
    for (let i = 0; i < 34; i++) {
      const seed = i * 97.31;
      const speedY = 24 + (i % 5) * 6;
      const x =
        ((seed * 19 + viewportWidth * 2 - this.elapsedTime * (14 + (i % 4) * 4)) %
          (viewportWidth + 40)) -
        20 +
        Math.sin(this.elapsedTime * 1.8 + i) * 14;
      const y = ((seed * 13 + this.elapsedTime * speedY) % (viewportHeight + 30)) - 15;
      const rot = this.elapsedTime * (1.2 + (i % 3) * 0.4) + i;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = petalColors[i % petalColors.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private renderFarmSignLabels(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number
  ): void {
    ctx.save();
    ctx.font = '700 11px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    const label = (wx: number, wy: number, text: string, color = '#fff7dc'): void => {
      const sx = Math.round((wx - camX) * zoom);
      const sy = Math.round((wy - camY) * zoom);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(42,22,11,0.88)';
      ctx.strokeText(text, sx, sy);
      ctx.fillStyle = color;
      ctx.fillText(text, sx, sy);
    };

    label((FARM_LAYOUT.mineTrail.x + 1.5) * TILE_SIZE, 2.2 * TILE_SIZE, '▲ 晨露矿洞', '#d6d0ff');
    if (this.world.isBirthdayActive() && this.world.pets.celebratingOnFarm) {
      label(
        (FARM_LAYOUT.house.x + 2.5) * TILE_SIZE,
        FARM_LAYOUT.house.y * TILE_SIZE - 10,
        '✨ ♥ 12.03 依依生日快乐 ♥ ✨',
        '#ffc2da'
      );
    }
    label(
      (FARM_LAYOUT.greenhouse.x + 2.5) * TILE_SIZE,
      FARM_LAYOUT.greenhouse.y * TILE_SIZE - 2,
      this.world.tileMap.greenhouseUnlocked ? '☀ 四季温室' : '破旧温室',
      this.world.tileMap.greenhouseUnlocked ? '#a8f2ff' : '#e6cfa3'
    );
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const sprite = this.world.atlas.get(this.world.player.getSpriteKey());
    if (!sprite) return;
    const drawX = Math.round(this.world.player.x - 8);
    const drawY = Math.round(this.world.player.y - 19);
    ctx.drawImage(sprite, drawX, drawY);

    if (this.world.player.isSwinging) {
      const held = this.world.inventory.getSelectedItemDef();
      if (held && held.category === 'tool') {
        const toolSprite = this.world.atlas.get(held.spriteKey);
        if (toolSprite) {
          const offset = this.getToolSwingOffset();
          ctx.drawImage(toolSprite, drawX + offset.x, drawY + offset.y, 12, 12);
        }
      }
    }
  }

  private getToolSwingOffset(): { x: number; y: number } {
    const p = Math.sin(this.world.player.swingProgress * Math.PI) * 3;
    switch (this.world.player.facing) {
      case 'left':
        return { x: -7 - Math.round(p), y: 8 };
      case 'right':
        return { x: 11 + Math.round(p), y: 8 };
      case 'up':
        return { x: 2, y: -3 - Math.round(p) };
      case 'down':
        return { x: 2, y: 14 + Math.round(p) };
    }
  }

  private renderTargetCursor(ctx: CanvasRenderingContext2D): void {
    const target = this.hoveredTile ?? this.world.player.getFacingTile();
    if (!this.world.tileMap.inBounds(target.x, target.y)) return;

    const held = this.world.inventory.getSelectedItemDef();
    const tiles =
      held && (held.toolKind === 'hoe' || held.toolKind === 'watering_can')
        ? this.world.stats.getToolAreaTiles(
            held.toolKind,
            target.x,
            target.y,
            this.world.player.facing
          )
        : [target];

    const reachable =
      this.world.player.isTileWithinReach(target.x, target.y) ||
      (() => {
        const zone = this.world.tileMap.getInteractiveZoneAt(target.x, target.y);
        return zone !== null && this.isNearZone(zone);
      })();

    ctx.save();
    for (const pt of tiles) {
      if (!this.world.tileMap.inBounds(pt.x, pt.y)) continue;
      const x = pt.x * TILE_SIZE;
      const y = pt.y * TILE_SIZE;
      ctx.fillStyle = reachable ? 'rgba(255, 244, 179, 0.17)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = reachable ? '#fff0a6' : 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
    ctx.restore();
  }

  private drawPondRim(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    px: number,
    py: number
  ): void {
    const north = this.world.tileMap.getTile(tx, ty - 1);
    if (north && north.ground !== 'water') {
      ctx.fillStyle = '#5c9140';
      ctx.fillRect(px, py, TILE_SIZE, 2);
      ctx.fillStyle = '#2d6c99';
      ctx.fillRect(px, py + 2, TILE_SIZE, 1);
    }
    const south = this.world.tileMap.getTile(tx, ty + 1);
    if (south && south.ground !== 'water') {
      ctx.fillStyle = '#c4a16c';
      ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
    }
  }

  private getGroundSprite(
    ground: string,
    variant: number,
    waterFrame: number
  ): HTMLCanvasElement | undefined {
    if (ground === 'water') return this.world.atlas.get(`water_${waterFrame}`);
    if (ground === 'path') return this.world.atlas.get('path_stone');
    if (ground === 'dirt') return this.world.atlas.get(`dirt_farm_${variant % 2}`);

    const seasonId = this.world.time.seasonId;
    if (seasonId !== 'spring') {
      return this.world.atlas.get(`grass_${seasonId}`) ?? this.world.atlas.get('grass_0');
    }
    if (variant === 0) return this.world.atlas.get('grass_flower_yellow');
    if (variant === 1) return this.world.atlas.get('grass_flower_pink');
    if (variant === 2) return this.world.atlas.get('grass_clover');
    return this.world.atlas.get(`grass_${variant % 3}`);
  }
}
