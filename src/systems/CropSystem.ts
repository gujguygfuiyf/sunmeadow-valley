import { getCropDef, isCropInSeason, type CropDefinition, type SeasonId } from '../data/crops';
import type { SerializedCrop } from '../engine/SaveManager';

export interface PlantedCrop {
  x: number;
  y: number;
  cropId: string;
  daysGrown: number;
  harvestedOnce: boolean;
}

export interface HarvestResult {
  cropDef: CropDefinition;
  itemId: string;
  quantity: number;
  regrows: boolean;
}

export interface DailyGrowthReport {
  grownCount: number;
  readyCount: number;
  crowEatenCount: number;
  witheredCount: number;
}

/**
 * Pure gameplay system managing planted crops, seasonal validity, greenhouse immunity,
 * overnight watered growth, scarecrow crow-protection, and regrowable harvesting.
 */
export class CropSystem {
  private readonly crops = new Map<string, PlantedCrop>();

  static tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  getAt(x: number, y: number): PlantedCrop | undefined {
    return this.crops.get(CropSystem.tileKey(x, y));
  }

  getAll(): PlantedCrop[] {
    return Array.from(this.crops.values());
  }

  hasCropAt(x: number, y: number): boolean {
    return this.crops.has(CropSystem.tileKey(x, y));
  }

  /** Plants a crop on an empty tilled tile. Checks season unless tile is inside Greenhouse. */
  plant(
    x: number,
    y: number,
    cropId: string,
    currentSeason?: SeasonId,
    isGreenhouseTile = false
  ): { ok: boolean; reason?: string } {
    const def = getCropDef(cropId);
    if (!def) return { ok: false, reason: '未知种子类型' };
    const key = CropSystem.tileKey(x, y);
    if (this.crops.has(key)) return { ok: false, reason: '这块地已经种有作物啦' };

    if (currentSeason && !isGreenhouseTile && !isCropInSeason(cropId, currentSeason)) {
      return { ok: false, reason: `${def.name}无法在当前季节露天生长（解锁温室后可四季种植）` };
    }

    this.crops.set(key, {
      x,
      y,
      cropId,
      daysGrown: 0,
      harvestedOnce: false,
    });
    return { ok: true };
  }

  getStageIndex(crop: PlantedCrop): number {
    const def = getCropDef(crop.cropId);
    if (!def) return 0;
    if (this.isReadyToHarvest(crop)) {
      return def.stageCount - 1;
    }
    const ratio = crop.daysGrown / def.daysToGrow;
    const stage = Math.floor(ratio * (def.stageCount - 1));
    return Math.max(0, Math.min(def.stageCount - 2, stage));
  }

  isReadyToHarvest(crop: PlantedCrop): boolean {
    const def = getCropDef(crop.cropId);
    if (!def) return false;
    return crop.daysGrown >= def.daysToGrow;
  }

  /**
   * Advances overnight growth for watered crops, applies season rollover withering
   * (except Greenhouse tiles), and performs gentle nocturnal crow check when unprotected.
   */
  advanceDay(
    isTileWatered: (x: number, y: number) => boolean,
    options?: {
      newSeason?: SeasonId;
      seasonChanged?: boolean;
      isProtectedByScarecrow?: (x: number, y: number) => boolean;
      isGreenhouseTile?: (x: number, y: number) => boolean;
      rng?: () => number;
    }
  ): DailyGrowthReport {
    let grownCount = 0;
    let readyCount = 0;
    let crowEatenCount = 0;
    let witheredCount = 0;

    const rng = options?.rng ?? Math.random;
    const isProtected = options?.isProtectedByScarecrow ?? (() => true);
    const isGreenhouse = options?.isGreenhouseTile ?? (() => false);

    // 1. Season rollover: outdoor out-of-season crops wither
    if (options?.seasonChanged && options.newSeason) {
      for (const [key, crop] of Array.from(this.crops.entries())) {
        if (!isGreenhouse(crop.x, crop.y) && !isCropInSeason(crop.cropId, options.newSeason)) {
          this.crops.delete(key);
          witheredCount += 1;
        }
      }
    }

    // 2. Crow check: if more than 12 outdoor crops exist, max 1 unprotected crop may be pecked (18% chance)
    const unprotected = this.getAll().filter(
      (c) => !isGreenhouse(c.x, c.y) && !isProtected(c.x, c.y)
    );
    if (unprotected.length >= 12 && rng() < 0.18) {
      const victim = unprotected[Math.floor(rng() * unprotected.length)];
      if (victim) {
        this.crops.delete(CropSystem.tileKey(victim.x, victim.y));
        crowEatenCount = 1;
      }
    }

    // 3. Watered crops grow 1 day
    for (const crop of this.crops.values()) {
      const def = getCropDef(crop.cropId);
      if (!def) continue;

      if (crop.daysGrown < def.daysToGrow && isTileWatered(crop.x, crop.y)) {
        crop.daysGrown += 1;
        grownCount += 1;
      }

      if (crop.daysGrown >= def.daysToGrow) {
        readyCount += 1;
      }
    }

    return { grownCount, readyCount, crowEatenCount, witheredCount };
  }

  harvest(x: number, y: number, rng: () => number = Math.random): HarvestResult | null {
    const key = CropSystem.tileKey(x, y);
    const crop = this.crops.get(key);
    if (!crop) return null;

    const def = getCropDef(crop.cropId);
    if (!def || crop.daysGrown < def.daysToGrow) return null;

    const span = def.harvestMax - def.harvestMin + 1;
    const quantity = def.harvestMin + Math.floor(rng() * span);

    if (def.regrowDays && def.regrowDays > 0) {
      crop.daysGrown = Math.max(0, def.daysToGrow - def.regrowDays);
      crop.harvestedOnce = true;
      return {
        cropDef: def,
        itemId: def.harvestItemId,
        quantity,
        regrows: true,
      };
    }

    this.crops.delete(key);
    return {
      cropDef: def,
      itemId: def.harvestItemId,
      quantity,
      regrows: false,
    };
  }

  serialize(): SerializedCrop[] {
    return this.getAll().map((c) => ({ ...c }));
  }

  load(saved: SerializedCrop[]): void {
    this.crops.clear();
    for (const entry of saved) {
      if (getCropDef(entry.cropId)) {
        this.crops.set(CropSystem.tileKey(entry.x, entry.y), { ...entry });
      }
    }
  }

  clear(): void {
    this.crops.clear();
  }
}
