import {
  ANIMAL_CATALOG,
  ANIMAL_DEFAULT_NAMES,
  FARM_BUILDINGS,
  type AnimalKind,
  type BuildingKind,
} from '../data/animals';
import { FARM_LAYOUT, TILE_SIZE } from '../data/worldConfig';
import type { SerializedAnimal } from '../engine/SaveManager';

export interface FarmAnimalRuntime {
  uid: string;
  kind: AnimalKind;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  pauseTimer: number;
  happiness: number; // 0..100
  pettedToday: boolean;
  daysSinceProduce: number;
  hasProductReady: boolean;
}

/**
 * Manages Farm Livestock Buildings (Coop, Barn), adorable pasture animals
 * (Chicken, Cow, Sheep), daily petting, wandering AI, and Egg/Milk/Wool production.
 */
export class LivestockSystem {
  builtBuildings = new Set<BuildingKind>();
  animals: FarmAnimalRuntime[] = [];
  private uidSeq = 1;

  reset(): void {
    this.builtBuildings.clear();
    this.animals = [];
    this.uidSeq = 1;
  }

  hasBuilding(kind: BuildingKind): boolean {
    return this.builtBuildings.has(kind);
  }

  build(kind: BuildingKind): boolean {
    if (this.builtBuildings.has(kind)) return false;
    this.builtBuildings.add(kind);
    return true;
  }

  getBuildingAnimalCount(building: BuildingKind): number {
    return this.animals.filter(
      (a) => ANIMAL_CATALOG[a.kind].buildingRequired === building
    ).length;
  }

  canAdopt(kind: AnimalKind): { ok: boolean; reason?: string } {
    const def = ANIMAL_CATALOG[kind];
    if (!this.hasBuilding(def.buildingRequired)) {
      const bName = FARM_BUILDINGS[def.buildingRequired].name;
      return { ok: false, reason: `请先在罗宾木工坊建造【${bName}】！` };
    }
    const bDef = FARM_BUILDINGS[def.buildingRequired];
    if (this.getBuildingAnimalCount(def.buildingRequired) >= bDef.capacity) {
      return { ok: false, reason: `${bDef.name}已满员（最多 ${bDef.capacity} 只）` };
    }
    return { ok: true };
  }

  adopt(kind: AnimalKind): FarmAnimalRuntime | null {
    if (!this.canAdopt(kind).ok) return null;
    const names = ANIMAL_DEFAULT_NAMES[kind];
    const existingOfKind = this.animals.filter((a) => a.kind === kind).length;
    const name = names[existingOfKind % names.length];

    const home = this.getPastureAnchor(kind);
    const x = (home.x + (Math.random() - 0.5) * 2.5) * TILE_SIZE;
    const y = (home.y + Math.random() * 1.6) * TILE_SIZE;

    const animal: FarmAnimalRuntime = {
      uid: `ani_${Date.now()}_${this.uidSeq++}`,
      kind,
      name,
      x,
      y,
      targetX: x,
      targetY: y,
      pauseTimer: 1.5,
      happiness: 65,
      pettedToday: false,
      daysSinceProduce: 0,
      hasProductReady: false,
    };
    this.animals.push(animal);
    return animal;
  }

