import type { SeasonId } from '../data/crops';
import { getItemDef } from '../data/items';
import { getNpcDef } from '../data/npcs';
import type { SerializedQuest } from '../engine/SaveManager';

export interface DailyQuest extends SerializedQuest {}

const QUEST_POOL_BY_SEASON: Record<
  SeasonId,
  { npcId: string; itemId: string; qty: number }[]
> = {
  spring: [
    { npcId: 'emily', itemId: 'crop_tulip', qty: 1 },
    { npcId: 'pierre', itemId: 'crop_parsnip', qty: 2 },
    { npcId: 'robin', itemId: 'res_wood', qty: 10 },
    { npcId: 'clint', itemId: 'ore_copper', qty: 4 },
    { npcId: 'emily', itemId: 'fish_carp', qty: 1 },
  ],
  summer: [
    { npcId: 'emily', itemId: 'crop_blueberry', qty: 2 },
    { npcId: 'pierre', itemId: 'crop_melon', qty: 1 },
    { npcId: 'robin', itemId: 'res_stone', qty: 10 },
    { npcId: 'clint', itemId: 'ore_iron', qty: 3 },
    { npcId: 'pierre', itemId: 'fish_sunfish', qty: 1 },
  ],
  fall: [
    { npcId: 'pierre', itemId: 'crop_pumpkin', qty: 1 },
    { npcId: 'emily', itemId: 'crop_cranberry', qty: 2 },
    { npcId: 'robin', itemId: 'res_wood', qty: 12 },
    { npcId: 'clint', itemId: 'gem_amethyst', qty: 1 },
    { npcId: 'robin', itemId: 'fish_trout', qty: 1 },
  ],
  winter: [
    { npcId: 'pierre', itemId: 'crop_snow_yam', qty: 2 },
    { npcId: 'clint', itemId: 'ore_gold', qty: 2 },
    { npcId: 'emily', itemId: 'prod_wool', qty: 1 },
    { npcId: 'robin', itemId: 'res_stone', qty: 12 },
  ],
};

/**
 * Daily Town Notice Board Help-Wanted commission system.
 */
export class QuestSystem {
  currentQuest: DailyQuest | null = null;

  constructor() {
    this.rollDailyQuest(1, 'spring');
  }

  rollDailyQuest(day: number, season: SeasonId, rng: () => number = Math.random): DailyQuest {
    const pool = QUEST_POOL_BY_SEASON[season] ?? QUEST_POOL_BY_SEASON.spring;
    const pick = pool[Math.floor(rng() * pool.length)] ?? pool[0];
    const itemDef = getItemDef(pick.itemId);
    const baseValue = (itemDef?.sellPrice ?? 30) * pick.qty;
    const goldReward = Math.max(90, Math.round(baseValue * 2.3));

    this.currentQuest = {
      id: `q_${season}_${day}_${pick.npcId}`,
      npcId: pick.npcId,
      itemId: pick.itemId,
      quantity: pick.qty,
      goldReward,
      accepted: false,
      completed: false,
      dayIssued: day,
    };
    return this.currentQuest;
  }

  acceptCurrent(): boolean {
    if (!this.currentQuest || this.currentQuest.accepted || this.currentQuest.completed) {
      return false;
    }
    this.currentQuest.accepted = true;
    return true;
  }

  completeCurrent(): { goldReward: number; npcId: string; friendshipBonus: number } | null {
    if (!this.currentQuest || this.currentQuest.completed) return null;
    this.currentQuest.accepted = true;
    this.currentQuest.completed = true;
    return {
      goldReward: this.currentQuest.goldReward,
      npcId: this.currentQuest.npcId,
      friendshipBonus: 120,
    };
  }

  getQuestDescription(q: DailyQuest): string {
    const npcName = getNpcDef(q.npcId)?.name ?? '村民';
    const itemName = getItemDef(q.itemId)?.name ?? q.itemId;
    return `${npcName}急需【${itemName} ×${q.quantity}】，帮忙送来必有重谢！`;
  }

  serialize(): SerializedQuest | null {
    return this.currentQuest ? { ...this.currentQuest } : null;
  }

  load(saved?: SerializedQuest | null): void {
    if (saved && getItemDef(saved.itemId) && getNpcDef(saved.npcId)) {
      this.currentQuest = { ...saved };
    } else {
      this.rollDailyQuest(1, 'spring');
    }
  }
}
