import { describe, expect, it } from 'vitest';
import { CAT_BREEDS } from '../../data/pets';
import {
  PET_BOWL_POINTS,
  PET_MAX_FRIENDSHIP,
  PET_MAX_HEARTS,
  PET_PET_POINTS,
  PET_POINTS_PER_HEART,
  PET_TREAT_POINTS,
  PetSystem,
} from '../PetSystem';
import { TileMapSystem } from '../TileMapSystem';

describe('Companion Dual-Cat PetSystem', () => {
  it('blinks briefly while idle and holds the sleeping pose during naps', () => {
    const pets = new PetSystem();
    const cat = pets.adopt('cat_maine_silver')!;
    let closedSeconds = 0;
    for (let i = 0; i < 380; i++) {
      cat.animTimer = i / 100;
      if (pets.getSpriteKey(cat).endsWith('_idle_1')) closedSeconds += 0.01;
    }
    expect(closedSeconds).toBeCloseTo(0.15, 2);
    cat.state = 'sleep';
    expect(pets.getSpriteKey(cat)).toBe('pet_cat_maine_silver_sleep');
  });

  it('adopts both bespoke cats, prevents duplicate breed adoption, and supports renaming', () => {
    const pets = new PetSystem();
    expect(pets.hasAnyCat()).toBe(false);

    const maine = pets.adopt('cat_maine_silver', '灰绒');
    const bicolor = pets.adopt('cat_bicolor_tabby', '奶盖');
    expect(maine).not.toBeNull();
    expect(bicolor).not.toBeNull();
    expect(pets.cats.length).toBe(2);

    // Duplicate breed is rejected
    expect(pets.adopt('cat_maine_silver')).toBeNull();

    // Renaming works cleanly
    expect(pets.rename('cat_bicolor_tabby', '吐舌小胖')).toBe(true);
    expect(pets.getCat('cat_bicolor_tabby')?.name).toBe('吐舌小胖');
    expect(pets.rename('cat_bicolor_tabby', '   ')).toBe(false);
  });

  it('tracks daily petting, favorite treats, water bowl boost, rainy auto-fill, and 3+ heart lucky gifts', () => {
    const pets = new PetSystem();
    const maine = pets.adopt('cat_maine_silver')!;
    const bicolor = pets.adopt('cat_bicolor_tabby')!;
    const initialPoints = maine.friendship;

    // Daily petting adds points once per day
    const firstPet = pets.petInteract(maine);
    expect(firstPet.pettedNow).toBe(true);
    expect(firstPet.gainedPoints).toBe(PET_PET_POINTS);
    expect(maine.friendship).toBe(initialPoints + PET_PET_POINTS);

    const secondPet = pets.petInteract(maine);
    expect(secondPet.pettedNow).toBe(false);
    expect(secondPet.gainedPoints).toBe(0);

    // Favorite treat accepted once per day; non-favorite rejected
    expect(pets.giveTreat('cat_bicolor_tabby', 'res_stone').ok).toBe(false);
    const treatRes = pets.giveTreat('cat_bicolor_tabby', 'fish_carp');
    expect(treatRes.ok).toBe(true);
    expect(treatRes.gainedPoints).toBe(PET_TREAT_POINTS);
    expect(pets.giveTreat('cat_bicolor_tabby', 'prod_milk').ok).toBe(false);

    // Fill water bowl & advance into a rainy day -> both cats gain bowl points + rain refills bowl!
    expect(pets.fillWaterBowl()).toBe(true);
    expect(pets.fillWaterBowl()).toBe(false);

    // Boost maine to 3 hearts so morning lucky gift triggers with low rng
    maine.friendship = PET_POINTS_PER_HEART * 3;
    const report = pets.advanceDay(true, () => 0.05);
    expect(report.drankFromBowl).toBe(true);
    expect(report.rainFilledBowl).toBe(true);
    expect(report.gainedPointsPerCat).toBe(PET_BOWL_POINTS);
    expect(pets.bowlFilledToday).toBe(true);
    expect(maine.pettedToday).toBe(false);
    expect(bicolor.treatGivenToday).toBe(false);
    expect(report.broughtGifts.length).toBeGreaterThanOrEqual(1);
    expect(maine.pendingGiftItemId).toBeTruthy();
    expect(CAT_BREEDS.cat_maine_silver.luckyGiftPool).toContain(maine.pendingGiftItemId);

    // Petting delivers the pending lucky gift
    const giftClaim = pets.petInteract(maine);
    expect(giftClaim.claimedGiftItemId).toBe(report.broughtGifts[0].itemId);
    expect(maine.pendingGiftItemId).toBeNull();
  });

  it('switches active scene between farm (sunny day) and house (rainy or evening), updates follow AI, and round-trips serialization', () => {
    const pets = new PetSystem();
    const map = new TileMapSystem();
    const maine = pets.adopt('cat_maine_silver', '灰绒')!;
    const bicolor = pets.adopt('cat_bicolor_tabby', '奶盖')!;

    expect(pets.getActiveScene(false, 10 * 60)).toBe('farm');
    expect(pets.getActiveScene(true, 10 * 60)).toBe('house');
    expect(pets.getActiveScene(false, 19 * 60 + 10)).toBe('house');

    // Follow player mode moves cat towards player
    expect(pets.toggleFollow('cat_maine_silver')).toBe(true);
    const startX = maine.x;
    pets.update(0.5, 'farm', startX + 48, maine.y, map);
    expect(maine.x).toBeGreaterThan(startX);

    // Cap friendship at 5 hearts
    bicolor.friendship = PET_MAX_FRIENDSHIP;
    expect(pets.getHearts(bicolor)).toBe(PET_MAX_HEARTS);

    // Serialize & load round-trip
    pets.fillWaterBowl();
    const serialized = pets.serialize();
    const restored = new PetSystem();
    restored.load(serialized);

    expect(restored.bowlFilledToday).toBe(true);
    expect(restored.cats.length).toBe(2);
    expect(restored.getCat('cat_maine_silver')?.followPlayer).toBe(true);
    expect(restored.getCat('cat_bicolor_tabby')?.friendship).toBe(PET_MAX_FRIENDSHIP);
  });
});
