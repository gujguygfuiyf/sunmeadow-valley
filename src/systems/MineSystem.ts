import { MINE_ROCK_DEFS, type MineRockKind } from '../data/mining';
import { TILE_SIZE } from '../data/worldConfig';
import type { CollisionGrid } from './PlayerSystem';

export const MINE_COLS = 18;
export const MINE_ROWS = 14;

export interface MineRockNode {
  x: number;
  y: number;
  kind: MineRockKind;
  hp: number;
  maxHp: number;
}

export type SlimeVariant = 'green' | 'blue' | 'purple';

export interface MineSlime {
  uid: string;
  variant: SlimeVariant;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackCooldown: number;
  knockbackTimer: number;
}

export interface MineHitRockResult {
  broken: boolean;
  revealedLadder: boolean;
  drops: { itemId: string; quantity: number }[];
}

export interface MineSlashResult {
  hits: number;
  defeated: number;
  drops: { itemId: string; quantity: number }[];
}

/**
 * Procedural underground Mine system:
 * - Generates cavern floors 1F..25F+ with depth-scaled Copper, Iron, Gold & Gems
 * - Spawns wandering/chasing Slimes with knockback & melee combat
 * - Uncovers ladders downward as rocks are broken
 */
export class MineSystem implements CollisionGrid {
  readonly cols = MINE_COLS;
  readonly rows = MINE_ROWS;
  readonly tileSize = TILE_SIZE;

  floor = 1;
  deepestFloor = 1;

  readonly exitLadderTile = { x: 8, y: 2 };
  downLadderTile: { x: number; y: number } | null = null;
  rocks = new Map<string, MineRockNode>();
  slimes: MineSlime[] = [];

  private slimeSeq = 1;
  private rocksBrokenThisFloor = 0;

  get worldWidth(): number {
    return this.cols * this.tileSize;
  }

  get worldHeight(): number {
    return this.rows * this.tileSize;
  }

  static key(x: number, y: number): string {
    return `${x},${y}`;
  }

  isSolid(tx: number, ty: number): boolean {
    if (tx <= 0 || ty <= 1 || tx >= this.cols - 1 || ty >= this.rows - 1) return true;
    return this.rocks.has(MineSystem.key(tx, ty));
  }

