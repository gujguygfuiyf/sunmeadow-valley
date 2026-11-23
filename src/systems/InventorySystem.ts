import type { ShippingSummaryLine } from '../data/events';
import { getItemDef, type ItemDefinition } from '../data/items';
import {
  BACKPACK_SIZE,
  HOTBAR_SIZE,
  MAX_WATER_LEVEL,
  STARTER_INVENTORY,
  STARTING_GOLD,
} from '../data/worldConfig';
import type {
  SerializedInventorySlot,
  SerializedShippingEntry,
} from '../engine/SaveManager';

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

/**
 * 36-slot Backpack + 9-slot Hotbar (slots 0..8), gold wallet,
 * upgradeable watering can tank, crafting ingredient helpers, and shipping bin.
 */
export class InventorySystem {
  readonly slots: (InventorySlot | null)[];
  readonly hotbarSize = HOTBAR_SIZE;
  selectedSlot = 0;
  gold = STARTING_GOLD;
  waterLevel = MAX_WATER_LEVEL;
  maxWaterLevel = MAX_WATER_LEVEL;

  private readonly shippingQueue = new Map<string, number>();

  constructor(size = BACKPACK_SIZE) {
    this.slots = Array.from({ length: size }, () => null);
    this.resetToStarter();
  }

  resetToStarter(): void {
    this.slots.fill(null);
    this.selectedSlot = 0;
    this.gold = STARTING_GOLD;
    this.maxWaterLevel = MAX_WATER_LEVEL;
    this.waterLevel = this.maxWaterLevel;
    this.shippingQueue.clear();

    for (const starter of STARTER_INVENTORY) {
      this.addItem(starter.itemId, starter.quantity);
    }
  }

  setMaxWaterLevel(cap: number): void {
    this.maxWaterLevel = Math.max(MAX_WATER_LEVEL, cap);
    this.waterLevel = Math.min(this.maxWaterLevel, this.waterLevel);
  }

  selectSlot(index: number): void {
    const len = this.hotbarSize;
    this.selectedSlot = ((index % len) + len) % len;
  }

  cycleSlot(delta: number): void {
    this.selectSlot(this.selectedSlot + delta);
  }

  getSelectedSlot(): InventorySlot | null {
    return this.slots[this.selectedSlot] ?? null;
  }

  getSelectedItemDef(): ItemDefinition | null {
    const slot = this.getSelectedSlot();
    if (!slot) return null;
    return getItemDef(slot.itemId) ?? null;
  }

  swapSlots(indexA: number, indexB: number): boolean {
    if (
      indexA < 0 ||
      indexB < 0 ||
      indexA >= this.slots.length ||
      indexB >= this.slots.length ||
      indexA === indexB
    ) {
      return false;
    }
    const a = this.slots[indexA];
    const b = this.slots[indexB];

    // Merge stacks if same stackable item
    if (a && b && a.itemId === b.itemId) {
      const def = getItemDef(a.itemId);
      if (def?.stackable) {
        const room = def.maxStack - b.quantity;
        if (room > 0) {
          const move = Math.min(room, a.quantity);
          b.quantity += move;
          a.quantity -= move;
          if (a.quantity <= 0) this.slots[indexA] = null;
          return true;
        }
      }
    }

    this.slots[indexA] = b;
    this.slots[indexB] = a;
    return true;
  }

  /** Organizes backpack slots by category (tools first, then seeds, crops, resources, food, machines). */
  sortBackpack(): void {
    const order: Record<string, number> = {
      tool: 0,
      seed: 1,
      crop: 2,
      food: 3,
      artisan: 4,
      animal_product: 5,
      fish: 6,
      mineral: 7,
      resource: 8,
      machine: 9,
    };
    // Keep hotbar row (0..8) intact, sort backpack storage (9..35) cleanly
    const storage = this.slots.slice(this.hotbarSize).filter((s): s is InventorySlot => s !== null);
    storage.sort((a, b) => {
      const da = getItemDef(a.itemId);
      const db = getItemDef(b.itemId);
      const ca = order[da?.category ?? 'resource'] ?? 99;
      const cb = order[db?.category ?? 'resource'] ?? 99;
      if (ca !== cb) return ca - cb;
      return a.itemId.localeCompare(b.itemId);
    });
    for (let i = this.hotbarSize; i < this.slots.length; i++) {
      this.slots[i] = storage[i - this.hotbarSize] ?? null;
    }
  }

