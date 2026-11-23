import type { GameWorld } from '../core/GameWorld';
import { getItemDef } from '../data/items';
import { MINE_ROCK_DEFS } from '../data/mining';
import { DEFAULT_CAMERA_ZOOM, FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';
import { Camera } from '../engine/Camera';
import { HOUSE_FIXTURES } from '../systems/HouseInteriorSystem';
import type { Scene } from './SceneManager';

interface Renderable {
  sortY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Underground Mine Scene (`MineScene`):
 * - Procedural cavern floors with Copper, Iron, Gold & Gem veins
 * - Pickaxe mining to uncover downward ladders
 * - Slime enemy AI & Sword melee combat with knockback, HP bar & safe rescue
 */
export class MineScene implements Scene {
  readonly id = 'mine' as const;
  readonly camera: Camera;

  private readonly world: GameWorld;
  private elapsedTime = 0;
  private slashEffectTimer = 0;
  private hurtFlashTimer = 0;
  private lastContextPrompt: string | null = null;
  private ladderCooldown = 0;

  constructor(world: GameWorld) {
    this.world = world;
    this.camera = new Camera(
      world.mine.worldWidth,
      world.mine.worldHeight,
      DEFAULT_CAMERA_ZOOM
    );
  }

  enter(): void {
    this.ladderCooldown = 0.5;
    this.lastContextPrompt = null;
    if (this.world.mine.rocks.size === 0 && this.world.mine.slimes.length === 0) {
      this.world.mine.generateFloor(1);
    }
    this.camera.snapTo(this.world.player.x, this.world.player.y);
    this.world.emitMineSync();
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
    if (this.ladderCooldown > 0) this.ladderCooldown = Math.max(0, this.ladderCooldown - dt);
    if (this.slashEffectTimer > 0) this.slashEffectTimer = Math.max(0, this.slashEffectTimer - dt);
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);

    const { dx, dy } = this.world.input.getMovementVector();
    this.world.player.update(dx, dy, dt, this.world.mine);
    this.camera.follow(this.world.player.x, this.world.player.y - 4, dt);

    // Update Slime AI & player combat damage
    const dmg = this.world.mine.updateSlimes(dt, this.world.player.x, this.world.player.y);
    if (dmg > 0) {
      this.hurtFlashTimer = 0.25;
      this.world.audio.play('hurt');
      this.world.particles.spawnFloatingText(
        this.world.player.x,
        this.world.player.y - 14,
        `-${dmg} HP`,
        '#ff6b6b'
      );
      const { fainted } = this.world.stats.takeDamage(dmg);
      this.world.emitStatsSync();

      if (fainted) {
        this.world.stats.hp = 50;
        this.world.emitStatsSync();
        this.world.toast('在矿洞中体力不支晕倒了！热心的罗宾把你平安送回了农舍小屋');
        this.world.travelTo('house', {
          x: HOUSE_FIXTURES.bedWakeSpawn.x,
          y: HOUSE_FIXTURES.bedWakeSpawn.y,
          facing: 'right',
        });
        return;
      }
    }

    this.world.advanceClock(dt);
    this.world.particles.update(dt);
    this.refreshContextPrompt();
  }

  handlePrimaryClick(screenX: number, screenY: number): void {
    if (this.world.sleepingTransition) return;
    const wp = this.camera.screenToWorld(screenX, screenY);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);

    this.world.player.faceTowardsTile(tx, ty);
    this.performMineAction(tx, ty);
  }

  handleSecondaryClick(screenX: number, screenY: number): void {
    const wp = this.camera.screenToWorld(screenX, screenY);
    const tx = Math.floor(wp.x / TILE_SIZE);
    const ty = Math.floor(wp.y / TILE_SIZE);
    if (this.tryUseLadderAt(tx, ty)) return;
    this.handlePrimaryClick(screenX, screenY);
  }

  handleActionKey(): void {
    const target = this.world.player.getFacingTile();
    this.performMineAction(target.x, target.y);
  }

  handleInteractKey(): void {
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;
    const facing = this.world.player.getFacingTile();

    if (this.tryUseLadderAt(px, py) || this.tryUseLadderAt(facing.x, facing.y)) {
      return;
    }

    // Eat held food inside Mine to heal HP/Stamina!
    const held = this.world.inventory.getSelectedItemDef();
    if (held && (held.energyRestore || held.healthRestore)) {
      this.world.eatFromSlot(this.world.inventory.selectedSlot);
    }
  }

  private performMineAction(tx: number, ty: number): void {
    if (this.tryUseLadderAt(tx, ty)) return;

    const held = this.world.inventory.getSelectedItemDef();

    // Sword slash (zero energy, hits slimes in wide radius!)
    if (held?.toolKind === 'sword') {
      this.swingAtSlimes(2 + Math.floor(this.world.mine.floor / 6), 34);
      return;
    }

    // Check if there is a rock at target tile -> mine with Pickaxe
    const rock = this.world.mine.rocks.get(`${tx},${ty}`);
    if (rock && this.world.player.isTileWithinReach(tx, ty)) {
      if (held?.toolKind !== 'pickaxe') {
        this.world.toast('请按 4 切换【十字镐】来开采岩石和矿脉！');
        return;
      }
      if (!this.world.tryConsumeEnergy(3)) return;
      this.world.player.triggerToolSwing();
      const power = this.world.stats.getToolPower('pickaxe');
      const res = this.world.mine.hitRock(tx, ty, power);
      const wx = (tx + 0.5) * TILE_SIZE;
      const wy = (ty + 0.5) * TILE_SIZE;
      this.world.audio.play('mine');
      this.world.particles.spawnDirtBurst(wx, wy);

      if (res?.broken) {
        for (const d of res.drops) {
          this.world.inventory.addItem(d.itemId, d.quantity);
          this.world.collections.recordDiscovery(d.itemId);
          const name = getItemDef(d.itemId)?.name ?? d.itemId;
          this.world.particles.spawnFloatingText(wx, wy, `+${d.quantity} ${name}`, '#a8e6ff');
        }
        if (res.revealedLadder) {
          this.world.audio.play('harvest');
          this.world.toast('发现了通往下一层的木梯！踩上去按 E 即可深入探索！');
        }
        this.world.bus.emit('inventory:changed', undefined);
        this.world.bus.emit('bundles:changed', undefined);
        this.world.emitMineSync();
        this.world.saveGameState();
      }
      return;
    }

    // Fallback: swing at nearby slimes even with Pickaxe if close
    this.swingAtSlimes(1, 26);
  }

  private swingAtSlimes(damage: number, rangePx: number): void {
    this.world.player.triggerToolSwing();
    this.slashEffectTimer = 0.18;
    this.world.audio.play('slash');
    const res = this.world.mine.attackSlimes(
      this.world.player.x,
      this.world.player.y,
      damage,
      rangePx
    );
    if (res.hits > 0) {
      this.world.particles.spawnHarvestSparkle(this.world.player.x, this.world.player.y - 4);
      for (const d of res.drops) {
        this.world.inventory.addItem(d.itemId, d.quantity);
        this.world.collections.recordDiscovery(d.itemId);
        const name = getItemDef(d.itemId)?.name ?? d.itemId;
        this.world.particles.spawnFloatingText(
          this.world.player.x,
          this.world.player.y - 16,
          `+${d.quantity} ${name}`,
          '#9bff9e'
        );
      }
      if (res.defeated > 0) {
        this.world.audio.play('harvest');
        this.world.bus.emit('inventory:changed', undefined);
        this.world.bus.emit('bundles:changed', undefined);
        this.world.emitMineSync();
        this.world.saveGameState();
      }
    }
  }

  private tryUseLadderAt(tx: number, ty: number): boolean {
    if (this.ladderCooldown > 0) return false;
    const exit = this.world.mine.exitLadderTile;
    if (
      Math.abs(tx - exit.x) <= 1 &&
      Math.abs(ty - exit.y) <= 1 &&
      Math.abs(this.world.player.tileX - exit.x) <= 1 &&
      Math.abs(this.world.player.tileY - exit.y) <= 1
    ) {
      this.world.audio.play('ui');
      this.world.travelTo('farm', {
        x: FARM_LAYOUT.mineTrail.x + 1.5,
        y: 2.8,
        facing: 'down',
      });
      return true;
    }

    const down = this.world.mine.downLadderTile;
    if (
      down &&
      Math.abs(tx - down.x) <= 1 &&
      Math.abs(ty - down.y) <= 1 &&
      Math.abs(this.world.player.tileX - down.x) <= 1 &&
      Math.abs(this.world.player.tileY - down.y) <= 1
    ) {
      this.world.audio.play('ui');
      this.world.enterMineFloor(this.world.mine.floor + 1);
      this.world.toast(`深入地下第 ${this.world.mine.floor} 层！`);
      return true;
    }
    return false;
  }

  private refreshContextPrompt(): void {
    const px = this.world.player.tileX;
    const py = this.world.player.tileY;
    const exit = this.world.mine.exitLadderTile;
    const down = this.world.mine.downLadderTile;

    let prompt: string | null = null;
    if (Math.abs(px - exit.x) <= 1 && Math.abs(py - exit.y) <= 1) {
      prompt = '按 E 或点击金梯：离开矿洞返回晨露农场';
    } else if (down && Math.abs(px - down.x) <= 1 && Math.abs(py - down.y) <= 1) {
      prompt = `按 E 或点击下层梯子：前往地下第 ${this.world.mine.floor + 1} 层！`;
    } else {
      prompt = `晨露矿洞 ${this.world.mine.floor}F：十字镐(4)挖矿找梯子 · 铁剑(7)击退史莱姆 · 选中食物按 E 回血`;
    }

    if (prompt !== this.lastContextPrompt) {
      this.lastContextPrompt = prompt;
      this.world.bus.emit('context:changed', { prompt });
    }
  }

  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#15121a';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    const zoom = this.camera.zoom;
    const camX = this.camera.renderX;
    const camY = this.camera.renderY;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const mine = this.world.mine;

    // 1. Cavern Walls & Stone Floor
    for (let y = 0; y < mine.rows; y++) {
      for (let x = 0; x < mine.cols; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (x === 0 || x === mine.cols - 1 || y <= 1 || y === mine.rows - 1) {
          const wall = this.world.atlas.get('mine_wall');
          if (wall) ctx.drawImage(wall, px, py);
        } else {
          const floor = this.world.atlas.get(`mine_floor_${(x + y) % 2}`);
          if (floor) ctx.drawImage(floor, px, py);
        }
      }
    }

    // Exit Ladder & Downward Ladder
    const exitSprite = this.world.atlas.get('mine_exit_ladder');
    if (exitSprite) {
      ctx.drawImage(
        exitSprite,
        mine.exitLadderTile.x * TILE_SIZE,
        mine.exitLadderTile.y * TILE_SIZE
      );
    }
    if (mine.downLadderTile) {
      const downSprite = this.world.atlas.get('mine_ladder');
      if (downSprite) {
        ctx.drawImage(
          downSprite,
          mine.downLadderTile.x * TILE_SIZE,
          mine.downLadderTile.y * TILE_SIZE
        );
      }
    }

    // 2. Y-Sorted Rocks, Slimes & Player
    const renderables: Renderable[] = [];

    for (const rock of mine.rocks.values()) {
      const def = MINE_ROCK_DEFS[rock.kind];
      const sprite = this.world.atlas.get(def.spriteKey);
      if (!sprite) continue;
      renderables.push({
        sortY: (rock.y + 1) * TILE_SIZE,
        draw: (c) => {
          const rx = rock.x * TILE_SIZE;
          const ry = rock.y * TILE_SIZE;
          c.drawImage(sprite, rx, ry);
          if (rock.hp < rock.maxHp) {
            c.fillStyle = '#291a14';
            c.fillRect(rx + 2, ry - 3, 12, 2);
            c.fillStyle = '#ffd942';
            c.fillRect(rx + 2, ry - 3, Math.round((rock.hp / rock.maxHp) * 12), 2);
          }
        },
      });
    }

    const slimeFrame = Math.floor(this.elapsedTime * 4) % 2;
    for (const s of mine.slimes) {
      const sprite = this.world.atlas.get(`slime_${s.variant}_${slimeFrame}`);
      if (!sprite) continue;
      renderables.push({
        sortY: s.y + 4,
        draw: (c) => {
          const sx = Math.round(s.x - 8);
          const sy = Math.round(s.y - 10);
          c.drawImage(sprite, sx, sy);
          if (s.hp < s.maxHp) {
            c.fillStyle = '#291218';
            c.fillRect(sx + 2, sy - 3, 12, 2);
            c.fillStyle = '#ff6176';
            c.fillRect(sx + 2, sy - 3, Math.round((s.hp / s.maxHp) * 12), 2);
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
        // Sword slash crescent arc
        if (this.slashEffectTimer > 0) {
          c.save();
          c.strokeStyle = '#e8f6ff';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(this.world.player.x, this.world.player.y - 6, 18, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }
      },
    });

    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const obj of renderables) obj.draw(ctx);

    // Cozy warm lantern halo around player inside dark cavern
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffd573';
    ctx.beginPath();
    ctx.arc(this.world.player.x, this.world.player.y - 6, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.world.particles.renderWorld(ctx);
    ctx.restore();

    // Red hurt vignette flash
    if (this.hurtFlashTimer > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 42, 54, ${(this.hurtFlashTimer * 1.1).toFixed(2)})`;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      ctx.restore();
    }

    this.world.particles.renderFloatingTexts(ctx, camX, camY, zoom);
  }
}