  generateFloor(floorNum: number, rng: () => number = Math.random): void {
    this.floor = Math.max(1, Math.floor(floorNum));
    this.deepestFloor = Math.max(this.deepestFloor, this.floor);
    this.rocks.clear();
    this.slimes = [];
    this.downLadderTile = null;
    this.rocksBrokenThisFloor = 0;

    // 1. Populate rocks & ore veins scaled by depth
    const targetRocks = 26 + Math.min(14, this.floor);
    for (let attempt = 0; attempt < 180 && this.rocks.size < targetRocks; attempt++) {
      const tx = 1 + Math.floor(rng() * (this.cols - 2));
      const ty = 2 + Math.floor(rng() * (this.rows - 3));
      // Keep entrance spawn zone open
      if (Math.abs(tx - this.exitLadderTile.x) <= 2 && Math.abs(ty - this.exitLadderTile.y) <= 2) {
        continue;
      }
      const key = MineSystem.key(tx, ty);
      if (this.rocks.has(key)) continue;

      const kind = this.rollRockKind(this.floor, rng);
      const def = MINE_ROCK_DEFS[kind];
      this.rocks.set(key, {
        x: tx,
        y: ty,
        kind,
        hp: def.hp,
        maxHp: def.hp,
      });
    }

    // 2. Spawn depth-appropriate Slimes
    const slimeCount = Math.min(5, 2 + Math.floor(this.floor / 3));
    for (let i = 0; i < slimeCount; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const tx = 2 + Math.floor(rng() * (this.cols - 4));
        const ty = 5 + Math.floor(rng() * (this.rows - 7));
        if (this.rocks.has(MineSystem.key(tx, ty))) continue;

        const variant: SlimeVariant =
          this.floor >= 11 ? 'purple' : this.floor >= 5 ? 'blue' : 'green';
        const maxHp = variant === 'purple' ? 6 : variant === 'blue' ? 4 : 3;
        const damage = variant === 'purple' ? 14 : variant === 'blue' ? 10 : 7;

        this.slimes.push({
          uid: `slime_${this.slimeSeq++}`,
          variant,
          x: (tx + 0.5) * TILE_SIZE,
          y: (ty + 0.5) * TILE_SIZE,
          vx: 0,
          vy: 0,
          hp: maxHp,
          maxHp,
          damage,
          attackCooldown: 0.6,
          knockbackTimer: 0,
        });
        break;
      }
    }
  }

  hitRock(
    tx: number,
    ty: number,
    power = 1,
    rng: () => number = Math.random
  ): MineHitRockResult | null {
    const key = MineSystem.key(tx, ty);
    const rock = this.rocks.get(key);
    if (!rock) return null;

    rock.hp -= power;
    if (rock.hp > 0) {
      return { broken: false, revealedLadder: false, drops: [] };
    }

    this.rocks.delete(key);
    this.rocksBrokenThisFloor += 1;

    const def = MINE_ROCK_DEFS[rock.kind];
    const span = def.dropMax - def.dropMin + 1;
    const qty = def.dropMin + Math.floor(rng() * span);
    let dropId = def.dropItemId;
    if (rock.kind === 'gem') {
      const r = rng();
      dropId =
        this.floor >= 10 && r < 0.35
          ? 'gem_ruby'
          : this.floor >= 5 && r < 0.7
            ? 'gem_emerald'
            : 'gem_amethyst';
    }

    let revealedLadder = false;
    if (!this.downLadderTile) {
      const ladderChance = Math.min(1, 0.16 + this.rocksBrokenThisFloor * 0.11);
      if (this.rocks.size <= 3 || rng() < ladderChance) {
        this.downLadderTile = { x: tx, y: ty };
        revealedLadder = true;
      }
    }

    return {
      broken: true,
      revealedLadder,
      drops: [{ itemId: dropId, quantity: qty }],
    };
  }

  /** Swings sword/weapon around player position, damaging & knocking back nearby Slimes. */
  attackSlimes(
    playerX: number,
    playerY: number,
    damage = 2,
    rangePx = 28,
    rng: () => number = Math.random
  ): MineSlashResult {
    let hits = 0;
    let defeated = 0;
    const drops: { itemId: string; quantity: number }[] = [];

    for (let i = this.slimes.length - 1; i >= 0; i--) {
      const s = this.slimes[i];
      const dx = s.x - playerX;
      const dy = s.y - playerY;
      const dist = Math.hypot(dx, dy);
      if (dist > rangePx) continue;

      hits += 1;
      s.hp -= damage;
      const nx = dist > 0.01 ? dx / dist : 1;
      const ny = dist > 0.01 ? dy / dist : 0;
      s.vx = nx * 95;
      s.vy = ny * 95;
      s.knockbackTimer = 0.22;

      if (s.hp <= 0) {
        this.slimes.splice(i, 1);
        defeated += 1;
        drops.push({ itemId: 'res_slime', quantity: 1 + (rng() < 0.35 ? 1 : 0) });
        if (rng() < 0.25) {
          drops.push({
            itemId: this.floor >= 8 ? 'gem_emerald' : 'gem_amethyst',
            quantity: 1,
          });
        }
        // Defeating the last slime guarantees ladder reveal if not found yet!
        if (this.slimes.length === 0 && !this.downLadderTile) {
          const lx = Math.max(2, Math.min(this.cols - 3, Math.floor(s.x / TILE_SIZE)));
          const ly = Math.max(3, Math.min(this.rows - 3, Math.floor(s.y / TILE_SIZE)));
          this.downLadderTile = { x: lx, y: ly };
        }
      }
    }

    return { hits, defeated, drops };
  }

  /** Updates slime AI & returns damage dealt to the player this tick (0 if none). */
  updateSlimes(dt: number, playerX: number, playerY: number): number {
    let playerDamage = 0;

    for (const s of this.slimes) {
      if (s.attackCooldown > 0) s.attackCooldown = Math.max(0, s.attackCooldown - dt);

      if (s.knockbackTimer > 0) {
        s.knockbackTimer = Math.max(0, s.knockbackTimer - dt);
        const nx = s.x + s.vx * dt;
        const ny = s.y + s.vy * dt;
        if (!this.isSolid(Math.floor(nx / TILE_SIZE), Math.floor(s.y / TILE_SIZE))) s.x = nx;
        if (!this.isSolid(Math.floor(s.x / TILE_SIZE), Math.floor(ny / TILE_SIZE))) s.y = ny;
        continue;
      }

      const dx = playerX - s.x;
      const dy = playerY - s.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 13 && s.attackCooldown <= 0) {
        playerDamage += s.damage;
        s.attackCooldown = 1.15;
      } else if (dist < 110 && dist > 10) {
        const speed = s.variant === 'purple' ? 28 : s.variant === 'blue' ? 24 : 20;
        const stepX = (dx / dist) * speed * dt;
        const stepY = (dy / dist) * speed * dt;
        const nx = s.x + stepX;
        const ny = s.y + stepY;
        if (!this.isSolid(Math.floor(nx / TILE_SIZE), Math.floor(s.y / TILE_SIZE))) s.x = nx;
        if (!this.isSolid(Math.floor(s.x / TILE_SIZE), Math.floor(ny / TILE_SIZE))) s.y = ny;
      }
    }

    return playerDamage;
  }

  private rollRockKind(floor: number, rng: () => number): MineRockKind {
    const r = rng();
    if (r < 0.09) return 'gem';
    if (floor >= 10) {
      if (r < 0.34) return 'gold';
      if (r < 0.56) return 'iron';
      return 'stone';
    }
    if (floor >= 5) {
      if (r < 0.36) return 'iron';
      if (r < 0.54) return 'copper';
      return 'stone';
    }
    if (r < 0.42) return 'copper';
    return 'stone';
  }
}