  canAddItem(itemId: string, quantity = 1): boolean {
    const def = getItemDef(itemId);
    if (!def || quantity <= 0) return false;
    let remaining = quantity;
    if (def.stackable) {
      for (const slot of this.slots) {
        if (slot && slot.itemId === itemId && slot.quantity < def.maxStack) {
          remaining -= Math.min(def.maxStack - slot.quantity, remaining);
          if (remaining <= 0) return true;
        }
      }
    }
    for (const slot of this.slots) {
      if (slot === null) {
        remaining -= def.stackable ? Math.min(def.maxStack, remaining) : 1;
        if (remaining <= 0) return true;
      }
    }
    return false;
  }

  addItem(itemId: string, quantity = 1): boolean {
    const def = getItemDef(itemId);
    if (!def || quantity <= 0) return false;

    let remaining = quantity;

    if (def.stackable) {
      for (const slot of this.slots) {
        if (slot && slot.itemId === itemId && slot.quantity < def.maxStack) {
          const room = def.maxStack - slot.quantity;
          const add = Math.min(room, remaining);
          slot.quantity += add;
          remaining -= add;
          if (remaining === 0) return true;
        }
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) {
        const add = def.stackable ? Math.min(def.maxStack, remaining) : 1;
        this.slots[i] = { itemId, quantity: add };
        remaining -= add;
        if (remaining === 0) return true;
      }
    }

    return remaining < quantity;
  }

