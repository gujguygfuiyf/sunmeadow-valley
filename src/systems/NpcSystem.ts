import type { SeasonId } from '../data/crops';
import type { DialoguePayload } from '../data/events';
import {
  getNpcDef,
  NPC_IDS,
  type GiftReaction,
  type HeartEventDef,
  type NpcDefinition,
  type NpcWaypoint,
} from '../data/npcs';
import { TILE_SIZE } from '../data/worldConfig';
import type { SerializedNpcState } from '../engine/SaveManager';

export const MAX_HEARTS = 5;
export const POINTS_PER_HEART = 200;
export const MAX_FRIENDSHIP_POINTS = MAX_HEARTS * POINTS_PER_HEART;

export const TALK_BONUS_POINTS = 25;
export const FESTIVAL_TALK_BONUS = 45;
export const GIFT_POINTS: Record<GiftReaction, number> = {
  loved: 80,
  liked: 45,
  neutral: 20,
};

export interface NpcRuntime {
  id: string;
  x: number;
  y: number;
  waypointIndex: number;
  pauseTimer: number;
  walkTimer: number;
  isMoving: boolean;
  friendshipPoints: number;
  talkedToday: boolean;
  giftedToday: boolean;
  knownLovedIds: string[];
  seenHeartEvents: number[];
  dialogueIndex: number;
}

export interface TalkResult {
  dialogue: DialoguePayload;
  gainedPoints: number;
  triggeredHeartEvent?: HeartEventDef;
}

export interface GiftResult {
  ok: boolean;
  reaction?: GiftReaction;
  pointsAdded: number;
  dialogue: DialoguePayload | null;
}

/**
 * Manages Sunmeadow Town villagers:
 * - Time-of-day waypoint schedules (morning / afternoon / evening)
 * - Seasonal Festival celebration lines & bonus friendship
 * - 2-Heart and 4-Heart story events with unique recipe/furniture/gold rewards
 * - Daily chat & gift mechanics with serialization
 */
export class NpcSystem {
  private readonly npcs = new Map<string, NpcRuntime>();
  private readonly npcSpeed = 24;

  constructor() {
    this.resetAll();
  }

  resetAll(): void {
    this.npcs.clear();
    for (const id of NPC_IDS) {
      const def = getNpcDef(id);
      if (!def) continue;
      const start = def.schedules.morning[0] ?? { tileX: 10, tileY: 10, pauseSeconds: 3 };
      this.npcs.set(id, {
        id,
        x: (start.tileX + 0.5) * TILE_SIZE,
        y: (start.tileY + 0.5) * TILE_SIZE,
        waypointIndex: 0,
        pauseTimer: start.pauseSeconds * 0.5,
        walkTimer: 0,
        isMoving: false,
        friendshipPoints: 0,
        talkedToday: false,
        giftedToday: false,
        knownLovedIds: [],
        seenHeartEvents: [],
        dialogueIndex: 0,
      });
    }
  }

  getAll(): NpcRuntime[] {
    return Array.from(this.npcs.values());
  }

  get(id: string): NpcRuntime | undefined {
    return this.npcs.get(id);
  }

  getHearts(npc: NpcRuntime): number {
    return Math.min(MAX_HEARTS, Math.floor(npc.friendshipPoints / POINTS_PER_HEART));
  }

  getSpriteKey(npc: NpcRuntime): string {
    if (!npc.isMoving) return `npc_${npc.id}_0`;
    const step = Math.floor(npc.walkTimer) % 4;
    const frame = step === 1 ? 1 : step === 3 ? 2 : 0;
    return `npc_${npc.id}_${frame}`;
  }

  addBonusFriendship(npcId: string, points: number): number {
    const npc = this.npcs.get(npcId);
    if (!npc) return 0;
    return this.addFriendship(npc, points);
  }