  update(dt: number): void {
    for (const animal of this.animals) {
      if (animal.pauseTimer > 0) {
        animal.pauseTimer -= dt;
        if (animal.pauseTimer <= 0) {
          const anchor = this.getPastureAnchor(animal.kind);
          animal.targetX = (anchor.x + (Math.random() - 0.5) * 3.6) * TILE_SIZE;
          animal.targetY = (anchor.y + (Math.random() - 0.5) * 2.2) * TILE_SIZE;
        }
        continue;
      }

      const dx = animal.targetX - animal.x;
      const dy = animal.targetY - animal.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1.2) {
        animal.pauseTimer = 2.0 + Math.random() * 2.5;
      } else {
        const speed = 15;
        animal.x += (dx / dist) * Math.min(dist, speed * dt);
        animal.y += (dy / dist) * Math.min(dist, speed * dt);
      }
    }
  }

  findNearbyAnimal(worldX: number, worldY: number, maxDist = 24): FarmAnimalRuntime | null {
    let best: FarmAnimalRuntime | null = null;
    let bestDist = maxDist;
    for (const a of this.animals) {
      const d = Math.hypot(a.x - worldX, a.y - worldY);
      if (d <= bestDist) {
        best = a;
        bestDist = d;
      }
    }
    return best;
  }

  /**
   * Interacting with an animal pets it (boosting happiness) and collects any ready Egg/Milk/Wool!
   */
  interact(animal: FarmAnimalRuntime): {
    pettedNow: boolean;
    collectedItemId: string | null;
    soundText: string;
  } {
    const def = ANIMAL_CATALOG[animal.kind];
    let pettedNow = false;
    if (!animal.pettedToday) {
      animal.pettedToday = true;
      animal.happiness = Math.min(100, animal.happiness + 18);
      pettedNow = true;
    }

    let collectedItemId: string | null = null;
    if (animal.hasProductReady) {
      animal.hasProductReady = false;
      collectedItemId = def.produceItemId;
    }

    return {
      pettedNow,
      collectedItemId,
      soundText: def.soundText,
    };
  }

  /** Overnight update: happy animals produce Eggs, Milk, or Wool! Returns count ready. */
  advanceDay(): number {
    let newlyProduced = 0;
    for (const animal of this.animals) {
      const def = ANIMAL_CATALOG[animal.kind];
      if (!animal.pettedToday) {
        animal.happiness = Math.max(20, animal.happiness - 4);
      }
      animal.pettedToday = false;
      animal.daysSinceProduce += 1;

      if (!animal.hasProductReady && animal.daysSinceProduce >= def.produceIntervalDays) {
        animal.hasProductReady = true;
        animal.daysSinceProduce = 0;
        newlyProduced += 1;
      }
    }
    return newlyProduced;
  }

  serialize(): { built: BuildingKind[]; animals: SerializedAnimal[] } {
    return {
      built: Array.from(this.builtBuildings),
      animals: this.animals.map((a) => ({
        uid: a.uid,
        kind: a.kind,
        name: a.name,
        happiness: a.happiness,
        pettedToday: a.pettedToday,
        daysSinceProduce: a.daysSinceProduce,
        hasProductReady: a.hasProductReady,
      })),
    };
  }

  load(built?: BuildingKind[], savedAnimals?: SerializedAnimal[]): void {
    this.reset();
    if (Array.isArray(built)) {
      for (const b of built) {
        if (FARM_BUILDINGS[b]) this.builtBuildings.add(b);
      }
    }
    if (Array.isArray(savedAnimals)) {
      for (const s of savedAnimals) {
        if (!ANIMAL_CATALOG[s.kind]) continue;
        const anchor = this.getPastureAnchor(s.kind);
        const x = (anchor.x + (Math.random() - 0.5) * 2) * TILE_SIZE;
        const y = (anchor.y + Math.random() * 1.2) * TILE_SIZE;
        this.animals.push({
          ...s,
          x,
          y,
          targetX: x,
          targetY: y,
          pauseTimer: 1.5,
        });
      }
    }
  }

  private getPastureAnchor(kind: AnimalKind): { x: number; y: number } {
    if (kind === 'chicken') {
      return {
        x: FARM_LAYOUT.coopPad.x + 1.5,
        y: FARM_LAYOUT.coopPad.y + FARM_LAYOUT.coopPad.h + 0.8,
      };
    }
    return {
      x: FARM_LAYOUT.barnPad.x + 1.8,
      y: FARM_LAYOUT.barnPad.y + FARM_LAYOUT.barnPad.h + 0.8,
    };
  }
}