  removeFromSlot(slotIndex: number, quantity = 1): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || slot.quantity < quantity) return false;
    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      this.slots[slotIndex] = null;
    }
    return true;
  }

  removeItem(itemId: string, quantity = 1): boolean {
    if (this.getItemCount(itemId) < quantity) return false;

    let remaining = quantity;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        const take = Math.min(slot.quantity, remaining);
        slot.quantity -= take;
        remaining -= take;
        if (slot.quantity <= 0) {
          this.slots[i] = null;
        }
      }
    }
    return true;
  }

  getItemCount(itemId: string): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.itemId === itemId) total += slot.quantity;
    }
    return total;
  }

  hasIngredients(ingredients: { itemId: string; quantity: number }[]): boolean {
    return ingredients.every((ing) => this.getItemCount(ing.itemId) >= ing.quantity);
  }

  consumeIngredients(ingredients: { itemId: string; quantity: number }[]): boolean {
    if (!this.hasIngredients(ingredients)) return false;
    for (const ing of ingredients) {
      this.removeItem(ing.itemId, ing.quantity);
    }
    return true;
  }

  consumeWater(amount = 1): boolean {
    if (this.waterLevel < amount) return false;
    this.waterLevel -= amount;
    return true;
  }

  refillWater(): void {
    this.waterLevel = this.maxWaterLevel;
  }

  buyItem(itemId: string, quantity = 1): { ok: boolean; reason?: string; cost: number } {
    const def = getItemDef(itemId);
    if (!def || def.buyPrice === undefined) {
      return { ok: false, reason: '该商品暂不可购买', cost: 0 };
    }
    const cost = def.buyPrice * quantity;
    if (this.gold < cost) {
      return { ok: false, reason: '金币不足！', cost };
    }

    if (!this.canAddItem(itemId, quantity)) {
      return { ok: false, reason: '背包已满，请先整理或存入储物箱！', cost };
    }

    this.addItem(itemId, quantity);
    this.gold -= cost;
    return { ok: true, cost };
  }

  sellItemDirect(itemId: string, quantity = 1): { ok: boolean; earned: number } {
    const def = getItemDef(itemId);
    if (!def || def.sellPrice === undefined) return { ok: false, earned: 0 };
    if (!this.removeItem(itemId, quantity)) return { ok: false, earned: 0 };
    const earned = def.sellPrice * quantity;
    this.gold += earned;
    return { ok: true, earned };
  }

  shipSelectedSlot(quantity = 1): { ok: boolean; itemId?: string; itemName?: string; expectedGold?: number } {
    const slot = this.getSelectedSlot();
    if (!slot) return { ok: false };
    const def = getItemDef(slot.itemId);
    if (!def || def.sellPrice === undefined) return { ok: false };

    const take = Math.min(quantity, slot.quantity);
    if (!this.removeFromSlot(this.selectedSlot, take)) return { ok: false };

    const prev = this.shippingQueue.get(def.id) ?? 0;
    this.shippingQueue.set(def.id, prev + take);
    return {
      ok: true,
      itemId: def.id,
      itemName: def.name,
      expectedGold: def.sellPrice * take,
    };
  }

  settleShippingBin(): { lines: ShippingSummaryLine[]; totalGold: number } {
    const lines: ShippingSummaryLine[] = [];
    let totalGold = 0;

    for (const [itemId, quantity] of this.shippingQueue.entries()) {
      const def = getItemDef(itemId);
      if (!def || def.sellPrice === undefined || quantity <= 0) continue;
      const subtotal = def.sellPrice * quantity;
      totalGold += subtotal;
      lines.push({
        itemId,
        itemName: def.name,
        quantity,
        unitPrice: def.sellPrice,
        subtotal,
      });
    }

    this.shippingQueue.clear();
    this.gold += totalGold;
    return { lines, totalGold };
  }

  getSellableInventoryItems(): { def: ItemDefinition; quantity: number }[] {
    const counts = new Map<string, number>();
    for (const slot of this.slots) {
      if (!slot) continue;
      const def = getItemDef(slot.itemId);
      if (def && def.sellPrice !== undefined && def.category !== 'resource') {
        counts.set(def.id, (counts.get(def.id) ?? 0) + slot.quantity);
      }
    }
    const list: { def: ItemDefinition; quantity: number }[] = [];
    for (const [id, quantity] of counts.entries()) {
      const def = getItemDef(id);
      if (def) list.push({ def, quantity });
    }
    return list;
  }

  getGiftableInventoryItems(): { def: ItemDefinition; quantity: number }[] {
    const counts = new Map<string, number>();
    for (const slot of this.slots) {
      if (!slot) continue;
      const def = getItemDef(slot.itemId);
      if (def && def.giftable) {
        counts.set(def.id, (counts.get(def.id) ?? 0) + slot.quantity);
      }
    }
    const list: { def: ItemDefinition; quantity: number }[] = [];
    for (const [id, quantity] of counts.entries()) {
      const def = getItemDef(id);
      if (def) list.push({ def, quantity });
    }
    return list;
  }

  serialize(): {
    slots: (SerializedInventorySlot | null)[];
    gold: number;
    waterLevel: number;
    selectedSlot: number;
    shippingBin: SerializedShippingEntry[];
  } {
    const shippingBin: SerializedShippingEntry[] = [];
    for (const [itemId, quantity] of this.shippingQueue.entries()) {
      shippingBin.push({ itemId, quantity });
    }
    return {
      slots: this.slots.map((s) => (s ? { ...s } : null)),
      gold: this.gold,
      waterLevel: this.waterLevel,
      selectedSlot: this.selectedSlot,
      shippingBin,
    };
  }

  load(data: {
    slots: (SerializedInventorySlot | null)[];
    gold: number;
    waterLevel: number;
    selectedSlot: number;
    shippingBin?: SerializedShippingEntry[];
  }): void {
    this.slots.fill(null);
    for (let i = 0; i < this.slots.length; i++) {
      const s = data.slots[i];
      if (s && getItemDef(s.itemId) && s.quantity > 0) {
        this.slots[i] = { itemId: s.itemId, quantity: s.quantity };
      }
    }

    // Migrate v1/v2 saves that didn't have the new axe/pickaxe/scythe/fishing rod/sword
    for (const essential of [
      'tool_axe',
      'tool_pickaxe',
      'tool_scythe',
      'tool_fishing_rod',
      'tool_sword',
    ]) {
      if (this.getItemCount(essential) === 0) {
        this.addItem(essential, 1);
      }
    }

    this.gold = Math.max(0, Math.floor(data.gold));
    this.waterLevel = Math.max(0, Math.min(this.maxWaterLevel, Math.floor(data.waterLevel)));
    this.selectSlot(data.selectedSlot);

    this.shippingQueue.clear();
    if (Array.isArray(data.shippingBin)) {
      for (const entry of data.shippingBin) {
        if (getItemDef(entry.itemId) && entry.quantity > 0) {
          this.shippingQueue.set(entry.itemId, entry.quantity);
        }
      }
    }
  }
}