  /** Smoothly moves villagers along their active time-of-day schedule. */
  update(dt: number, freezeNpcId: string | null = null, hour = 10): void {
    for (const npc of this.npcs.values()) {
      if (npc.id === freezeNpcId) {
        npc.isMoving = false;
        continue;
      }

      const def = getNpcDef(npc.id);
      if (!def) continue;
      const waypoints = this.getScheduleForHour(def, hour);
      if (waypoints.length <= 1) continue;

      if (npc.pauseTimer > 0) {
        npc.pauseTimer = Math.max(0, npc.pauseTimer - dt);
        npc.isMoving = false;
        continue;
      }

      const nextIndex = (npc.waypointIndex + 1) % waypoints.length;
      const target = waypoints[nextIndex];
      const tx = (target.tileX + 0.5) * TILE_SIZE;
      const ty = (target.tileY + 0.5) * TILE_SIZE;

      const dx = tx - npc.x;
      const dy = ty - npc.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 1.5) {
        npc.x = tx;
        npc.y = ty;
        npc.waypointIndex = nextIndex;
        npc.pauseTimer = target.pauseSeconds;
        npc.isMoving = false;
        npc.walkTimer = 0;
      } else {
        const step = Math.min(dist, this.npcSpeed * dt);
        npc.x += (dx / dist) * step;
        npc.y += (dy / dist) * step;
        npc.isMoving = true;
        npc.walkTimer += dt * 5.5;
      }
    }
  }

  findNearbyNpc(worldX: number, worldY: number, maxDistPx = 28): NpcRuntime | null {
    let best: NpcRuntime | null = null;
    let bestDist = maxDistPx;
    for (const npc of this.npcs.values()) {
      const d = Math.hypot(npc.x - worldX, npc.y - worldY);
      if (d <= bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  }

  findNpcAtWorldPoint(worldX: number, worldY: number): NpcRuntime | null {
    for (const npc of this.npcs.values()) {
      if (Math.abs(npc.x - worldX) <= 10 && worldY >= npc.y - 22 && worldY <= npc.y + 6) {
        return npc;
      }
    }
    return null;
  }

  /**
   * Talks to an NPC. Automatically triggers unseen 2-Heart / 4-Heart story events
   * or seasonal festival dialogues when applicable!
   */
  talk(
    npcId: string,
    context?: { seasonId?: SeasonId; isFestivalDay?: boolean }
  ): TalkResult | null {
    const npc = this.npcs.get(npcId);
    const def = getNpcDef(npcId);
    if (!npc || !def) return null;

    let gainedPoints = 0;
    if (!npc.talkedToday) {
      npc.talkedToday = true;
      const bonus = context?.isFestivalDay ? FESTIVAL_TALK_BONUS : TALK_BONUS_POINTS;
      gainedPoints = this.addFriendship(npc, bonus);
    }

    // Check for unseen Heart Event
    const hearts = this.getHearts(npc);
    const pendingEvent = def.heartEvents.find(
      (ev) => hearts >= ev.heartsRequired && !npc.seenHeartEvents.includes(ev.heartsRequired)
    );
    if (pendingEvent) {
      npc.seenHeartEvents.push(pendingEvent.heartsRequired);
      return {
        dialogue: {
          ...this.buildDialoguePayload(npc, def, pendingEvent.lines.join('\n\n')),
          heartEventTitle: pendingEvent.title,
          heartEventLines: pendingEvent.lines,
          heartEventRewardText: pendingEvent.rewardText,
        },
        gainedPoints,
        triggeredHeartEvent: pendingEvent,
      };
    }

    const line =
      context?.isFestivalDay && context.seasonId
        ? def.festivalDialogues[context.seasonId]
        : this.pickDialogueLine(npc, def);
    npc.dialogueIndex += 1;

    return {
      dialogue: this.buildDialoguePayload(npc, def, line),
      gainedPoints,
    };
  }

  receiveGift(npcId: string, itemId: string): GiftResult {
    const npc = this.npcs.get(npcId);
    const def = getNpcDef(npcId);
    if (!npc || !def) {
      return { ok: false, pointsAdded: 0, dialogue: null };
    }

    if (npc.giftedToday) {
      return {
        ok: false,
        pointsAdded: 0,
        dialogue: this.buildDialoguePayload(npc, def, def.dialogues.alreadyGifted),
      };
    }

    let reaction: GiftReaction = 'neutral';
    if (def.lovedItemIds.includes(itemId)) {
      reaction = 'loved';
      if (!npc.knownLovedIds.includes(itemId)) {
        npc.knownLovedIds.push(itemId);
      }
    } else if (def.likedItemIds.includes(itemId)) {
      reaction = 'liked';
    }

    npc.giftedToday = true;
    const pointsAdded = this.addFriendship(npc, GIFT_POINTS[reaction]);
    const text =
      reaction === 'loved'
        ? def.dialogues.giftLoved
        : reaction === 'liked'
          ? def.dialogues.giftLiked
          : def.dialogues.giftNeutral;

    return {
      ok: true,
      reaction,
      pointsAdded,
      dialogue: this.buildDialoguePayload(npc, def, text),
    };
  }

  resetDailyFlags(): void {
    for (const npc of this.npcs.values()) {
      npc.talkedToday = false;
      npc.giftedToday = false;
    }
  }

  serialize(): SerializedNpcState[] {
    return this.getAll().map((n) => ({
      id: n.id,
      friendshipPoints: n.friendshipPoints,
      talkedToday: n.talkedToday,
      giftedToday: n.giftedToday,
      knownLovedIds: [...n.knownLovedIds],
      seenHeartEvents: [...n.seenHeartEvents],
    }));
  }

  load(saved?: SerializedNpcState[]): void {
    this.resetAll();
    if (!Array.isArray(saved)) return;
    for (const entry of saved) {
      const npc = this.npcs.get(entry.id);
      if (!npc) continue;
      npc.friendshipPoints = Math.max(
        0,
        Math.min(MAX_FRIENDSHIP_POINTS, Math.floor(entry.friendshipPoints || 0))
      );
      npc.talkedToday = Boolean(entry.talkedToday);
      npc.giftedToday = Boolean(entry.giftedToday);
      npc.knownLovedIds = Array.isArray(entry.knownLovedIds) ? [...entry.knownLovedIds] : [];
      npc.seenHeartEvents = Array.isArray(entry.seenHeartEvents)
        ? [...entry.seenHeartEvents]
        : [];
    }
  }

  private getScheduleForHour(def: NpcDefinition, hour: number): NpcWaypoint[] {
    if (hour < 12) return def.schedules.morning;
    if (hour < 18) return def.schedules.afternoon;
    return def.schedules.evening;
  }

  private addFriendship(npc: NpcRuntime, delta: number): number {
    const before = npc.friendshipPoints;
    npc.friendshipPoints = Math.min(MAX_FRIENDSHIP_POINTS, npc.friendshipPoints + delta);
    return npc.friendshipPoints - before;
  }

  private pickDialogueLine(npc: NpcRuntime, def: NpcDefinition): string {
    const hearts = this.getHearts(npc);
    const pool =
      hearts >= 4
        ? def.dialogues.tier2
        : hearts >= 2
          ? def.dialogues.tier1
          : def.dialogues.tier0;
    return pool[npc.dialogueIndex % pool.length] ?? pool[0];
  }

  private buildDialoguePayload(
    npc: NpcRuntime,
    def: NpcDefinition,
    text: string
  ): DialoguePayload {
    return {
      npcId: npc.id,
      npcName: def.name,
      npcRole: def.role,
      portraitKey: def.portraitKey,
      hearts: this.getHearts(npc),
      maxHearts: MAX_HEARTS,
      friendshipPoints: npc.friendshipPoints,
      text,
      shopKind: def.shopKind,
      canGiftToday: !npc.giftedToday,
    };
  }
}
