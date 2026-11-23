import { getCropDef } from '../data/crops';
import { getItemDef, type MachineKind } from '../data/items';
import { CHEST_SIZE } from '../data/worldConfig';
import type { SerializedInventorySlot, SerializedMachine } from '../engine/SaveManager';
import type { InventorySystem } from './InventorySystem';

export interface PlacedMachine {
  uid: string;
  kind: MachineKind;
  x: number;
  y: number;
  processingOutputId: string | null;
  processingOutputQty: number;
  minutesRemaining: number;
  chestSlots?: (SerializedInventorySlot | null)[];
}

export interface MachineInteractResult {
  action: 'open_chest' | 'collected' | 'started' | 'info' | 'none';
  message: string;
  collectedItemId?: string;
  collectedQty?: number;
}

/**
 * Manages all placeable farm machines:
 * - Sprinklers & Quality Sprinklers (auto-water adjacent crops every dawn)
 * - Scarecrows (5-tile radius crow defense)
 * - 24-slot Storage Chests
 * - Artisan Processors: Preserves Jar, Keg, Seed Maker, Mayo Maker, Cheese Press, Furnace
 */
export class MachineSystem {
  private readonly machines = new Map<string, PlacedMachine>();
  private uidSeq = 1;

  static key(x: number, y: number): string {
    return `${x},${y}`;
  }

  getAll(): PlacedMachine[] {
    return Array.from(this.machines.values());
  }

  getAt(x: number, y: number): PlacedMachine | undefined {
    return this.machines.get(MachineSystem.key(x, y));
  }

  getByUid(uid: string): PlacedMachine | undefined {
    for (const m of this.machines.values()) {
      if (m.uid === uid) return m;
    }
    return undefined;
  }

  isSolidAt(x: number, y: number): boolean {
    const m = this.getAt(x, y);
    if (!m) return false;
    return m.kind !== 'path';
  }

  place(kind: MachineKind, x: number, y: number): PlacedMachine | null {
    const key = MachineSystem.key(x, y);
    if (this.machines.has(key)) return null;

    const entry: PlacedMachine = {
      uid: `m_${Date.now()}_${this.uidSeq++}`,
      kind,
      x,
      y,
      processingOutputId: null,
      processingOutputQty: 0,
      minutesRemaining: 0,
      chestSlots:
        kind === 'chest'
          ? Array.from({ length: CHEST_SIZE }, () => null)
          : undefined,
    };
    this.machines.set(key, entry);
    return entry;
  }

  removeAt(x: number, y: number): PlacedMachine | null {
    const key = MachineSystem.key(x, y);
    const m = this.machines.get(key);
    if (!m) return null;
    // Don't pick up a chest that still holds items
    if (m.kind === 'chest' && m.chestSlots?.some((s) => s !== null)) {
      return null;
    }
    this.machines.delete(key);
    return m;
  }

  /** Checks whether tile (tx, ty) is protected by any placed Scarecrow within radius 5. */
  isProtectedByScarecrow(tx: number, ty: number): boolean {
    for (const m of this.machines.values()) {
      if (m.kind !== 'scarecrow') continue;
      if (Math.hypot(m.x - tx, m.y - ty) <= 5.2) return true;
    }
    return false;
  }

