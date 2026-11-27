import { describe, expect, it } from 'vitest';
import sampleClearingRaw from '../../../public/maps/sample_clearing.tmj?raw';
import { ANIMAL_CATALOG } from '../../data/animals';
import {
  BOUQUET_CATALOG,
  BOUQUET_IDS,
  getBouquetDef,
  getBouquetPhotoUrl,
  getBouquetSpriteUrl,
} from '../../data/bouquets';
import { COLLECTION_GROUPS, COMMUNITY_BUNDLES } from '../../data/bundles';
import { CRAFTING_RECIPES } from '../../data/crafting';
import { CROP_REGISTRY } from '../../data/crops';
import { FISH_CATALOG } from '../../data/fish';
import { FURNITURE_CATALOG } from '../../data/furniture';
import { ITEM_CATALOG } from '../../data/items';
import { MINE_ROCK_DEFS, TOOL_TIERS } from '../../data/mining';
import { NPC_CATALOG } from '../../data/npcs';
import { CAT_BREEDS } from '../../data/pets';
import { COOKING_RECIPES } from '../../data/recipes';
import { STARTER_INVENTORY } from '../../data/worldConfig';
import { parseTiledMapJson, type TiledMapJson } from '../../engine/TiledMapLoader';

describe('Data Catalog Referential Integrity Audit', () => {
  it('ensures every crop seed/harvest item and fish item exists in ITEM_CATALOG', () => {
    for (const crop of Object.values(CROP_REGISTRY)) {
      expect(ITEM_CATALOG[crop.seedItemId], `Missing seed ${crop.seedItemId}`).toBeDefined();
      expect(ITEM_CATALOG[crop.harvestItemId], `Missing harvest ${crop.harvestItemId}`).toBeDefined();
    }
    for (const fish of FISH_CATALOG) {
      expect(ITEM_CATALOG[fish.itemId], `Missing fish ${fish.itemId}`).toBeDefined();
    }
  });

  it('ensures every crafting, cooking, tool upgrade, and animal item exists in ITEM_CATALOG', () => {
    for (const recipe of CRAFTING_RECIPES) {
      expect(ITEM_CATALOG[recipe.outputItemId]).toBeDefined();
      for (const ing of recipe.ingredients) {
        expect(ITEM_CATALOG[ing.itemId], `Missing crafting ingredient ${ing.itemId}`).toBeDefined();
      }
    }
    for (const cook of COOKING_RECIPES) {
      expect(ITEM_CATALOG[cook.outputItemId]).toBeDefined();
      for (const ing of cook.ingredients) {
        expect(ITEM_CATALOG[ing.itemId], `Missing cooking ingredient ${ing.itemId}`).toBeDefined();
      }
    }
    for (const tier of TOOL_TIERS) {
      if (tier.barItemId) {
        expect(ITEM_CATALOG[tier.barItemId]).toBeDefined();
      }
    }
    for (const animal of Object.values(ANIMAL_CATALOG)) {
      expect(ITEM_CATALOG[animal.produceItemId]).toBeDefined();
    }
    for (const cat of Object.values(CAT_BREEDS)) {
      for (const treatId of cat.favoriteTreatIds) {
        expect(ITEM_CATALOG[treatId], `Missing cat treat ${treatId}`).toBeDefined();
      }
      for (const giftId of cat.luckyGiftPool) {
        expect(ITEM_CATALOG[giftId], `Missing cat lucky gift ${giftId}`).toBeDefined();
      }
    }
    for (const rock of Object.values(MINE_ROCK_DEFS)) {
      expect(ITEM_CATALOG[rock.dropItemId]).toBeDefined();
    }
    for (const starter of STARTER_INVENTORY) {
      expect(ITEM_CATALOG[starter.itemId]).toBeDefined();
    }
  });

  it('ensures every bundle item, encyclopedia entry, and NPC gift/event reward is valid', () => {
    for (const bundle of COMMUNITY_BUNDLES) {
      for (const req of bundle.requiredItemIds) {
        expect(ITEM_CATALOG[req], `Missing bundle item ${req}`).toBeDefined();
      }
    }
    for (const group of COLLECTION_GROUPS) {
      for (const id of group.itemIds) {
        expect(ITEM_CATALOG[id], `Missing encyclopedia item ${id}`).toBeDefined();
      }
    }
    for (const npc of Object.values(NPC_CATALOG)) {
      for (const id of [...npc.lovedItemIds, ...npc.likedItemIds]) {
        expect(ITEM_CATALOG[id], `Missing NPC preference item ${id}`).toBeDefined();
      }
      for (const ev of npc.heartEvents) {
        if (ev.rewardType === 'furniture' && ev.rewardId) {
          expect(FURNITURE_CATALOG[ev.rewardId]).toBeDefined();
        }
        if (ev.rewardType === 'recipe' && ev.rewardId) {
          expect(COOKING_RECIPES.some((r) => r.id === ev.rewardId)).toBe(true);
        }
      }
    }
  });

  it('ensures all 16 farmhouse bouquets have valid catalog entries, florist SKUs, photo URLs, and legacy save compatibility', () => {
    expect(BOUQUET_IDS).toHaveLength(16);
    for (const id of BOUQUET_IDS) {
      const def = BOUQUET_CATALOG[id];
      expect(def, `Missing bouquet ${id}`).toBeDefined();
      expect(def.floristSku.trim().length).toBeGreaterThan(0);
      expect(getBouquetPhotoUrl(id)).toMatch(new RegExp(`assets/bouquets/${id}\\.jpg$`));
      expect(getBouquetSpriteUrl(id)).toMatch(new RegExp(`assets/bouquets/sprites/${id}\\.png$`));
    }
    expect(getBouquetDef('rose_red')?.id).toBe('rose_red_white');
    expect(getBouquetDef('rose_pink')?.id).toBe('rose_lychee_balloon');
    expect(getBouquetDef('hydrangea_blue')?.id).toBe('rose_ice_blue');
  });

  it('parses the bundled public/maps/sample_clearing.tmj Tiled map cleanly', () => {
    const raw = JSON.parse(sampleClearingRaw) as TiledMapJson;
    const parsed = parseTiledMapJson(raw);
    expect(parsed.cols).toBe(6);
    expect(parsed.rows).toBe(5);
    expect(parsed.collisionGrid[0][0]).toBe(true);
    expect(parsed.collisionGrid[2][2]).toBe(false);
    expect(parsed.objects[0]?.name).toBe('spawn_point');
  });
});
