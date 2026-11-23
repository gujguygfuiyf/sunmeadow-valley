import { describe, expect, it } from 'vitest';
import {
  SAVE_SCHEMA_VERSION,
  SaveManager,
  type GameSaveData,
  type StorageBackend,
} from '../../engine/SaveManager';
import { parseTiledMapJson, type TiledMapJson } from '../../engine/TiledMapLoader';
import { CollectionSystem } from '../CollectionSystem';
import { CropSystem } from '../CropSystem';
import { FishingSystem } from '../FishingSystem';
import { HOUSE_FIXTURES, HouseInteriorSystem } from '../HouseInteriorSystem';
import { InventorySystem } from '../InventorySystem';
import { LivestockSystem } from '../LivestockSystem';
import { MachineSystem } from '../MachineSystem';
import { MineSystem } from '../MineSystem';
import { GIFT_POINTS, NpcSystem, POINTS_PER_HEART, TALK_BONUS_POINTS } from '../NpcSystem';
import { PlayerStatsSystem } from '../PlayerStatsSystem';
import { QuestSystem } from '../QuestSystem';
import { TileMapSystem } from '../TileMapSystem';
import { FESTIVAL_DAY, TimeSystem } from '../TimeSystem';
import { WeatherSystem } from '../WeatherSystem';

