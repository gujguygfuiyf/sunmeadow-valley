import { FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';

export type FacingDir = 'down' | 'up' | 'left' | 'right';

export interface CollisionGrid {
  isSolid(tx: number, ty: number): boolean;
}

/**
 * Controls the pixel farmer's physics, AABB collision against any scene's collision grid,
 * walk animation, facing direction, and tool-swing feedback.
 */
export class PlayerSystem {
  /** World-pixel center of the farmer's feet collider */
  x: number;
  y: number;
  facing: FacingDir = 'down';

  readonly speed = 64; // world pixels per second (~4 tiles/sec)
  private readonly halfW = 5;
  private readonly halfH = 4;

  private walkTimer = 0;
  private isMoving = false;
  private swingTimer = 0;
  private swingDuration = 0.22;

  constructor() {
    this.x = FARM_LAYOUT.spawnTile.x * TILE_SIZE;
    this.y = FARM_LAYOUT.spawnTile.y * TILE_SIZE;
  }

  resetToSpawn(): void {
    this.x = FARM_LAYOUT.spawnTile.x * TILE_SIZE;
    this.y = FARM_LAYOUT.spawnTile.y * TILE_SIZE;
    this.facing = 'down';
    this.walkTimer = 0;
    this.swingTimer = 0;
  }

  setPositionTile(tileX: number, tileY: number, facing: FacingDir = 'down'): void {
    this.x = tileX * TILE_SIZE;
    this.y = tileY * TILE_SIZE;
    this.facing = facing;
    this.walkTimer = 0;
  }

  update(dx: number, dy: number, dt: number, collisionGrid: CollisionGrid): void {
    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - dt);
    }

    this.isMoving = dx !== 0 || dy !== 0;
    if (!this.isMoving) {
      this.walkTimer = 0;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dy < 0 ? 'up' : 'down';
    }

    this.walkTimer += dt * 7.5;

    // Axis-separated movement for crisp wall sliding
    const nextX = this.x + dx * this.speed * dt;
    if (!this.collidesAt(nextX, this.y, collisionGrid)) {
      this.x = nextX;
    }

    const nextY = this.y + dy * this.speed * dt;
    if (!this.collidesAt(this.x, nextY, collisionGrid)) {
      this.y = nextY;
    }
  }

  triggerToolSwing(): void {
    this.swingTimer = this.swingDuration;
  }

  get isSwinging(): boolean {
    return this.swingTimer > 0;
  }

  get swingProgress(): number {
    if (this.swingTimer <= 0) return 0;
    return 1 - this.swingTimer / this.swingDuration;
  }

  get tileX(): number {
    return Math.floor(this.x / TILE_SIZE);
  }

  get tileY(): number {
    return Math.floor(this.y / TILE_SIZE);
  }

  /** Tile directly in front of the player based on facing direction. */
  getFacingTile(): { x: number; y: number } {
    const tx = this.tileX;
    const ty = this.tileY;
    switch (this.facing) {
      case 'up':
        return { x: tx, y: ty - 1 };
      case 'down':
        return { x: tx, y: ty + 1 };
      case 'left':
        return { x: tx - 1, y: ty };
      case 'right':
        return { x: tx + 1, y: ty };
    }
  }

  faceTowardsTile(tx: number, ty: number): void {
    const dx = tx - this.tileX;
    const dy = ty - this.tileY;
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dy < 0 ? 'up' : 'down';
    }
  }

  /** Allows comfortable Stardew-style 1-tile Chebyshev reach (including diagonals & standing tile). */
  isTileWithinReach(tx: number, ty: number): boolean {
    return Math.abs(tx - this.tileX) <= 1 && Math.abs(ty - this.tileY) <= 1;
  }

  getSpriteKey(): string {
    if (!this.isMoving) return `player_${this.facing}_0`;
    const step = Math.floor(this.walkTimer) % 4;
    const frame = step === 1 ? 1 : step === 3 ? 2 : 0;
    return `player_${this.facing}_${frame}`;
  }

  private collidesAt(cx: number, cy: number, collisionGrid: CollisionGrid): boolean {
    const left = Math.floor((cx - this.halfW) / TILE_SIZE);
    const right = Math.floor((cx + this.halfW) / TILE_SIZE);
    const top = Math.floor((cy - this.halfH) / TILE_SIZE);
    const bottom = Math.floor((cy + this.halfH) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (collisionGrid.isSolid(tx, ty)) return true;
      }
    }
    return false;
  }
}
