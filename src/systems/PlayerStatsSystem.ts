import type { UpgradeableToolKind } from '../data/items';
import { TOOL_TIERS } from '../data/mining';
import { COOKING_RECIPES } from '../data/recipes';
import type { FacingDir } from './PlayerSystem';

/**
 * Manages player stamina (energy), health (HP for mining combat),
 * Blacksmith tool upgrade tiers (Base -> Copper -> Iron -> Gold),
 * and unlocked Farmhouse Kitchen cooking recipes.
 */
export class PlayerStatsSystem {
  readonly maxEnergy = 100;
  readonly maxHp = 100;

  energy = 100;
  hp = 100;

  toolTiers: Record<UpgradeableToolKind, number> = {
    hoe: 0,
    watering_can: 0,
    axe: 0,
    pickaxe: 0,
  };

  unlockedRecipes = new Set<string>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.energy = this.maxEnergy;
    this.hp = this.maxHp;
    this.toolTiers = {
      hoe: 0,
      watering_can: 0,
      axe: 0,
      pickaxe: 0,
    };
    this.unlockedRecipes.clear();
    for (const r of COOKING_RECIPES) {
      if (r.starterUnlocked) this.unlockedRecipes.add(r.id);
    }
  }

  consumeEnergy(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.energy < amount) return false;
    this.energy = Math.max(0, this.energy - amount);
    return true;
  }

  restoreEnergy(amount: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + Math.max(0, amount));
  }

  takeDamage(amount: number): { fainted: boolean } {
    this.hp = Math.max(0, this.hp - Math.max(0, amount));
    return { fainted: this.hp <= 0 };
  }

  restoreHp(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
  }

  restOvernight(): void {
    this.energy = this.maxEnergy;
    this.hp = this.maxHp;
  }

  getToolTier(tool: UpgradeableToolKind): number {
    return this.toolTiers[tool] ?? 0;
  }

  getToolTierLabel(tool: UpgradeableToolKind): string {
    const tier = this.getToolTier(tool);
    return TOOL_TIERS[tier]?.prefix ?? '基础';
  }

  getWateringCanCapacity(): number {
    const tier = this.getToolTier('watering_can');
    return TOOL_TIERS[tier]?.waterCapacity ?? 20;
  }

  /** Tool power per swing for chopping trees / smashing rocks (1..4). */
  getToolPower(tool: 'axe' | 'pickaxe'): number {
    return 1 + this.getToolTier(tool);
  }

  upgradeTool(tool: UpgradeableToolKind): boolean {
    const cur = this.getToolTier(tool);
    if (cur >= TOOL_TIERS.length - 1) return false;
    this.toolTiers[tool] = cur + 1;
    return true;
  }

  /**
   * Computes affected tiles for Hoe / Watering Can based on upgrade tier:
   * - Tier 0: single target tile
   * - Tier 1 (Copper): 3 tiles straight ahead
   * - Tier 2 (Iron): 5 tiles straight ahead
   * - Tier 3 (Gold): 3x3 square centered on target tile
   */
  getToolAreaTiles(
    tool: 'hoe' | 'watering_can',
    tx: number,
    ty: number,
    facing: FacingDir
  ): { x: number; y: number }[] {
    const tier = this.getToolTier(tool);
    if (tier <= 0) return [{ x: tx, y: ty }];

    if (tier >= 3) {
      const out: { x: number; y: number }[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          out.push({ x: tx + dx, y: ty + dy });
        }
      }
      return out;
    }

    const len = tier === 1 ? 3 : 5;
    const stepX = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    const stepY = facing === 'up' ? -1 : facing === 'down' ? 1 : 0;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < len; i++) {
      out.push({ x: tx + stepX * i, y: ty + stepY * i });
    }
    return out;
  }

  unlockRecipe(recipeId: string): boolean {
    if (this.unlockedRecipes.has(recipeId)) return false;
    this.unlockedRecipes.add(recipeId);
    return true;
  }

  hasRecipe(recipeId: string): boolean {
    return this.unlockedRecipes.has(recipeId);
  }

  serialize(): {
    energy: number;
    hp: number;
    toolTiers: Record<UpgradeableToolKind, number>;
    unlockedRecipes: string[];
  } {
    return {
      energy: this.energy,
      hp: this.hp,
      toolTiers: { ...this.toolTiers },
      unlockedRecipes: Array.from(this.unlockedRecipes),
    };
  }

  load(data: {
    energy?: number;
    hp?: number;
    toolTiers?: Partial<Record<UpgradeableToolKind, number>>;
    unlockedRecipes?: string[];
  }): void {
    this.reset();
    if (typeof data.energy === 'number') {
      this.energy = Math.max(0, Math.min(this.maxEnergy, Math.floor(data.energy)));
    }
    if (typeof data.hp === 'number') {
      this.hp = Math.max(1, Math.min(this.maxHp, Math.floor(data.hp)));
    }
    if (data.toolTiers) {
      for (const k of ['hoe', 'watering_can', 'axe', 'pickaxe'] as const) {
        const val = data.toolTiers[k];
        if (typeof val === 'number') {
          this.toolTiers[k] = Math.max(0, Math.min(TOOL_TIERS.length - 1, Math.floor(val)));
        }
      }
    }
    if (Array.isArray(data.unlockedRecipes)) {
      for (const id of data.unlockedRecipes) {
        this.unlockedRecipes.add(id);
      }
    }
  }
}