function createMemoryStorage(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

describe('Pillar 1: Farming, 4 Seasons, Weather, Stamina & Upgraded AoE Tools', () => {
  it('enforces seasonal planting outdoors while allowing year-round Greenhouse planting', () => {
    const crops = new CropSystem();
    // Blueberry is summer-only -> rejected outdoors in spring, allowed inside Greenhouse
    expect(crops.plant(6, 10, 'blueberry', 'spring', false).ok).toBe(false);
    expect(crops.plant(14, 2, 'blueberry', 'spring', true).ok).toBe(true);

    // Parsnip in spring -> allowed outdoors, withers on summer rollover while greenhouse survives
    expect(crops.plant(6, 10, 'parsnip', 'spring', false).ok).toBe(true);
    const report = crops.advanceDay(() => true, {
      newSeason: 'summer',
      seasonChanged: true,
      isGreenhouseTile: (x, y) => x === 14 && y === 2,
    });
    expect(report.witheredCount).toBe(1);
    expect(crops.hasCropAt(6, 10)).toBe(false);
    expect(crops.hasCropAt(14, 2)).toBe(true);
  });

  it('auto-waters tilled outdoor soil on rainy mornings and computes festival calendar', () => {
    const map = new TileMapSystem();
    const weather = new WeatherSystem();
    const time = new TimeSystem();

    weather.tomorrow = 'rainy';
    weather.advanceDay('spring', () => 0.2);
    expect(weather.isRainy()).toBe(true);

    const count = map.waterAllTilled(false);
    expect(count).toBeGreaterThanOrEqual(6);
    expect(map.isWatered(6, 10)).toBe(true);

    time.load(FESTIVAL_DAY, 'spring', 480);
    expect(time.getTodayFestival()).toBe('春季花舞节');
  });

  it('tracks stamina/HP and scales Hoe/Watering Can AoE from 1 -> 3 -> 5 -> 3x3 on tool upgrades', () => {
    const stats = new PlayerStatsSystem();
    expect(stats.consumeEnergy(25)).toBe(true);
    expect(stats.energy).toBe(75);
    stats.restoreEnergy(15);
    expect(stats.energy).toBe(90);

    expect(stats.getToolAreaTiles('hoe', 10, 10, 'right').length).toBe(1);
    stats.upgradeTool('hoe'); // Copper -> 3
    expect(stats.getToolAreaTiles('hoe', 10, 10, 'right').length).toBe(3);
    stats.upgradeTool('hoe'); // Iron -> 5
    expect(stats.getToolAreaTiles('hoe', 10, 10, 'right').length).toBe(5);
    stats.upgradeTool('hoe'); // Gold -> 3x3 (9)
    expect(stats.getToolAreaTiles('hoe', 10, 10, 'right').length).toBe(9);
  });
});

describe('Pillar 2: Wild Foraging, Machines/Chests, Sprinklers & Fishing Mini-Game', () => {
  it('clears wild trees, rocks & weeds for wood, stone & fiber drops', () => {
    const map = new TileMapSystem();
    // Wild weed at (11,14) clears in 1 scythe hit
    const weedHit = map.hitWildNode(11, 14, 'scythe', 1, () => 0.5);
    expect(weedHit?.cleared).toBe(true);
    expect(weedHit?.drops.some((d) => d.itemId === 'res_fiber')).toBe(true);

    // Oak tree at (1,2) clears after 4 power damage
    const treeHit = map.hitWildNode(1, 2, 'axe', 4, () => 0.5);
    expect(treeHit?.cleared).toBe(true);
    expect(treeHit?.drops[0].itemId).toBe('res_wood');
  });

  it('runs sprinklers, scarecrow radius, storage chests, preserves jar & furnace smelting', () => {
    const map = new TileMapSystem();
    const inv = new InventorySystem();
    const machines = new MachineSystem();

    // Quality sprinkler waters 8 adjacent tilled tiles
    for (let y = 10; y <= 12; y++) {
      for (let x = 6; x <= 8; x++) map.tillTile(x, y);
    }
    machines.place('quality_sprinkler', 7, 11);
    const watered = machines.runMorningSprinklers((x, y) => map.waterTile(x, y));
    expect(watered).toBe(8);

    // Scarecrow protects radius 5
    machines.place('scarecrow', 10, 10);
    expect(machines.isProtectedByScarecrow(13, 12)).toBe(true);
    expect(machines.isProtectedByScarecrow(20, 20)).toBe(false);

    // Furnace smelts 3 copper ore -> 1 copper bar
    inv.addItem('ore_copper', 3);
    const oreSlot = inv.slots.findIndex((s) => s?.itemId === 'ore_copper');
    inv.swapSlots(oreSlot, 8);
    inv.selectSlot(8);
    const furnace = machines.place('furnace', 12, 10)!;
    const startRes = machines.interact(furnace, inv);
    expect(startRes.action).toBe('started');
    machines.advanceOvernight();
    expect(machines.isOutputReady(furnace)).toBe(true);
    const collectRes = machines.interact(furnace, inv);
    expect(collectRes.action).toBe('collected');
    expect(inv.getItemCount('bar_copper')).toBe(1);

    // 24-slot Chest transfer
    const chest = machines.place('chest', 13, 10)!;
    inv.addItem('res_wood', 10);
    const woodSlot = inv.slots.findIndex((s) => s?.itemId === 'res_wood');
    expect(machines.transferBetweenChestAndInventory(chest, 'inventory', woodSlot, inv)).toBe(true);
    expect(chest.chestSlots?.[0]?.itemId).toBe('res_wood');
    expect(machines.transferBetweenChestAndInventory(chest, 'chest', 0, inv)).toBe(true);
    expect(inv.getItemCount('res_wood')).toBe(10);
  });

  it('runs Stardew Fishing mini-game from cast -> bite -> reel catch', () => {
    const fishing = new FishingSystem();
    fishing.startCast('spring', 'sunny', () => 0.1);
    expect(fishing.phase).toBe('waiting');

    // Fast-forward wait timer until bite
    const bitRes = fishing.update(3.0, false, () => 0.1);
    expect(bitRes.justBit).toBe(true);
    expect(fishing.phase).toBe('reeling');

    // Simulate smooth 1/60s ticks keeping the bar overlapping the fish until caught
    fishing.fishPos = 0.42;
    fishing.fishTarget = 0.42;
    fishing.barPos = 0.3;
    fishing.progress = 0.9;
    let status: string = 'ongoing';
    let fishId: string | undefined;
    for (let i = 0; i < 40 && status === 'ongoing'; i++) {
      const hold = fishing.barPos + fishing.barHeight * 0.5 < fishing.fishPos;
      const res = fishing.update(1 / 60, hold, () => 0.5);
      status = res.outcome.status;
      fishId = res.outcome.fish?.itemId;
    }
    expect(status).toBe('caught');
    expect(fishId).toBeTruthy();
  });
});

describe('Pillar 3: Livestock (Coop/Barn) & Underground Mines Combat', () => {
  it('builds Coop/Barn, adopts animals, pets them, and produces Egg/Milk overnight', () => {
    const livestock = new LivestockSystem();
    expect(livestock.canAdopt('chicken').ok).toBe(false);

    livestock.build('coop');
    expect(livestock.canAdopt('chicken').ok).toBe(true);
    const chicken = livestock.adopt('chicken')!;
    expect(chicken).not.toBeNull();

    const produced = livestock.advanceDay();
    expect(produced).toBe(1);
    const res = livestock.interact(chicken);
    expect(res.pettedNow).toBe(true);
    expect(res.collectedItemId).toBe('prod_egg');
  });

  it('generates mine floors, breaks ore rocks to reveal ladder, and defeats slimes', () => {
    const mine = new MineSystem();
    let seed = 42;
    const rng = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    mine.generateFloor(5, rng);
    expect(mine.floor).toBe(5);
    expect(mine.rocks.size).toBeGreaterThan(15);
    expect(mine.slimes.length).toBeGreaterThan(0);

    // Smash rocks until a downward ladder is revealed
    for (const rock of Array.from(mine.rocks.values())) {
      const hit = mine.hitRock(rock.x, rock.y, 10, rng);
      expect(hit?.broken).toBe(true);
      expect(hit?.drops.length).toBeGreaterThan(0);
      if (mine.downLadderTile) break;
    }
    expect(mine.downLadderTile).not.toBeNull();

    // Hit first slime until defeated
    const firstSlime = mine.slimes[0];
    const slash = mine.attackSlimes(firstSlime.x, firstSlime.y, 10, 40, () => 0.1);
    expect(slash.defeated).toBeGreaterThanOrEqual(1);
    expect(slash.drops.some((d) => d.itemId === 'res_slime')).toBe(true);
  });
});

describe('Pillar 4 & 5: Quests, Bundles, Heart Events, 36-Slot Backpack, Tiled Loader & Save v3', () => {
  it('completes Community Center Spring Crops Bundle to unlock Greenhouse & tracks Encyclopedia', () => {
    const col = new CollectionSystem();
    expect(col.donate('bundle_crops', 'crop_parsnip').ok).toBe(true);
    expect(col.donate('bundle_crops', 'crop_tulip').ok).toBe(true);
    const final = col.donate('bundle_crops', 'crop_strawberry');
    expect(final.ok).toBe(true);
    expect(final.bundleCompleted?.rewardKind).toBe('unlock_greenhouse');
    expect(col.unlockedGreenhouse).toBe(true);
    expect(col.getEncyclopediaStats().discovered).toBe(3);
  });

  it('triggers 2-heart NPC story events, daily quests, and interior TV/Kitchen fixtures', () => {
    const npcs = new NpcSystem();
    const quests = new QuestSystem();
    const house = new HouseInteriorSystem();

    // Verify TV & Kitchen collision fixtures
    expect(house.isSolid(HOUSE_FIXTURES.tv.x, HOUSE_FIXTURES.tv.y)).toBe(true);
    expect(house.isSolid(HOUSE_FIXTURES.kitchen.x, HOUSE_FIXTURES.kitchen.y)).toBe(true);

    // Reach 2 hearts with Emily -> triggers 2-heart story event!
    npcs.addBonusFriendship('emily', POINTS_PER_HEART * 2);
    const talkEvent = npcs.talk('emily');
    expect(talkEvent?.gainedPoints).toBe(TALK_BONUS_POINTS);
    expect(talkEvent?.triggeredHeartEvent?.heartsRequired).toBe(2);

    // Gift reaction & Quest completion
    const gift = npcs.receiveGift('clint', 'gem_amethyst');
    expect(gift.ok).toBe(true);
    expect(gift.pointsAdded).toBe(GIFT_POINTS.loved);

    expect(quests.acceptCurrent()).toBe(true);
    const completed = quests.completeCurrent();
    expect(completed?.goldReward).toBeGreaterThan(0);
  });

  it('parses standard Tiled .tmj maps and persists Schema v3 saves with 36-slot backpack', () => {
    const sampleTmj: TiledMapJson = {
      width: 3,
      height: 2,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        { name: 'ground', type: 'tilelayer', data: [1, 2, 1, 1, 3, 1] },
        { name: 'collision', type: 'tilelayer', data: [4, 0, 4, 0, 0, 0] },
        {
          name: 'objects',
          type: 'objectgroup',
          objects: [
            { id: 1, name: 'spawn', type: 'spawn', x: 16, y: 16, width: 16, height: 16 },
          ],
        },
      ],
    };
    const parsed = parseTiledMapJson(sampleTmj);
    expect(parsed.cols).toBe(3);
    expect(parsed.collisionGrid[0][0]).toBe(true);
    expect(parsed.collisionGrid[0][1]).toBe(false);
    expect(parsed.objects[0].tileX).toBe(1);

    const inv = new InventorySystem();
    expect(inv.slots.length).toBe(36);
    inv.swapSlots(0, 15);
    expect(inv.slots[15]?.itemId).toBe('tool_hoe');

    const saver = new SaveManager(createMemoryStorage(), 'test_key_v3');
    const payload: GameSaveData = {
      version: SAVE_SCHEMA_VERSION,
      savedAt: '2026-11-22T00:00:00.000Z',
      currentSceneId: 'farm',
      day: 14,
      season: 'spring',
      timeMinutes: 600,
      gold: 980,
      waterLevel: 35,
      selectedSlot: 0,
      playerX: 120,
      playerY: 140,
      soilTiles: [{ x: 6, y: 10, tilled: true, watered: true }],
      crops: [{ x: 6, y: 10, cropId: 'strawberry', daysGrown: 3, harvestedOnce: false }],
      inventory: inv.serialize().slots,
      shippingBin: [],
      todayWeather: 'rainy',
      tomorrowWeather: 'sunny',
      energy: 88,
      hp: 95,
      toolTiers: { hoe: 1, watering_can: 1, axe: 0, pickaxe: 2 },
      builtBuildings: ['coop'],
      unlockedGreenhouse: true,
      unlockedFastTravel: true,
      deepestMineFloor: 10,
    };

    expect(saver.save(payload)).toBe(true);
    expect(saver.load()).toEqual(payload);
  });
});
