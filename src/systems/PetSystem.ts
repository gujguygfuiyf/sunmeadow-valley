import type { SceneId } from '../data/events';
import { CAT_BREEDS, CAT_BREED_IDS, getCatBreedDef, type CatBreedId } from '../data/pets';
import { FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';
import type { SerializedPetState } from '../engine/SaveManager';
import type { CollisionGrid } from './PlayerSystem';

export const PET_MAX_HEARTS = 5;
export const PET_POINTS_PER_HEART = 200;
export const PET_MAX_FRIENDSHIP = PET_MAX_HEARTS * PET_POINTS_PER_HEART;

export const PET_PET_POINTS = 16;
export const PET_BOWL_POINTS = 24;
export const PET_TREAT_POINTS = 20;

export type PetBehaviorState = 'idle' | 'walk' | 'sleep' | 'follow';

export interface CompanionCatRuntime {
  breedId: CatBreedId;
  name: string;
  friendship: number; // 0..1000
  pettedToday: boolean;
  treatGivenToday: boolean;
  followPlayer: boolean;
  /** World pixel coordinates in the active scene */
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'left' | 'right';
  state: PetBehaviorState;
  stateTimer: number;
  animTimer: number;
  /** Optional morning lucky gift waiting to be collected when petted */
  pendingGiftItemId: string | null;
}

export interface PetOvernightReport {
  catCount: number;
  drankFromBowl: boolean;
  rainFilledBowl: boolean;
  gainedPointsPerCat: number;
  broughtGifts: { catName: string; itemId: string }[];
  maxHeartNames: string[];
}

/**
 * Manages the player's Companion Cats (supports adopting & keeping BOTH bespoke cats together!):
 * - Adopt either or both cats (Silver Tabby Maine Coon & Bicolor Round-Faced Tabby)
 * - Shared outdoor Pet Water Bowl beside the farmhouse (fill with watering can, rain auto-fills)
 * - Individual 5-heart friendship progression, daily petting, favorite treats & renaming
 * - Organic cat AI: roaming, curled-up napping (with Zzz), rainy/evening indoor fireplace lounging,
 *   and synchronized Follow Mode (a cute little cat parade behind the player!)
 * - 3+ heart morning Lucky Gift surprises
 */
export class PetSystem {
  cats: CompanionCatRuntime[] = [];
  bowlFilledToday = false;
  celebratingOnFarm = false;

  reset(): void {
    this.cats = [];
    this.bowlFilledToday = false;
    this.celebratingOnFarm = false;
  }

  welcomeBirthdayCats(): void {
    for (const breedId of CAT_BREED_IDS) {
      const cat = this.getCat(breedId) ?? this.adopt(breedId)!;
      cat.friendship = PET_MAX_FRIENDSHIP;
    }
    this.bowlFilledToday = true;
  }

  hasAnyCat(): boolean {
    return this.cats.length > 0;
  }

  hasBreed(breedId: CatBreedId): boolean {
    return this.cats.some((c) => c.breedId === breedId);
  }

  getCat(breedId: CatBreedId): CompanionCatRuntime | undefined {
    return this.cats.find((c) => c.breedId === breedId);
  }

  adopt(breedId: CatBreedId, customName?: string): CompanionCatRuntime | null {
    if (this.hasBreed(breedId)) return null;
    const def = getCatBreedDef(breedId);
    const trimmed = customName?.trim();
    const name = trimmed && trimmed.length > 0 ? trimmed.slice(0, 12) : def.defaultPetName;

    const index = this.cats.length;
    const home = this.getFarmHomePosition(index);
    const cat: CompanionCatRuntime = {
      breedId,
      name,
      friendship: 120, // Starts affectionate!
      pettedToday: false,
      treatGivenToday: false,
      followPlayer: false,
      x: home.x,
      y: home.y,
      targetX: home.x,
      targetY: home.y,
      facing: index % 2 === 0 ? 'right' : 'left',
      state: 'idle',
      stateTimer: 1.5 + index * 0.7,
      animTimer: index * 1.3,
      pendingGiftItemId: null,
    };
    this.cats.push(cat);
    return cat;
  }

  rename(breedId: CatBreedId, newName: string): boolean {
    const cat = this.getCat(breedId);
    if (!cat) return false;
    const trimmed = newName.trim();
    if (!trimmed) return false;
    cat.name = trimmed.slice(0, 12);
    return true;
  }

  toggleFollow(breedId: CatBreedId): boolean {
    const cat = this.getCat(breedId);
    if (!cat) return false;
    cat.followPlayer = !cat.followPlayer;
    if (cat.followPlayer) {
      cat.state = 'follow';
    } else {
      cat.state = 'idle';
      cat.stateTimer = 1.6;
    }
    return cat.followPlayer;
  }

  summonNear(breedId: CatBreedId, worldX: number, worldY: number): boolean {
    const cat = this.getCat(breedId);
    if (!cat) return false;
    const offset = breedId === 'cat_maine_silver' ? -14 : 14;
    cat.x = worldX + offset;
    cat.y = worldY + 5;
    cat.targetX = cat.x;
    cat.targetY = cat.y;
    cat.state = this.celebratingOnFarm || cat.followPlayer ? 'follow' : 'idle';
    cat.stateTimer = 2.0;
    return true;
  }

  getHearts(cat: CompanionCatRuntime): number {
    return Math.min(PET_MAX_HEARTS, Math.floor(cat.friendship / PET_POINTS_PER_HEART));
  }

  /**
   * Determines which scene the cats currently relax in:
   * - Rainy/stormy days or late evenings (>= 19:00): curled up warmly inside the farmhouse!
   * - Sunny/breezy daytime: playing outdoors on the farm!
   */
  getActiveScene(isRainy: boolean, timeMinutes: number): SceneId | null {
    if (this.cats.length === 0) return null;
    if (this.celebratingOnFarm) return 'farm';
    if (isRainy || timeMinutes >= 19 * 60) {
      return 'house';
    }
    return 'farm';
  }

  isInScene(sceneId: SceneId, isRainy: boolean, timeMinutes: number): boolean {
    return this.getActiveScene(isRainy, timeMinutes) === sceneId;
  }

  placeForScene(sceneId: SceneId): void {
    this.cats.forEach((cat, idx) => {
      if (sceneId === 'house') {
        const p = this.getHouseHomePosition(idx);
        cat.x = p.x;
        cat.y = p.y;
        cat.targetX = p.x;
        cat.targetY = p.y;
        cat.state = cat.followPlayer ? 'follow' : 'sleep';
        cat.stateTimer = 4.5 + idx * 1.5;
      } else if (sceneId === 'farm') {
        const p = this.getFarmHomePosition(idx);
        cat.x = p.x;
        cat.y = p.y;
        cat.targetX = p.x;
        cat.targetY = p.y;
        cat.state = cat.followPlayer ? 'follow' : 'idle';
        cat.stateTimer = 1.6 + idx * 0.8;
      }
    });
  }

  findNearbyCat(worldX: number, worldY: number, maxDist = 24): CompanionCatRuntime | null {
    let best: CompanionCatRuntime | null = null;
    let bestDist = maxDist;
    for (const cat of this.cats) {
      const d = Math.hypot(cat.x - worldX, cat.y - worldY);
      if (d <= bestDist) {
        best = cat;
        bestDist = d;
      }
    }
    return best;
  }

  petInteract(cat: CompanionCatRuntime): {
    pettedNow: boolean;
    gainedPoints: number;
    claimedGiftItemId: string | null;
    soundText: string;
    reachedNewHeart: boolean;
  } {
    const def = getCatBreedDef(cat.breedId);
    const prevHearts = this.getHearts(cat);

    let pettedNow = false;
    let gainedPoints = 0;
    if (!cat.pettedToday) {
      cat.pettedToday = true;
      cat.friendship = Math.min(PET_MAX_FRIENDSHIP, cat.friendship + PET_PET_POINTS);
      pettedNow = true;
      gainedPoints = PET_PET_POINTS;
    }

    if (cat.state === 'sleep') {
      cat.state = cat.followPlayer ? 'follow' : 'idle';
      cat.stateTimer = 2.4;
    }

    const claimedGiftItemId = cat.pendingGiftItemId;
    cat.pendingGiftItemId = null;

    return {
      pettedNow,
      gainedPoints,
      claimedGiftItemId,
      soundText: def.soundText,
      reachedNewHeart: this.getHearts(cat) > prevHearts,
    };
  }

  isFavoriteTreat(breedId: CatBreedId, itemId: string): boolean {
    return getCatBreedDef(breedId).favoriteTreatIds.includes(itemId);
  }

  giveTreat(
    breedId: CatBreedId,
    itemId: string
  ): {
    ok: boolean;
    reason?: string;
    gainedPoints: number;
    reachedNewHeart: boolean;
  } {
    const cat = this.getCat(breedId);
    if (!cat) {
      return { ok: false, reason: '还没有领养这只小猫咪哦', gainedPoints: 0, reachedNewHeart: false };
    }
    if (cat.treatGivenToday) {
      return {
        ok: false,
        reason: `${cat.name}今天已经吃过小零食啦，明天再喂吧！`,
        gainedPoints: 0,
        reachedNewHeart: false,
      };
    }
    if (!this.isFavoriteTreat(breedId, itemId)) {
      return {
        ok: false,
        reason: `${cat.name}闻了闻摇摇头，它更爱吃新鲜小鱼、烤鱼或鲜牛奶！`,
        gainedPoints: 0,
        reachedNewHeart: false,
      };
    }

    const prevHearts = this.getHearts(cat);
    cat.treatGivenToday = true;
    cat.friendship = Math.min(PET_MAX_FRIENDSHIP, cat.friendship + PET_TREAT_POINTS);
    if (cat.state === 'sleep') {
      cat.state = cat.followPlayer ? 'follow' : 'idle';
      cat.stateTimer = 2.5;
    }

    return {
      ok: true,
      gainedPoints: PET_TREAT_POINTS,
      reachedNewHeart: this.getHearts(cat) > prevHearts,
    };
  }

  fillWaterBowl(): boolean {
    if (this.bowlFilledToday) return false;
    this.bowlFilledToday = true;
    return true;
  }

  /**
   * Updates all cats' movement, follow-parade steering, roaming & napping AI.
   */
  update(
    dt: number,
    sceneId: 'farm' | 'house',
    playerX: number,
    playerY: number,
    collision: CollisionGrid,
    rng: () => number = Math.random
  ): void {
    this.cats.forEach((cat, idx) => {
      cat.animTimer += dt;

      if (cat.followPlayer || this.celebratingOnFarm) {
        // Offset each following cat slightly so both form an adorable pair!
        const followTargetX = playerX + (idx === 0 ? -12 : 12);
        const followTargetY = playerY + (idx === 0 ? 6 : 10);
        const dx = followTargetX - cat.x;
        const dy = followTargetY - cat.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 145) {
          cat.x = followTargetX;
          cat.y = followTargetY;
          cat.state = 'idle';
          return;
        }

        if (dist > 16) {
          cat.state = 'follow';
          const speed = dist > 56 ? 68 : 48;
          const stepX = (dx / dist) * Math.min(dist - 10, speed * dt);
          const stepY = (dy / dist) * Math.min(dist - 10, speed * dt);
          if (Math.abs(dx) > 1) cat.facing = dx < 0 ? 'left' : 'right';
          this.tryMove(cat, stepX, stepY, collision);
        } else {
          cat.state = 'idle';
        }
        return;
      }

      if (cat.state === 'idle' || cat.state === 'sleep') {
        cat.stateTimer -= dt;
        if (cat.stateTimer <= 0) {
          const roll = rng();
          if (cat.state === 'idle' && roll < (sceneId === 'house' ? 0.48 : 0.3)) {
            cat.state = 'sleep';
            cat.stateTimer = 4.5 + rng() * 4.5;
          } else {
            const home =
              sceneId === 'house'
                ? this.getHouseHomePosition(idx)
                : this.getFarmHomePosition(idx);
            const spreadX = sceneId === 'house' ? 2.8 : 5.2;
            const spreadY = sceneId === 'house' ? 2.0 : 3.2;
            const tx = home.x + (rng() - 0.5) * 2 * spreadX * TILE_SIZE;
            const ty = home.y + (rng() - 0.5) * 2 * spreadY * TILE_SIZE;
            const tileX = Math.floor(tx / TILE_SIZE);
            const tileY = Math.floor(ty / TILE_SIZE);
            if (!collision.isSolid(tileX, tileY)) {
              cat.targetX = tx;
              cat.targetY = ty;
              cat.state = 'walk';
              cat.stateTimer = 4.0;
            } else {
              cat.state = 'idle';
              cat.stateTimer = 1.4;
            }
          }
        }
        return;
      }

      // Autonomous walking
      const dx = cat.targetX - cat.x;
      const dy = cat.targetY - cat.y;
      const dist = Math.hypot(dx, dy);
      cat.stateTimer -= dt;

      if (dist <= 2 || cat.stateTimer <= 0) {
        cat.state = 'idle';
        cat.stateTimer = 1.8 + rng() * 2.4;
        return;
      }

      const speed = 26;
      if (Math.abs(dx) > 0.5) cat.facing = dx < 0 ? 'left' : 'right';
      const moved = this.tryMove(
        cat,
        (dx / dist) * Math.min(dist, speed * dt),
        (dy / dist) * Math.min(dist, speed * dt),
        collision
      );
      if (!moved) {
        cat.state = 'idle';
        cat.stateTimer = 1.2;
      }
    });
  }

  getSpriteKey(cat: CompanionCatRuntime): string {
    const base = `pet_${cat.breedId}`;
    if (cat.state === 'sleep') {
      return `${base}_sleep`;
    }
    if (cat.state === 'walk' || cat.state === 'follow') {
      const frame = Math.floor(cat.animTimer * 6) % 2;
      return `${base}_walk_${frame}`;
    }
    const frame = cat.animTimer % 3.8 >= 3.65 ? 1 : 0;
    return `${base}_idle_${frame}`;
  }

  advanceDay(newDayIsRainy: boolean, rng: () => number = Math.random): PetOvernightReport {
    const drankFromBowl = this.cats.length > 0 && this.bowlFilledToday;
    const broughtGifts: { catName: string; itemId: string }[] = [];
    const maxHeartNames: string[] = [];

    for (const cat of this.cats) {
      const prevHearts = this.getHearts(cat);
      if (drankFromBowl) {
        cat.friendship = Math.min(PET_MAX_FRIENDSHIP, cat.friendship + PET_BOWL_POINTS);
      }
      cat.pettedToday = false;
      cat.treatGivenToday = false;

      const hearts = this.getHearts(cat);
      if (prevHearts < PET_MAX_HEARTS && hearts === PET_MAX_HEARTS) {
        maxHeartNames.push(cat.name);
      }

      if (hearts >= 3 && !cat.pendingGiftItemId) {
        const chance = hearts >= 5 ? 0.55 : hearts >= 4 ? 0.4 : 0.25;
        if (rng() < chance) {
          const pool = getCatBreedDef(cat.breedId).luckyGiftPool;
          const giftId = pool[Math.floor(rng() * pool.length)] ?? pool[0];
          cat.pendingGiftItemId = giftId;
          broughtGifts.push({ catName: cat.name, itemId: giftId });
        }
      }
    }

    this.bowlFilledToday = newDayIsRainy;
    if (this.cats.length > 0) {
      this.placeForScene(newDayIsRainy ? 'house' : 'farm');
    }

    return {
      catCount: this.cats.length,
      drankFromBowl,
      rainFilledBowl: newDayIsRainy,
      gainedPointsPerCat: drankFromBowl ? PET_BOWL_POINTS : 0,
      broughtGifts,
      maxHeartNames,
    };
  }

  serialize(): SerializedPetState {
    return {
      bowlFilledToday: this.bowlFilledToday,
      celebratingOnFarm: this.celebratingOnFarm,
      cats: this.cats.map((c) => ({
        breedId: c.breedId,
        name: c.name,
        friendship: c.friendship,
        pettedToday: c.pettedToday,
        treatGivenToday: c.treatGivenToday,
        followPlayer: c.followPlayer,
        pendingGiftItemId: c.pendingGiftItemId,
      })),
    };
  }

  load(saved?: SerializedPetState | null): void {
    this.reset();
    if (!saved) return;
    this.bowlFilledToday = Boolean(saved.bowlFilledToday);
    if (!Array.isArray(saved.cats)) return;

    saved.cats.forEach((s, idx) => {
      if (!CAT_BREEDS[s.breedId] || this.hasBreed(s.breedId)) return;
      const home = this.getFarmHomePosition(idx);
      this.cats.push({
        breedId: s.breedId,
        name:
          typeof s.name === 'string' && s.name.trim()
            ? s.name.slice(0, 12)
            : CAT_BREEDS[s.breedId].defaultPetName,
        friendship: Math.max(0, Math.min(PET_MAX_FRIENDSHIP, Math.floor(s.friendship ?? 120))),
        pettedToday: Boolean(s.pettedToday),
        treatGivenToday: Boolean(s.treatGivenToday),
        followPlayer: Boolean(s.followPlayer),
        x: home.x,
        y: home.y,
        targetX: home.x,
        targetY: home.y,
        facing: idx % 2 === 0 ? 'right' : 'left',
        state: s.followPlayer ? 'follow' : 'idle',
        stateTimer: 1.5 + idx * 0.6,
        animTimer: idx * 1.1,
        pendingGiftItemId: s.pendingGiftItemId ?? null,
      });
    });
    this.celebratingOnFarm = saved.celebratingOnFarm === true && this.hasAnyCat();
  }

  private getFarmHomePosition(index: number): { x: number; y: number } {
    return {
      x: (FARM_LAYOUT.petBowl.x - 0.6 + index * 1.6) * TILE_SIZE,
      y: (FARM_LAYOUT.petBowl.y + 2.1 + (index % 2) * 0.4) * TILE_SIZE,
    };
  }

  private getHouseHomePosition(index: number): { x: number; y: number } {
    return {
      x: (6.2 + index * 1.8) * TILE_SIZE,
      y: (4.2 + (index % 2) * 0.5) * TILE_SIZE,
    };
  }

  private tryMove(
    cat: CompanionCatRuntime,
    dx: number,
    dy: number,
    collision: CollisionGrid
  ): boolean {
    let moved = false;
    const nextX = cat.x + dx;
    if (!collision.isSolid(Math.floor(nextX / TILE_SIZE), Math.floor(cat.y / TILE_SIZE))) {
      cat.x = nextX;
      moved = true;
    }
    const nextY = cat.y + dy;
    if (!collision.isSolid(Math.floor(cat.x / TILE_SIZE), Math.floor(nextY / TILE_SIZE))) {
      cat.y = nextY;
      moved = true;
    }
    return moved;
  }
}
