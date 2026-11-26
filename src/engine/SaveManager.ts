import type { AnimalKind, BuildingKind } from '../data/animals';
import type { SceneId } from '../data/events';
import type { WeatherKind } from '../data/fish';
import type { PlacedFurniture } from '../data/furniture';
import type { MachineKind, UpgradeableToolKind } from '../data/items';
import type { CatBreedId } from '../data/pets';

export const SAVE_SCHEMA_VERSION = 3;
const STORAGE_KEY_V3 = 'sunmeadow_valley_save_v3';
const STORAGE_KEY_V2 = 'sunmeadow_valley_save_v2';
const STORAGE_KEY_V1 = 'sunmeadow_valley_save_v1';

export interface SerializedSoilTile {
  x: number;
  y: number;
  tilled: boolean;
  watered: boolean;
}

export interface SerializedCrop {
  x: number;
  y: number;
  cropId: string;
  daysGrown: number;
  harvestedOnce: boolean;
}

export interface SerializedInventorySlot {
  itemId: string;
  quantity: number;
}

export interface SerializedShippingEntry {
  itemId: string;
  quantity: number;
}

export interface SerializedNpcState {
  id: string;
  friendshipPoints: number;
  talkedToday: boolean;
  giftedToday: boolean;
  knownLovedIds: string[];
  seenHeartEvents?: number[];
}

export interface SerializedMachine {
  uid: string;
  kind: MachineKind;
  x: number;
  y: number;
  processingOutputId?: string | null;
  processingOutputQty?: number;
  minutesRemaining?: number;
  chestSlots?: (SerializedInventorySlot | null)[];
}

export interface SerializedAnimal {
  uid: string;
  kind: AnimalKind;
  name: string;
  happiness: number;
  pettedToday: boolean;
  daysSinceProduce: number;
  hasProductReady: boolean;
}

export interface SerializedQuest {
  id: string;
  npcId: string;
  itemId: string;
  quantity: number;
  goldReward: number;
  accepted: boolean;
  completed: boolean;
  dayIssued: number;
}

export interface SerializedFarmNode {
  x: number;
  y: number;
  kind: 'tree' | 'rock' | 'weed';
  hp: number;
}

export interface SerializedCatEntry {
  breedId: CatBreedId;
  name: string;
  friendship: number;
  pettedToday: boolean;
  treatGivenToday: boolean;
  followPlayer: boolean;
  pendingGiftItemId?: string | null;
}

export interface SerializedPetState {
  bowlFilledToday: boolean;
  celebratingOnFarm?: boolean;
  cats: SerializedCatEntry[];
}

export interface GameSaveData {
  version: number;
  savedAt: string;
  currentSceneId?: SceneId;
  day: number;
  season: string;
  timeMinutes: number;
  gold: number;
  waterLevel: number;
  selectedSlot: number;
  playerX: number;
  playerY: number;
  soilTiles: SerializedSoilTile[];
  crops: SerializedCrop[];
  inventory: (SerializedInventorySlot | null)[];
  shippingBin: SerializedShippingEntry[];
  placedFurniture?: PlacedFurniture[];
  ownedFurniture?: Record<string, number>;
  npcs?: SerializedNpcState[];

  // Schema v3 fields
  todayWeather?: WeatherKind;
  tomorrowWeather?: WeatherKind;
  energy?: number;
  hp?: number;
  toolTiers?: Record<UpgradeableToolKind, number>;
  unlockedRecipes?: string[];
  farmNodes?: SerializedFarmNode[];
  machines?: SerializedMachine[];
  builtBuildings?: BuildingKind[];
  animals?: SerializedAnimal[];
  deepestMineFloor?: number;
  dailyQuest?: SerializedQuest | null;
  bundleDonated?: Record<string, string[]>;
  bundleCompleted?: string[];
  discoveredItems?: string[];
  unlockedGreenhouse?: boolean;
  unlockedFastTravel?: boolean;
  unlockedMineElevator?: boolean;
  pets?: SerializedPetState | null;
  birthdayGiftClaimed?: boolean;
  birthdayLetterRead?: boolean;
}

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Versioned game save manager supporting localStorage and seamless v1/v2 -> v3 migration.
 */
export class SaveManager {
  private readonly storage: StorageBackend | null;
  private readonly key: string;

  constructor(storage?: StorageBackend | null, key = STORAGE_KEY_V3) {
    this.key = key;
    if (storage !== undefined) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  save(data: GameSaveData): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(): GameSaveData | null {
    if (!this.storage) return null;
    try {
      const raw =
        this.storage.getItem(this.key) ??
        this.storage.getItem(STORAGE_KEY_V2) ??
        this.storage.getItem(STORAGE_KEY_V1);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<GameSaveData>;
      if (
        parsed.version !== SAVE_SCHEMA_VERSION &&
        parsed.version !== 2 &&
        parsed.version !== 1
      ) {
        return null;
      }
      if (typeof parsed.day !== 'number' || !Array.isArray(parsed.inventory)) return null;
      return {
        ...(parsed as GameSaveData),
        version: SAVE_SCHEMA_VERSION,
      };
    } catch {
      return null;
    }
  }

  clear(): void {
    this.storage?.removeItem(this.key);
    this.storage?.removeItem(STORAGE_KEY_V2);
    this.storage?.removeItem(STORAGE_KEY_V1);
  }
}
