import type { SeasonId } from './crops';
import type { WeatherKind } from './fish';

export interface ShippingSummaryLine {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DaySummaryPayload {
  completedDay: number;
  newDay: number;
  season: string;
  seasonId: SeasonId;
  todayWeather: WeatherKind;
  lines: ShippingSummaryLine[];
  totalGold: number;
  cropsGrownCount: number;
  cropsReadyCount: number;
  crowEatenCount: number;
  witheredCount: number;
  sprinklerWateredCount: number;
  rainAutoWatered: boolean;
  animalProductsCount: number;
  petBowlDrank: boolean;
  petGiftLines: string[];
  petMaxHeartNames: string[];
  festivalToday: string | null;
}

export interface TileInspectPayload {
  title: string;
  statusLabel: string;
  statusKind: 'dry' | 'watered' | 'ready';
  progressPercent: number;
  metaText: string;
}

export type SceneId = 'farm' | 'house' | 'town' | 'mine';

export interface DialoguePayload {
  npcId: string;
  npcName: string;
  npcRole: string;
  portraitKey: string;
  hearts: number;
  maxHearts: number;
  friendshipPoints: number;
  text: string;
  shopKind?: 'seeds' | 'furniture' | 'blacksmith';
  canGiftToday: boolean;
  heartEventTitle?: string;
  heartEventLines?: string[];
  heartEventRewardText?: string;
}

export interface TvBroadcastPayload {
  tomorrowWeatherLabel: string;
  tomorrowWeatherDesc: string;
  farmingTip: string;
  festivalNote: string | null;
}

export type GameEvents = {
  'inventory:changed': void;
  'gold:changed': { gold: number; delta: number };
  'stats:changed': { energy: number; maxEnergy: number; hp: number; maxHp: number };
  'time:changed': {
    day: number;
    season: string;
    seasonId: SeasonId;
    minutes: number;
    festivalName: string | null;
  };
  'weather:changed': { today: WeatherKind; tomorrow: WeatherKind; label: string };
  'scene:changed': { sceneId: SceneId; label: string };
  'house:decorateChanged': { active: boolean; selectedFurnitureId: string | null };
  'npc:changed': void;
  'quests:changed': void;
  'bundles:changed': void;
  'livestock:changed': void;
  'pet:changed': void;
  'mine:changed': { floor: number; deepestFloor: number; slimesRemaining: number };
  'fishing:stateChanged': { active: boolean };
  'chest:open': { machineUid: string };
  'tv:open': TvBroadcastPayload;
  'dialogue:open': DialoguePayload;
  'day:summary': DaySummaryPayload;
  'toast:show': { message: string };
  'context:changed': { prompt: string | null };
  'inspector:changed': TileInspectPayload | null;
  'ui:openShop': void;
  'ui:openFurnitureShop': void;
  'ui:openBlacksmith': void;
  'ui:openVillagers': void;
  'ui:openBackpack': void;
  'ui:openCrafting': void;
  'ui:openCooking': void;
  'ui:openQuests': void;
  'ui:openBundles': void;
  'ui:openMap': void;
  'ui:openPets': void;
  'ui:openHelp': void;
};