  /** Runs all placed sprinklers at morning dawn, returning count of watered tiles. */
  runMorningSprinklers(waterTile: (x: number, y: number) => boolean): number {
    let count = 0;
    for (const m of this.machines.values()) {
      if (m.kind === 'sprinkler') {
        const dirs = [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ];
        for (const [dx, dy] of dirs) {
          if (waterTile(m.x + dx, m.y + dy)) count += 1;
        }
      } else if (m.kind === 'quality_sprinkler') {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (waterTile(m.x + dx, m.y + dy)) count += 1;
          }
        }
      }
    }
    return count;
  }

  /** Advances active processing machines by elapsed in-game minutes. */
  advanceMinutes(minutes: number): void {
    for (const m of this.machines.values()) {
      if (m.processingOutputId && m.minutesRemaining > 0) {
        m.minutesRemaining = Math.max(0, m.minutesRemaining - minutes);
      }
    }
  }

  /** Completes overnight processing on all active artisan machines. */
  advanceOvernight(): void {
    this.advanceMinutes(600);
  }

  isOutputReady(m: PlacedMachine): boolean {
    return Boolean(m.processingOutputId) && m.minutesRemaining <= 0;
  }

  /** Handles player interacting with a placed machine using their currently held item. */
  interact(
    machine: PlacedMachine,
    inventory: InventorySystem,
    rng: () => number = Math.random
  ): MachineInteractResult {
    if (machine.kind === 'chest') {
      return { action: 'open_chest', message: '打开木质储物箱' };
    }
    if (machine.kind === 'scarecrow') {
      return { action: 'info', message: '稻草人正在守护周围 5 格内的农作物！' };
    }
    if (machine.kind === 'sprinkler' || machine.kind === 'quality_sprinkler') {
      return {
        action: 'info',
        message:
          machine.kind === 'sprinkler'
            ? '普通洒水器：每天清晨自动浇灌上下左右 4 格耕地'
            : '优质洒水器：每天清晨自动浇灌周围 3×3 共 8 格耕地',
      };
    }

    // 1. Collect finished artisan product
    if (this.isOutputReady(machine) && machine.processingOutputId) {
      const outId = machine.processingOutputId;
      const qty = Math.max(1, machine.processingOutputQty);
      if (!inventory.canAddItem(outId, qty)) {
        return { action: 'info', message: '背包已满，无法取出成品！' };
      }
      inventory.addItem(outId, qty);
      const outName = getItemDef(outId)?.name ?? outId;
      machine.processingOutputId = null;
      machine.processingOutputQty = 0;
      machine.minutesRemaining = 0;
      return {
        action: 'collected',
        message: `收获了 ${outName} ×${qty}！`,
        collectedItemId: outId,
        collectedQty: qty,
      };
    }

    // 2. Still processing
    if (machine.processingOutputId && machine.minutesRemaining > 0) {
      return {
        action: 'info',
        message: `机器加工中（还剩约 ${Math.ceil(machine.minutesRemaining / 60)} 小时，睡觉也可直接完成）`,
      };
    }

    // 3. Load held item into idle machine
    const held = inventory.getSelectedItemDef();
    if (!held) {
      return { action: 'info', message: this.getIdleHint(machine.kind) };
    }

    if (machine.kind === 'preserves_jar' && held.category === 'crop') {
      inventory.removeFromSlot(inventory.selectedSlot, 1);
      machine.processingOutputId = 'art_jam';
      machine.processingOutputQty = 1;
      machine.minutesRemaining = 120;
      return { action: 'started', message: `已放入 ${held.name}，正在熬制手工果酱！` };
    }

    if (machine.kind === 'keg' && held.category === 'crop') {
      inventory.removeFromSlot(inventory.selectedSlot, 1);
      machine.processingOutputId = 'art_wine';
      machine.processingOutputQty = 1;
      machine.minutesRemaining = 180;
      return { action: 'started', message: `已放入 ${held.name}，正在发酵陈酿果酒！` };
    }

    if (machine.kind === 'seed_maker' && held.category === 'crop') {
      const cropId = held.id.replace(/^crop_/, '');
      const cropDef = getCropDef(cropId);
      if (cropDef) {
        inventory.removeFromSlot(inventory.selectedSlot, 1);
        machine.processingOutputId = cropDef.seedItemId;
        machine.processingOutputQty = 2 + (rng() < 0.45 ? 1 : 0);
        machine.minutesRemaining = 30;
        return { action: 'started', message: `种子机运转中，即将提取 ${cropDef.name}种子！` };
      }
    }

    if (machine.kind === 'mayo_maker' && held.id === 'prod_egg') {
      inventory.removeFromSlot(inventory.selectedSlot, 1);
      machine.processingOutputId = 'art_mayo';
      machine.processingOutputQty = 1;
      machine.minutesRemaining = 90;
      return { action: 'started', message: '蛋黄酱机开始搅拌新鲜鸡蛋！' };
    }

    if (machine.kind === 'cheese_press' && held.id === 'prod_milk') {
      inventory.removeFromSlot(inventory.selectedSlot, 1);
      machine.processingOutputId = 'art_cheese';
      machine.processingOutputQty = 1;
      machine.minutesRemaining = 90;
      return { action: 'started', message: '奶酪压制机开始发酵醇香鲜奶！' };
    }

    if (machine.kind === 'furnace') {
      const smeltMap: Record<string, string> = {
        ore_copper: 'bar_copper',
        ore_iron: 'bar_iron',
        ore_gold: 'bar_gold',
      };
      const barId = smeltMap[held.id];
      if (barId) {
        if (inventory.getItemCount(held.id) < 3) {
          return { action: 'info', message: `熔炼需要 3 份 ${held.name}！` };
        }
        inventory.removeItem(held.id, 3);
        machine.processingOutputId = barId;
        machine.processingOutputQty = 1;
        machine.minutesRemaining = 60;
        const barName = getItemDef(barId)?.name ?? '金属锭';
        return { action: 'started', message: `熔炉点火！正在熔炼 ${barName}！` };
      }
    }

    return { action: 'info', message: this.getIdleHint(machine.kind) };
  }

  /** Transfers a stack between player inventory and a placed Storage Chest. */
  transferBetweenChestAndInventory(
    chest: PlacedMachine,
    from: 'chest' | 'inventory',
    slotIndex: number,
    inventory: InventorySystem
  ): boolean {
    if (chest.kind !== 'chest' || !chest.chestSlots) return false;

    if (from === 'inventory') {
      const slot = inventory.slots[slotIndex];
      if (!slot) return false;
      const def = getItemDef(slot.itemId);
      if (!def) return false;
      // Stack into existing chest slot
      if (def.stackable) {
        for (const cs of chest.chestSlots) {
          if (cs && cs.itemId === slot.itemId && cs.quantity < def.maxStack) {
            const room = def.maxStack - cs.quantity;
            const move = Math.min(room, slot.quantity);
            cs.quantity += move;
            slot.quantity -= move;
            if (slot.quantity <= 0) {
              inventory.slots[slotIndex] = null;
              return true;
            }
          }
        }
      }
      const emptyIdx = chest.chestSlots.findIndex((s) => s === null);
      if (emptyIdx === -1) return false;
      chest.chestSlots[emptyIdx] = { ...slot };
      inventory.slots[slotIndex] = null;
      return true;
    }

    // From chest -> player inventory
    const cs = chest.chestSlots[slotIndex];
    if (!cs) return false;
    if (!inventory.canAddItem(cs.itemId, cs.quantity)) return false;
    inventory.addItem(cs.itemId, cs.quantity);
    chest.chestSlots[slotIndex] = null;
    return true;
  }

  serialize(): SerializedMachine[] {
    return this.getAll().map((m) => ({
      uid: m.uid,
      kind: m.kind,
      x: m.x,
      y: m.y,
      processingOutputId: m.processingOutputId,
      processingOutputQty: m.processingOutputQty,
      minutesRemaining: m.minutesRemaining,
      chestSlots: m.chestSlots ? m.chestSlots.map((s) => (s ? { ...s } : null)) : undefined,
    }));
  }

  load(saved?: SerializedMachine[]): void {
    this.machines.clear();
    if (!Array.isArray(saved)) return;
    for (const s of saved) {
      const entry: PlacedMachine = {
        uid: s.uid,
        kind: s.kind,
        x: s.x,
        y: s.y,
        processingOutputId: s.processingOutputId ?? null,
        processingOutputQty: s.processingOutputQty ?? 0,
        minutesRemaining: s.minutesRemaining ?? 0,
        chestSlots:
          s.kind === 'chest'
            ? Array.from({ length: CHEST_SIZE }, (_, i) => {
                const slot = s.chestSlots?.[i];
                return slot && getItemDef(slot.itemId) ? { ...slot } : null;
              })
            : undefined,
      };
      this.machines.set(MachineSystem.key(entry.x, entry.y), entry);
    }
  }

  clear(): void {
    this.machines.clear();
  }

  private getIdleHint(kind: MachineKind): string {
    switch (kind) {
      case 'preserves_jar':
        return '腌菜果酱桶：手持任意收获作物点击放入，酿制手工果酱';
      case 'keg':
        return '橡木酿酒桶：手持任意收获作物点击放入，酿制陈酿果酒';
      case 'seed_maker':
        return '种子制造机：手持任意收获作物点击放入，提取 2-3 包同款种子';
      case 'mayo_maker':
        return '蛋黄酱机：手持【新鲜鸡蛋】点击放入加工';
      case 'cheese_press':
        return '奶酪压制机：手持【醇香鲜奶】点击放入加工';
      case 'furnace':
        return '石砌熔炉：手持 3 份【铜/铁/金矿石】点击放入熔炼成金属锭';
      default:
        return '机器已就绪';
    }
  }
}
