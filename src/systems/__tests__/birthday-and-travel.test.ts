import { describe, expect, it, vi } from 'vitest';
import { GameWorld } from '../../core/GameWorld';
import { FARM_LAYOUT, TOWN_ENTRY, TILE_SIZE } from '../../data/worldConfig';
import { AudioManager } from '../../engine/AudioManager';
import { EventBus } from '../../engine/EventBus';
import type { InputManager } from '../../engine/InputManager';
import { SaveManager } from '../../engine/SaveManager';
import type { SpriteAtlas } from '../../engine/SpriteAtlas';
import { TownScene } from '../../scenes/TownScene';
import { HOUSE_FIXTURES } from '../HouseInteriorSystem';

function memorySave(): SaveManager {
  const records = new Map<string, string>();
  return new SaveManager({
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  });
}

function game(saveManager = memorySave()): GameWorld {
  const audio = new AudioManager();
  audio.setMuted(true);
  return new GameWorld({
    bus: new EventBus(), audio, saveManager, input: {} as InputManager, atlas: {} as SpriteAtlas,
  });
}

const contents = (world: GameWorld) =>
  ['food_berry_toast', 'crop_tulip', 'gem_amethyst'].map((id) => world.inventory.getItemCount(id));

describe('Birthday gift delivery', () => {
  it('waits for the whole gift, fits existing stacks, and delivers once across reloads', () => {
    const storage = memorySave();
    const world = game(storage);
    const slots = world.inventory.slots;
    for (let i = 0; i < slots.length; i++) slots[i] ??= { itemId: 'tool_hoe', quantity: 1 };
    world.saveGameState();
    const before = world.inventory.serialize();
    expect(world.claimBirthdayGift()).toBe('bag-full');
    expect(world.inventory.serialize()).toEqual(before);

    slots[31] = { itemId: 'crop_tulip', quantity: 1 };
    slots[32] = null; // Can fit toast and stack tulips, but nowhere to put the amethyst.
    expect(world.claimBirthdayGift()).toBe('bag-full');
    expect(slots[32]).toBeNull();
    expect(contents(world)).toEqual([0, 1, 0]);
    expect(world.pets.hasAnyCat()).toBe(false);
    expect(world.collections.isDiscovered('food_berry_toast')).toBe(false);
    slots[33] = null;
    expect(world.claimBirthdayGift()).toBe('claimed');
    expect(contents(world)).toEqual([2, 4, 1]);
    expect(world.claimBirthdayGift()).toBe('already-claimed');

    const restored = game(storage);
    expect(restored.loadGameState()).toBe(true);
    expect(restored.claimBirthdayGift()).toBe('already-claimed');
    expect(contents(restored)).toEqual([2, 4, 1]);
    expect(restored.pets.cats.map((cat) => restored.pets.getHearts(cat))).toEqual([5, 5]);
    expect(restored.collections.isDiscovered('gem_amethyst')).toBe(true);
  });

  it('leaves a failed save retryable and treats an older save with no receipt as unclaimed', () => {
    const storage = memorySave();
    const world = game(storage);
    world.saveGameState();
    const old = storage.load()!;
    delete old.birthdayGiftClaimed;
    storage.save(old);
    world.loadGameState();
    vi.spyOn(storage, 'save').mockReturnValueOnce(false);
    expect(world.claimBirthdayGift()).toBe('save-failed');
    expect(contents(world)).toEqual([0, 0, 0]);
    expect(world.birthdayGiftClaimed).toBe(false);
    expect(world.pets.hasAnyCat()).toBe(false);
    expect(world.claimBirthdayGift()).toBe('claimed');
    world.resetFarm();
    expect(world.claimBirthdayGift()).toBe('claimed');
    expect(contents(world)).toEqual([2, 3, 1]);
  });
});

