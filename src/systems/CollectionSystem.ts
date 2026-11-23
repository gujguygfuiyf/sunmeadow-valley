import {
  COLLECTION_GROUPS,
  COMMUNITY_BUNDLES,
  type BundleDefinition,
  type BundleRewardKind,
} from '../data/bundles';

export interface BundleDonateResult {
  ok: boolean;
  reason?: string;
  bundleCompleted?: BundleDefinition;
  rewardKind?: BundleRewardKind;
}

/**
 * Tracks Community Center Bundle donations, permanent valley unlocks
 * (Greenhouse, Minecart Fast Travel, Quality Sprinklers, Mine Elevator),
 * and the player's full Collection Encyclopedia progress.
 */
export class CollectionSystem {
  donatedByBundle = new Map<string, Set<string>>();
  completedBundles = new Set<string>();
  discoveredItems = new Set<string>();

  unlockedGreenhouse = false;
  unlockedFastTravel = false;
  unlockedMineElevator = false;

  reset(): void {
    this.donatedByBundle.clear();
    this.completedBundles.clear();
    this.discoveredItems.clear();
    this.unlockedGreenhouse = false;
    this.unlockedFastTravel = false;
    this.unlockedMineElevator = false;
  }

  recordDiscovery(itemId: string): boolean {
    if (this.discoveredItems.has(itemId)) return false;
    this.discoveredItems.add(itemId);
    return true;
  }

  isDiscovered(itemId: string): boolean {
    return this.discoveredItems.has(itemId);
  }

  getEncyclopediaStats(): { discovered: number; total: number; percent: number } {
    const allIds = COLLECTION_GROUPS.flatMap((g) => g.itemIds);
    const total = allIds.length;
    const discovered = allIds.filter((id) => this.discoveredItems.has(id)).length;
    return {
      discovered,
      total,
      percent: total > 0 ? Math.round((discovered / total) * 100) : 0,
    };
  }

  hasDonated(bundleId: string, itemId: string): boolean {
    return this.donatedByBundle.get(bundleId)?.has(itemId) ?? false;
  }

  isBundleCompleted(bundleId: string): boolean {
    return this.completedBundles.has(bundleId);
  }

  donate(bundleId: string, itemId: string): BundleDonateResult {
    const bundle = COMMUNITY_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return { ok: false, reason: '未找到该收集包' };
    if (!bundle.requiredItemIds.includes(itemId)) {
      return { ok: false, reason: '该收集包不需要这个物品' };
    }
    if (this.completedBundles.has(bundleId)) {
      return { ok: false, reason: '该收集包已经全部献祭完成啦' };
    }

    let donated = this.donatedByBundle.get(bundleId);
    if (!donated) {
      donated = new Set();
      this.donatedByBundle.set(bundleId, donated);
    }
    if (donated.has(itemId)) {
      return { ok: false, reason: '已经献祭过这个物品啦' };
    }

    donated.add(itemId);
    this.recordDiscovery(itemId);

    const allDone = bundle.requiredItemIds.every((req) => donated!.has(req));
    if (allDone) {
      this.completedBundles.add(bundleId);
      if (bundle.rewardKind === 'unlock_greenhouse') this.unlockedGreenhouse = true;
      if (bundle.rewardKind === 'unlock_fast_travel') this.unlockedFastTravel = true;
      if (bundle.rewardKind === 'unlock_mine_elevator') this.unlockedMineElevator = true;
      return {
        ok: true,
        bundleCompleted: bundle,
        rewardKind: bundle.rewardKind,
      };
    }

    return { ok: true };
  }

  serialize(): {
    bundleDonated: Record<string, string[]>;
    bundleCompleted: string[];
    discoveredItems: string[];
    unlockedGreenhouse: boolean;
    unlockedFastTravel: boolean;
    unlockedMineElevator: boolean;
  } {
    const bundleDonated: Record<string, string[]> = {};
    for (const [id, set] of this.donatedByBundle.entries()) {
      bundleDonated[id] = Array.from(set);
    }
    return {
      bundleDonated,
      bundleCompleted: Array.from(this.completedBundles),
      discoveredItems: Array.from(this.discoveredItems),
      unlockedGreenhouse: this.unlockedGreenhouse,
      unlockedFastTravel: this.unlockedFastTravel,
      unlockedMineElevator: this.unlockedMineElevator,
    };
  }

  load(data: {
    bundleDonated?: Record<string, string[]>;
    bundleCompleted?: string[];
    discoveredItems?: string[];
    unlockedGreenhouse?: boolean;
    unlockedFastTravel?: boolean;
    unlockedMineElevator?: boolean;
  }): void {
    this.reset();
    if (data.bundleDonated && typeof data.bundleDonated === 'object') {
      for (const [id, arr] of Object.entries(data.bundleDonated)) {
        if (Array.isArray(arr)) {
          this.donatedByBundle.set(id, new Set(arr));
        }
      }
    }
    if (Array.isArray(data.bundleCompleted)) {
      for (const id of data.bundleCompleted) this.completedBundles.add(id);
    }
    if (Array.isArray(data.discoveredItems)) {
      for (const id of data.discoveredItems) this.discoveredItems.add(id);
    }
    this.unlockedGreenhouse = Boolean(
      data.unlockedGreenhouse || this.completedBundles.has('bundle_crops')
    );
    this.unlockedFastTravel = Boolean(
      data.unlockedFastTravel || this.completedBundles.has('bundle_artisan')
    );
    this.unlockedMineElevator = Boolean(
      data.unlockedMineElevator || this.completedBundles.has('bundle_mining')
    );
  }
}