describe('Birthday companions', () => {
  it.each(['rainy', 'sunny'] as const)('keeps both cats on the farm during a %s celebration', (weather) => {
    const storage = memorySave();
    const world = game(storage);
    world.weather.today = weather;
    world.time.minutes = weather === 'rainy' ? 600 : 1200;
    world.pets.adopt('cat_maine_silver', '小灰')!.followPlayer = true;
    world.travelTo('house');
    world.startBirthdayCelebration();
    expect(world.currentSceneId).toBe('farm');
    const restored = game(storage);
    expect(restored.loadGameState()).toBe(true);
    expect(restored.pets.getActiveScene(weather === 'rainy', restored.time.minutes)).toBe('farm');
    expect(restored.pets.cats.map((cat) => cat.state)).toEqual(['follow', 'follow']);
    for (const cat of restored.pets.cats) {
      expect(Math.hypot(cat.x - restored.player.x, cat.y - restored.player.y)).toBeLessThan(20);
    }
    restored.travelTo('house');
    expect(restored.pets.celebratingOnFarm).toBe(false);
    expect(restored.pets.getActiveScene(weather === 'rainy', restored.time.minutes)).toBe('house');
    expect(restored.pets.cats.map((cat) => [cat.name, cat.followPlayer])).toEqual([
      ['小灰', true], ['奶盖', false],
    ]);
  });

  it('ends the celebration on sleep and restores the ordinary daily schedule', () => {
    const world = game();
    world.startBirthdayCelebration();
    world.triggerSleep();
    expect(world.currentSceneId).toBe('house');
    expect(world.pets.celebratingOnFarm).toBe(false);
    expect(world.pets.getActiveScene(false, 600)).toBe('farm');
    expect(world.pets.getActiveScene(true, 600)).toBe('house');
  });

  it('persists porch mailbox read state and flows from indoor cake candle wish to outdoor petal celebration', () => {
    const storage = memorySave();
    const world = game(storage);

    expect(world.tileMap.getInteractiveZoneAt(FARM_LAYOUT.mailbox.x, FARM_LAYOUT.mailbox.y)).toBe('mailbox');
    expect(world.house.isSolid(HOUSE_FIXTURES.birthdayTable.x, HOUSE_FIXTURES.birthdayTable.y)).toBe(true);
    expect(world.house.isBirthdayTableZone(HOUSE_FIXTURES.birthdayTable.x, HOUSE_FIXTURES.birthdayTable.y + 1)).toBe(true);

    // Open porch mailbox -> marks letter read & persists across reload
    let openedCount = 0;
    world.bus.on('ui:openMailboxLetter', () => {
      openedCount += 1;
    });
    expect(world.birthdayLetterRead).toBe(false);
    world.openPorchMailbox();
    expect(openedCount).toBe(1);
    expect(world.birthdayLetterRead).toBe(true);

    const restored = game(storage);
    expect(restored.loadGameState()).toBe(true);
    expect(restored.birthdayLetterRead).toBe(true);

    // Enter farmhouse and blow out cake candles -> gathers both 5-heart cats indoors
    world.travelTo('house');
    expect(world.birthdayCandlesLit).toBe(true);
    world.interactWithBirthdayCake();
    expect(world.birthdayCandlesLit).toBe(false);
    expect(world.indoorBirthdayGathering).toBe(true);
    expect(world.pets.cats.length).toBe(2);
    expect(world.pets.cats.map((c) => world.pets.getHearts(c))).toEqual([5, 5]);

    // Step back out onto the farm -> automatically transitions into outdoor petal celebration!
    world.travelTo('farm');
    expect(world.indoorBirthdayGathering).toBe(false);
    expect(world.pets.celebratingOnFarm).toBe(true);
  });
});

describe('Saved town position', () => {
  it.each([
    { from: [13.5, 10.5], expected: [13.5, 10.5] },
    { from: [13.5, 11.5], expected: [TOWN_ENTRY.x, TOWN_ENTRY.y] }, // fountain
    { from: [13.5, 10.95], expected: [TOWN_ENTRY.x, TOWN_ENTRY.y] }, // feet overlap the fountain
    { from: [-2, 45], expected: [TOWN_ENTRY.x, TOWN_ENTRY.y] },
  ])('restores a safe position when loading $from', ({ from, expected }) => {
    const storage = memorySave();
    const original = game(storage);
    original.currentSceneId = 'town';
    original.player.setPositionTile(from[0], from[1]);
    original.saveGameState();
    const restored = game(storage);
    restored.loadGameState();
    new TownScene(restored).enter();
    expect(restored.currentSceneId).toBe('town');
    expect([restored.player.x, restored.player.y]).toEqual(expected.map((n) => n * TILE_SIZE));
  });
});
