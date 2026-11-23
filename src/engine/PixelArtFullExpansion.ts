import type { RegisterSpriteFn } from './PixelArtExpansion';

/**
 * Complete pixel-art expansion for all 5 Stardew feature pillars:
 * Seasonal terrain/trees, full toolset, 4-season crops, resources/ores/gems,
 * fish, animal products, artisan goods, cooked dishes, craftable machines,
 * Coop/Barn & animals, Greenhouse, Blacksmith, Community Center, Clint NPC,
 * Farmhouse TV & Kitchen, and Mine rocks/ladders/slimes.
 */
export function bakeFullExpansionSprites(register: RegisterSpriteFn): void {
  bakeSeasonalTerrainAndWildNodes(register);
  bakeNewToolsAndResources(register);
  bakeNewCropsAndSeeds(register);
  bakeFishFoodAndArtisan(register);
  bakeMachines(register);
  bakeBuildingsAndAnimals(register);
  bakeInteriorAppliancesAndMine(register);
  bakeClintNpc(register);
}

/* =========================================================
   1. SEASONAL TERRAIN, TREES & WILD WEEDS
   ========================================================= */
function bakeSeasonalTerrainAndWildNodes(register: RegisterSpriteFn): void {
  const seasonGrass: [string, string, string, string][] = [
    ['summer', '#5fa83a', '#74bf48', '#4c8e2d'],
    ['fall', '#c48a3b', '#dba24c', '#a36e29'],
    ['winter', '#dcebf5', '#f2f9ff', '#b9d4e6'],
  ];

  for (const [season, base, hi, lo] of seasonGrass) {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, base);
    const dots = [[3, 4], [11, 3], [6, 10], [13, 13], [2, 12]];
    for (const [x, y] of dots) {
      px(ctx, x, y, hi);
      px(ctx, x, y + 1, lo);
    }
    register(`grass_${season}`, c);
  }

  // Seasonal Oak Trees (32x40)
  const treePalettes: [string, string, string, string, string][] = [
    ['summer', '#215220', '#31702b', '#499137', '#67b346'],
    ['fall', '#782f1b', '#ad4721', '#d96e26', '#f2a638'],
    ['winter', '#4c6578', '#6f8ea3', '#b8d4e6', '#ebf6ff'],
  ];

  for (const [season, dark, mid, light, hi] of treePalettes) {
    const c = createCanvas(32, 40);
    const ctx = getCtx(c);
    fillEllipse(ctx, 16, 35, 11, 4, 'rgba(26, 40, 26, 0.28)');
    fillRect(ctx, 13, 22, 6, 13, '#7b4827');
    fillRect(ctx, 14, 22, 2, 13, '#9c6036');
    fillRect(ctx, 18, 22, 1, 13, '#4f2c15');
    fillEllipse(ctx, 16, 16, 13, 12, dark);
    fillEllipse(ctx, 16, 15, 12, 10, mid);
    fillEllipse(ctx, 12, 13, 8, 7, light);
    fillEllipse(ctx, 16, 9, 8, 6, hi);
    register(`tree_oak_${season}`, c);
  }

  // Wild Weed tuft (16x16)
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 13, 6, 2, 'rgba(25,40,18,0.28)');
    fillRect(ctx, 4, 8, 8, 5, '#3d7d26');
    fillRect(ctx, 3, 6, 3, 5, '#59a635');
    fillRect(ctx, 7, 4, 3, 7, '#6ec242');
    fillRect(ctx, 10, 6, 3, 5, '#59a635');
    px(ctx, 8, 5, '#9ce86b');
    px(ctx, 4, 7, '#8ad959');
    register('wild_weed', c);
  }
}

/* =========================================================
   2. NEW TOOLS, RESOURCES, ORES, BARS & GEMS
   ========================================================= */
function bakeNewToolsAndResources(register: RegisterSpriteFn): void {
  // Axe
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    for (let i = 0; i < 9; i++) {
      fillRect(ctx, 3 + i, 12 - i, 2, 2, '#995c2e');
      px(ctx, 3 + i, 12 - i, '#c9884f');
    }
    fillRect(ctx, 8, 2, 5, 5, '#9aa4b2');
    fillRect(ctx, 12, 3, 2, 5, '#cfd8e3');
    fillRect(ctx, 9, 2, 3, 1, '#e8eef5');
    register('item_axe', c);
  }

  // Pickaxe
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    for (let i = 0; i < 9; i++) {
      fillRect(ctx, 3 + i, 12 - i, 2, 2, '#995c2e');
      px(ctx, 3 + i, 12 - i, '#c9884f');
    }
    fillRect(ctx, 6, 2, 7, 2, '#9da7b5');
    fillRect(ctx, 11, 3, 2, 6, '#9da7b5');
    fillRect(ctx, 7, 2, 5, 1, '#dfe7f0');
    px(ctx, 5, 3, '#7b8491');
    px(ctx, 12, 9, '#7b8491');
    register('item_pickaxe', c);
  }

  // Scythe
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    for (let i = 0; i < 10; i++) {
      fillRect(ctx, 4 + Math.floor(i * 0.7), 13 - i, 2, 2, '#9c6030');
    }
    fillRect(ctx, 4, 2, 8, 2, '#cfd8e3');
    fillRect(ctx, 2, 4, 4, 2, '#9aa5b3');
    fillRect(ctx, 5, 2, 6, 1, '#f2f7fc');
    register('item_scythe', c);
  }

  // Bamboo Fishing Rod
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    for (let i = 0; i < 10; i++) {
      px(ctx, 2 + i, 13 - i, '#a87236');
      px(ctx, 3 + i, 13 - i, '#d49d55');
    }
    // Fishing line & red bobber
    fillRect(ctx, 12, 4, 1, 7, '#dceaf2');
    fillRect(ctx, 11, 10, 3, 3, '#e04238');
    fillRect(ctx, 11, 12, 3, 1, '#ffffff');
    register('item_fishing_rod', c);
  }

  // Traveler's Iron Sword
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    // Blade
    for (let i = 0; i < 8; i++) {
      fillRect(ctx, 6 + i, 9 - i, 2, 2, '#c8d3e0');
      px(ctx, 6 + i, 9 - i, '#eef5fc');
    }
    // Crossguard
    fillRect(ctx, 4, 8, 5, 2, '#d49b35');
    fillRect(ctx, 6, 10, 2, 3, '#d49b35');
    // Grip
    fillRect(ctx, 3, 11, 3, 3, '#6e3d1e');
    px(ctx, 2, 13, '#f2c45a');
    register('item_sword', c);
  }

  // Wood log
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 5, 12, 7, '#8c5025');
    fillRect(ctx, 3, 4, 10, 2, '#b06d38');
    fillRect(ctx, 2, 10, 12, 2, '#5e3214');
    fillRect(ctx, 11, 6, 3, 5, '#e8c189');
    px(ctx, 12, 8, '#a16634');
    register('res_wood', c);
  }

  // Stone
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 6, 10, 7, '#7e8387');
    fillRect(ctx, 4, 4, 8, 3, '#a4aaae');
    fillRect(ctx, 5, 5, 4, 2, '#cad0d4');
    fillRect(ctx, 3, 11, 10, 2, '#5a5f63');
    register('res_stone', c);
  }

  // Plant Fiber
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 4, 5, 2, 8, '#5ea635');
    fillRect(ctx, 7, 3, 2, 10, '#78c447');
    fillRect(ctx, 10, 5, 2, 8, '#53942e');
    fillRect(ctx, 3, 8, 10, 2, '#c99749');
    register('res_fiber', c);
  }

  // Slime Gel
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 9, 5, 4, '#56c758');
    fillEllipse(ctx, 8, 8, 4, 3, '#7ce87e');
    px(ctx, 6, 7, '#d9ffdb');
    px(ctx, 7, 7, '#d9ffdb');
    register('res_slime', c);
  }

  // Ores
  register('ore_copper', buildOreSprite('#c96832', '#f09454', '#7a3715'));
  register('ore_iron', buildOreSprite('#94a2b3', '#d0dce8', '#525d6b'));
  register('ore_gold', buildOreSprite('#e0a61b', '#ffe169', '#8c5d08'));

  // Metal Bars
  register('bar_copper', buildBarSprite('#c7642e', '#f2995c', '#7d3814'));
  register('bar_iron', buildBarSprite('#8d9cab', '#d7e3f0', '#505b69'));
  register('bar_gold', buildBarSprite('#e0a519', '#ffea75', '#8c5c07'));

  // Gems
  register('gem_amethyst', buildGemSprite('#9c47cf', '#d68fff', '#591e80'));
  register('gem_emerald', buildGemSprite('#2ba859', '#7ef2a6', '#166332'));
  register('gem_ruby', buildGemSprite('#d93044', '#ff8593', '#821322'));
}

/* =========================================================
   3. NEW SEASONAL SEEDS & CROPS (4 STAGES)
   ========================================================= */
function bakeNewCropsAndSeeds(register: RegisterSpriteFn): void {
  register('seed_blueberry', buildSeedPacket('#4278d4', '#4f9c35'));
  register('seed_melon', buildSeedPacket('#f58aa5', '#529c33'));
  register('seed_cranberry', buildSeedPacket('#c4253e', '#7a8f2c'));
  register('seed_snow_yam', buildSeedPacket('#a3d1f0', '#6d9cc4'));

  // Blueberry icon
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 6, 9, 4, 4, '#3668bf');
    fillEllipse(ctx, 10, 10, 4, 4, '#2b55a3');
    fillEllipse(ctx, 8, 6, 3, 3, '#4c85e3');
    px(ctx, 7, 5, '#a8cbff');
    px(ctx, 5, 8, '#8ab7ff');
    register('crop_blueberry', c);
  }

  // Melon icon
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 7, 2, 2, 3, '#4d912e');
    fillEllipse(ctx, 8, 9, 5, 5, '#eb6f8f');
    fillEllipse(ctx, 8, 9, 4, 4, '#ff99b3');
    fillRect(ctx, 6, 6, 2, 2, '#ffd1de');
    register('crop_melon', c);
  }

  // Cranberry icon
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 7, 3, 2, 4, '#4c8729');
    fillEllipse(ctx, 6, 10, 3, 3, '#b81d38');
    fillEllipse(ctx, 10, 9, 3, 3, '#db2a49');
    px(ctx, 5, 9, '#ff8095');
    px(ctx, 9, 8, '#ff8095');
    register('crop_cranberry', c);
  }

  // Snow Yam icon
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 6, 2, 4, 3, '#7cb2d9');
    fillRect(ctx, 5, 5, 6, 6, '#c7e3f7');
    fillRect(ctx, 6, 11, 4, 3, '#9bc5e3');
    fillRect(ctx, 6, 6, 3, 3, '#edf7ff');
    register('crop_snow_yam', c);
  }

  // 4 stages for each new seasonal crop
  const specs: [string, string, string][] = [
    ['blueberry', '#3a72d4', '#85b8ff'],
    ['melon', '#f27c9c', '#ffc4d4'],
    ['cranberry', '#c92440', '#ff7d93'],
    ['snow_yam', '#a8d5f5', '#edf7ff'],
  ];

  for (const [id, fruit, hi] of specs) {
    // Stage 0
    {
      const c = createCanvas(16, 20);
      const ctx = getCtx(c);
      fillRect(ctx, 4, 12, 2, 2, '#e6c98a');
      fillRect(ctx, 9, 14, 2, 2, '#e6c98a');
      register(`crop_${id}_0`, c);
    }
    // Stage 1
    {
      const c = createCanvas(16, 20);
      const ctx = getCtx(c);
      fillRect(ctx, 7, 11, 2, 5, '#4b8f2b');
      fillRect(ctx, 4, 10, 3, 2, '#7bc948');
      fillRect(ctx, 9, 10, 3, 2, '#8cd656');
      register(`crop_${id}_1`, c);
    }
    // Stage 2
    {
      const c = createCanvas(16, 20);
      const ctx = getCtx(c);
      fillRect(ctx, 3, 8, 10, 7, '#4e9630');
      fillRect(ctx, 5, 6, 6, 5, '#73bf45');
      register(`crop_${id}_2`, c);
    }
    // Stage 3 (mature)
    {
      const c = createCanvas(16, 20);
      const ctx = getCtx(c);
      if (id === 'melon') {
        fillRect(ctx, 2, 13, 12, 3, '#458528');
        fillEllipse(ctx, 8, 11, 5, 5, fruit);
        fillRect(ctx, 6, 8, 3, 2, hi);
      } else if (id === 'snow_yam') {
        fillRect(ctx, 4, 4, 8, 5, '#6ba4cf');
        fillRect(ctx, 5, 9, 6, 7, fruit);
        fillRect(ctx, 6, 10, 3, 4, hi);
      } else {
        fillRect(ctx, 2, 6, 12, 10, '#3b7a24');
        fillRect(ctx, 3, 5, 10, 8, '#58a334');
        fillRect(ctx, 4, 9, 3, 3, fruit);
        px(ctx, 4, 9, hi);
        fillRect(ctx, 9, 10, 3, 3, fruit);
        px(ctx, 9, 10, hi);
        fillRect(ctx, 7, 6, 3, 3, fruit);
        px(ctx, 7, 6, hi);
      }
      register(`crop_${id}_3`, c);
    }
  }
}

/* =========================================================
   4. FISH, ANIMAL PRODUCTS, ARTISAN GOODS & COOKED DISHES
   ========================================================= */
function bakeFishFoodAndArtisan(register: RegisterSpriteFn): void {
  register('fish_carp', buildFishSprite('#c98e4c', '#e8b97a', '#8c5b2b'));
  register('fish_sunfish', buildFishSprite('#f2a529', '#ffe16e', '#b86812'));
  register('fish_trout', buildFishSprite('#5e9c8c', '#9ad9c8', '#3c6b5f'));
  register('fish_catfish', buildFishSprite('#5c6f82', '#8ca0b5', '#394754'));
  register('fish_golden_koi', buildFishSprite('#f5b318', '#fff08a', '#d94c26'));

  // Egg
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 9, 4, 5, '#e8ddc5');
    fillEllipse(ctx, 8, 8, 3, 4, '#fffaf0');
    px(ctx, 6, 6, '#ffffff');
    register('prod_egg', c);
  }

  // Milk jug
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 5, 2, 6, 2, '#99a8b8');
    fillRect(ctx, 4, 4, 8, 10, '#d8e4f0');
    fillRect(ctx, 5, 5, 6, 8, '#ffffff');
    fillRect(ctx, 5, 7, 6, 3, '#5da3db');
    register('prod_milk', c);
  }

  // Wool
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 6, 9, 4, 4, '#e3e8ed');
    fillEllipse(ctx, 10, 9, 4, 4, '#e3e8ed');
    fillEllipse(ctx, 8, 6, 4, 4, '#ffffff');
    fillEllipse(ctx, 8, 9, 4, 3, '#f7fafc');
    register('prod_wool', c);
  }

  // Jam jar
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 5, 2, 6, 2, '#c94338');
    fillRect(ctx, 4, 4, 8, 10, '#a3293f');
    fillRect(ctx, 5, 5, 6, 8, '#db3d57');
    fillRect(ctx, 5, 7, 6, 3, '#fff2d1');
    register('art_jam', c);
  }

  // Wine bottle
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 7, 1, 2, 2, '#c99352');
    fillRect(ctx, 6, 3, 4, 4, '#592045');
    fillRect(ctx, 4, 7, 8, 7, '#75295a');
    fillRect(ctx, 5, 9, 6, 3, '#f5e1b8');
    px(ctx, 6, 8, '#b85c97');
    register('art_wine', c);
  }

  // Mayo
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 5, 2, 6, 2, '#5c94d4');
    fillRect(ctx, 4, 4, 8, 10, '#f0e5c2');
    fillRect(ctx, 5, 5, 6, 8, '#fff8de');
    fillRect(ctx, 5, 8, 6, 2, '#e8b743');
    register('art_mayo', c);
  }

  // Cheese wheel
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 7, 12, 6, '#e09d1f');
    fillRect(ctx, 3, 4, 10, 5, '#ffd047');
    px(ctx, 5, 9, '#b57410');
    px(ctx, 9, 10, '#b57410');
    px(ctx, 10, 6, '#e09d1f');
    register('art_cheese', c);
  }

  // Cooked foods
  // Soup
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 8, 10, 5, '#8c5027');
    fillRect(ctx, 4, 7, 8, 3, '#f5d27a');
    fillRect(ctx, 5, 3, 1, 3, '#ffffff');
    fillRect(ctx, 9, 2, 1, 3, '#ffffff');
    register('food_soup', c);
  }
  // Berry Toast
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 4, 10, 9, '#ba7938');
    fillRect(ctx, 4, 5, 8, 7, '#f2cc8f');
    fillRect(ctx, 5, 6, 6, 5, '#d93848');
    px(ctx, 7, 8, '#ffe082');
    register('food_toast', c);
  }
  // Pumpkin Pie
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 10, 6, 4, '#c7833e');
    fillEllipse(ctx, 8, 9, 5, 3, '#f08922');
    fillRect(ctx, 7, 7, 2, 2, '#fff9e6');
    register('food_pie', c);
  }
  // Fried Fish
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 9, 6, 4, '#f0ead8');
    fillRect(ctx, 4, 7, 7, 4, '#d98a36');
    fillRect(ctx, 11, 7, 2, 4, '#b86c23');
    px(ctx, 5, 8, '#7cc94b');
    register('food_fish', c);
  }
  // Omelet
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 9, 6, 4, '#f2ecdc');
    fillEllipse(ctx, 8, 9, 5, 3, '#ffd242');
    px(ctx, 7, 8, '#5eb338');
    px(ctx, 9, 9, '#e04238');
    register('food_omelet', c);
  }
}

/* =========================================================
   5. CRAFTABLE FARM MACHINES (16x20 or 16x16)
   ========================================================= */
function bakeMachines(register: RegisterSpriteFn): void {
  // Chest
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 4, 12, 10, '#8f5226');
    fillRect(ctx, 3, 5, 10, 3, '#bd7942');
    fillRect(ctx, 2, 8, 12, 1, '#4f2a10');
    fillRect(ctx, 7, 7, 2, 3, '#f5c742');
    register('mach_chest', c);
  }

  // Scarecrow (16x22)
  {
    const c = createCanvas(16, 22);
    const ctx = getCtx(c);
    fillRect(ctx, 7, 10, 2, 11, '#7a4822');
    fillRect(ctx, 2, 11, 12, 2, '#8c5328');
    fillRect(ctx, 5, 10, 6, 7, '#4373a8');
    fillEllipse(ctx, 8, 7, 3, 3, '#e8902a'); // pumpkin head
    px(ctx, 7, 7, '#3b1f12');
    px(ctx, 9, 7, '#3b1f12');
    fillRect(ctx, 3, 3, 10, 2, '#d4a346'); // straw hat
    fillRect(ctx, 5, 1, 6, 3, '#e6b85c');
    register('mach_scarecrow', c);
  }

  // Basic Sprinkler
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 5, 8, 6, 6, '#7a8491');
    fillRect(ctx, 6, 5, 4, 4, '#c76832');
    fillRect(ctx, 4, 6, 8, 2, '#f09454');
    px(ctx, 7, 4, '#7cd5ff');
    register('mach_sprinkler', c);
  }

  // Quality Sprinkler
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 4, 8, 8, 6, '#5c6978');
    fillRect(ctx, 5, 4, 6, 5, '#d6e3f0');
    fillRect(ctx, 3, 6, 10, 2, '#f2c144');
    fillRect(ctx, 7, 2, 2, 2, '#7cd5ff');
    register('mach_quality_sprinkler', c);
  }

  // Preserves Jar
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 5, 10, 11, '#995b2d');
    fillRect(ctx, 4, 6, 8, 9, '#bd7b42');
    fillRect(ctx, 3, 8, 10, 2, '#5c636e');
    fillRect(ctx, 3, 13, 10, 2, '#5c636e');
    fillRect(ctx, 4, 3, 8, 2, '#db9e63');
    register('mach_preserves_jar', c);
  }

  // Keg
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 4, 10, 12, '#7d4621');
    fillRect(ctx, 4, 5, 8, 10, '#a46434');
    fillRect(ctx, 3, 7, 10, 1, '#474c54');
    fillRect(ctx, 3, 12, 10, 1, '#474c54');
    fillRect(ctx, 7, 9, 2, 2, '#f2c144'); // tap
    register('mach_keg', c);
  }

  // Seed Maker
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 6, 10, 10, '#8c5328');
    fillRect(ctx, 4, 3, 8, 4, '#59a635');
    fillRect(ctx, 5, 9, 6, 4, '#f0d69c');
    px(ctx, 7, 10, '#4f912d');
    register('mach_seed_maker', c);
  }

  // Mayo Maker
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 4, 7, 8, 9, '#d8c59e');
    fillRect(ctx, 5, 4, 6, 4, '#fff7de');
    fillRect(ctx, 6, 10, 4, 3, '#5da3db');
    register('mach_mayo_maker', c);
  }

  // Cheese Press
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 4, 2, 12, '#7d4723');
    fillRect(ctx, 11, 4, 2, 12, '#7d4723');
    fillRect(ctx, 3, 3, 10, 2, '#a86737');
    fillRect(ctx, 5, 10, 6, 5, '#ffd047');
    fillRect(ctx, 7, 5, 2, 5, '#8a94a1');
    register('mach_cheese_press', c);
  }

  // Stone Furnace
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 4, 10, 12, '#73787d');
    fillRect(ctx, 4, 5, 8, 10, '#92989e');
    fillRect(ctx, 5, 10, 6, 5, '#2b1912');
    fillRect(ctx, 6, 11, 4, 3, '#ff8929');
    fillRect(ctx, 7, 12, 2, 2, '#fff08a');
    fillRect(ctx, 5, 2, 6, 2, '#5c6066');
    register('mach_furnace', c);
  }
}

/* =========================================================
   6. BUILDINGS (COOP, BARN, GREENHOUSE, BLACKSMITH, CC) & ANIMALS
   ========================================================= */
function bakeBuildingsAndAnimals(register: RegisterSpriteFn): void {
  // Coop (48x40)
  {
    const c = createCanvas(48, 40);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 34, 42, 5, 'rgba(25,36,18,0.28)');
    fillRect(ctx, 5, 16, 38, 20, '#d9a466');
    fillRect(ctx, 5, 32, 38, 4, '#8c5328');
    // Pitched golden-brown roof
    for (let r = 0; r < 14; r++) {
      fillRect(ctx, 3 + Math.max(0, 10 - r), 4 + r, 42 - Math.max(0, 10 - r) * 2, 1, r % 2 === 0 ? '#a85328' : '#c76936');
    }
    fillRect(ctx, 18, 22, 12, 14, '#5e3216');
    fillRect(ctx, 20, 24, 8, 12, '#8c5328');
    // Tiny chicken hatch door
    fillRect(ctx, 8, 27, 7, 8, '#3b1f12');
    register('building_coop', c);
  }

  // Barn (64x48)
  {
    const c = createCanvas(64, 48);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 41, 58, 6, 'rgba(25,36,18,0.3)');
    // Classic red barn walls
    fillRect(ctx, 6, 18, 52, 25, '#b8372c');
    fillRect(ctx, 6, 18, 3, 25, '#f2ead8');
    fillRect(ctx, 55, 18, 3, 25, '#f2ead8');
    // Gambrel roof
    for (let r = 0; r < 16; r++) {
      const inset = Math.max(0, 14 - r);
      fillRect(ctx, 4 + inset, 3 + r, 56 - inset * 2, 1, r % 2 === 0 ? '#6e3a22' : '#8a4c2e');
    }
    // Double barn door with X trim
    fillRect(ctx, 22, 24, 20, 19, '#8c241c');
    fillRect(ctx, 22, 24, 20, 2, '#f2ead8');
    fillRect(ctx, 31, 24, 2, 19, '#f2ead8');
    // Hayloft window
    fillRect(ctx, 28, 12, 8, 6, '#3b1f12');
    fillRect(ctx, 29, 15, 6, 3, '#e6b84c');
    register('building_barn', c);
  }

  // Greenhouse (Restored Glass Dome 80x64)
  {
    const c = createCanvas(80, 64);
    const ctx = getCtx(c);
    fillRect(ctx, 4, 56, 72, 6, 'rgba(25,40,22,0.28)');
    // Glass roof frame (translucent cyan glass so players see crops inside!)
    fillRect(ctx, 6, 8, 68, 48, 'rgba(145, 224, 245, 0.34)');
    // Wooden & wrought-iron greenhouse arches
    fillRect(ctx, 4, 6, 72, 4, '#5c3c24');
    fillRect(ctx, 4, 54, 72, 4, '#8c613b');
    fillRect(ctx, 4, 6, 4, 52, '#5c3c24');
    fillRect(ctx, 72, 6, 4, 52, '#5c3c24');
    fillRect(ctx, 27, 8, 2, 48, 'rgba(92,60,36,0.55)');
    fillRect(ctx, 51, 8, 2, 48, 'rgba(92,60,36,0.55)');
    // Glass specular streaks
    fillRect(ctx, 12, 12, 8, 2, 'rgba(255,255,255,0.65)');
    fillRect(ctx, 56, 12, 10, 2, 'rgba(255,255,255,0.65)');
    register('building_greenhouse', c);
  }

  // Ruined Greenhouse (before bundle unlock)
  {
    const c = createCanvas(80, 64);
    const ctx = getCtx(c);
    fillRect(ctx, 4, 56, 72, 6, 'rgba(25,40,22,0.28)');
    // Stone foundation & crumbling wooden frame
    fillRect(ctx, 6, 22, 68, 34, '#8c7a65');
    fillRect(ctx, 10, 26, 60, 26, '#5c5247');
    // Pitched broken glass roof
    for (let r = 0; r < 14; r++) {
      const inset = Math.max(0, 14 - r);
      fillRect(ctx, 4 + inset, 8 + r, 72 - inset * 2, 1, r % 3 === 0 ? '#694326' : '#85b8c7');
    }
    // Missing dark holes in roof & shattered panes
    fillRect(ctx, 28, 12, 14, 9, '#3d332c');
    fillRect(ctx, 12, 26, 18, 22, '#7baebd');
    fillRect(ctx, 14, 28, 6, 8, '#a8d9e8');
    fillRect(ctx, 50, 26, 18, 22, '#7baebd');
    fillRect(ctx, 54, 30, 8, 10, '#3d332c');
    // Timber mullions
    fillRect(ctx, 6, 21, 68, 3, '#6b3f24');
    fillRect(ctx, 30, 24, 3, 30, '#6b3f24');
    fillRect(ctx, 47, 24, 3, 30, '#6b3f24');
    // Boarded-up wooden doorway
    fillRect(ctx, 33, 32, 14, 22, '#7d4d2a');
    fillRect(ctx, 32, 36, 16, 3, '#b8834d');
    fillRect(ctx, 32, 43, 16, 3, '#a6713f');
    // Climbing ivy vines
    fillRect(ctx, 8, 24, 5, 16, '#4c8f32');
    fillRect(ctx, 12, 30, 4, 10, '#68b344');
    fillRect(ctx, 63, 20, 6, 18, '#4c8f32');
    fillRect(ctx, 59, 25, 5, 8, '#78c94b');
    register('building_greenhouse_ruin', c);
  }

  // Town Blacksmith Forge (80x64)
  {
    const c = createCanvas(80, 64);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 56, 74, 6, 'rgba(25,35,20,0.3)');
    fillRect(ctx, 58, 2, 12, 26, '#575a61');
    fillRect(ctx, 6, 26, 68, 32, '#7d7a75');
    for (let y = 30; y < 56; y += 6) fillRect(ctx, 6, y, 68, 1, '#5e5c58');
    // Dark slate roof
    for (let r = 0; r < 18; r++) {
      const inset = Math.max(0, 12 - r);
      fillRect(ctx, 3 + inset, 8 + r, 74 - inset * 2, 1, r % 2 === 0 ? '#3c424d' : '#4e5563');
    }
    // Glowing forge door & anvil
    fillRect(ctx, 32, 38, 16, 20, '#3b2416');
    fillRect(ctx, 12, 38, 14, 12, '#291a14');
    fillRect(ctx, 14, 43, 10, 6, '#ff7b24');
    fillRect(ctx, 16, 45, 6, 3, '#ffe475');
    register('building_blacksmith', c);
  }

  // Community Center Hall (96x64)
  {
    const c = createCanvas(96, 64);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 56, 90, 6, 'rgba(25,36,20,0.28)');
    fillRect(ctx, 6, 26, 84, 32, '#edd8ae');
    fillRect(ctx, 6, 26, 4, 32, '#7d4a26');
    fillRect(ctx, 86, 26, 4, 32, '#7d4a26');
    for (let r = 0; r < 20; r++) {
      const inset = Math.max(0, 15 - r);
      fillRect(ctx, 2 + inset, 6 + r, 92 - inset * 2, 1, r % 2 === 0 ? '#2f7a56' : '#3e996c');
    }
    // Golden community star clock gable
    fillEllipse(ctx, 48, 19, 6, 6, '#f2c144');
    fillEllipse(ctx, 48, 19, 4, 4, '#fff7d4');
    // Grand double door
    fillRect(ctx, 38, 38, 20, 20, '#69391c');
    fillRect(ctx, 40, 40, 16, 18, '#a46434');
    fillRect(ctx, 47, 40, 2, 18, '#5c3016');
    register('building_community_center', c);
  }

  // Mine Cave Entrance Arch (48x32)
  {
    const c = createCanvas(48, 32);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 4, 44, 28, '#66635e');
    fillRect(ctx, 4, 2, 40, 6, '#827e78');
    // Timber support beams
    fillRect(ctx, 10, 10, 28, 4, '#7d4723');
    fillRect(ctx, 10, 10, 4, 22, '#7d4723');
    fillRect(ctx, 34, 10, 4, 22, '#7d4723');
    // Dark cave tunnel
    fillRect(ctx, 14, 14, 20, 18, '#1b1821');
    // Glowing lantern beside mine arch
    fillRect(ctx, 6, 16, 4, 5, '#ffe07d');
    register('mine_entrance', c);
  }

  // Chicken (16x16)
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 13, 4, 2, 'rgba(20,30,15,0.28)');
    fillEllipse(ctx, 8, 9, 4, 4, '#ffffff');
    fillRect(ctx, 6, 12, 1, 2, '#eb9c2d');
    fillRect(ctx, 9, 12, 1, 2, '#eb9c2d');
    fillRect(ctx, 7, 3, 2, 2, '#e03b3b'); // red comb
    px(ctx, 11, 7, '#f2a529'); // beak
    px(ctx, 9, 7, '#2b1a10'); // eye
    register('animal_chicken', c);
  }

  // Cow (20x18)
  {
    const c = createCanvas(20, 18);
    const ctx = getCtx(c);
    fillEllipse(ctx, 10, 15, 7, 2, 'rgba(20,30,15,0.28)');
    fillRect(ctx, 4, 6, 12, 8, '#ffffff');
    fillRect(ctx, 6, 7, 4, 4, '#3d332c'); // spot
    fillRect(ctx, 12, 9, 3, 3, '#3d332c');
    fillRect(ctx, 5, 13, 2, 3, '#4f433b');
    fillRect(ctx, 13, 13, 2, 3, '#4f433b');
    // Head + pink snout
    fillRect(ctx, 14, 4, 5, 6, '#ffffff');
    fillRect(ctx, 15, 8, 4, 3, '#f5b3bd');
    px(ctx, 16, 6, '#2b1a10');
    register('animal_cow', c);
  }

  // Sheep (18x16)
  {
    const c = createCanvas(18, 16);
    const ctx = getCtx(c);
    fillEllipse(ctx, 9, 13, 6, 2, 'rgba(20,30,15,0.28)');
    fillEllipse(ctx, 7, 8, 5, 4, '#f5f8fa');
    fillEllipse(ctx, 11, 8, 4, 4, '#ffffff');
    fillRect(ctx, 12, 6, 4, 4, '#594a42'); // cute dark face
    px(ctx, 14, 7, '#ffffff');
    fillRect(ctx, 5, 12, 2, 2, '#4a3d36');
    fillRect(ctx, 10, 12, 2, 2, '#4a3d36');
    register('animal_sheep', c);
  }
}

/* =========================================================
   7. INTERIOR APPLIANCES (TV, KITCHEN) & MINE SPRITES
   ========================================================= */
function bakeInteriorAppliancesAndMine(register: RegisterSpriteFn): void {
  // Retro Farmhouse TV (20x24)
  {
    const c = createCanvas(20, 24);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 21, 16, 2, 'rgba(30,16,8,0.3)');
    // Rabbit-ear antennas
    px(ctx, 6, 1, '#9da7b5');
    px(ctx, 7, 2, '#9da7b5');
    px(ctx, 13, 1, '#9da7b5');
    px(ctx, 12, 2, '#9da7b5');
    // Wooden cabinet
    fillRect(ctx, 2, 3, 16, 15, '#7a4420');
    fillRect(ctx, 3, 4, 14, 13, '#9c5b2e');
    // Glowing screen
    fillRect(ctx, 4, 5, 10, 9, '#5ec4f2');
    fillRect(ctx, 5, 6, 4, 3, '#b8ecff');
    fillRect(ctx, 4, 11, 10, 3, '#69b842');
    // Tuning dials
    px(ctx, 15, 7, '#f2c75c');
    px(ctx, 15, 10, '#f2c75c');
    // Legs
    fillRect(ctx, 4, 18, 2, 3, '#5c3116');
    fillRect(ctx, 14, 18, 2, 3, '#5c3116');
    register('interior_tv', c);
  }

  // Farmhouse Kitchen Stove & Counter (32x24)
  {
    const c = createCanvas(32, 24);
    const ctx = getCtx(c);
    fillRect(ctx, 1, 21, 30, 3, 'rgba(30,16,8,0.28)');
    fillRect(ctx, 2, 4, 28, 18, '#96582b');
    fillRect(ctx, 2, 3, 28, 4, '#d9d0be'); // countertop
    // Cast iron stove burners
    fillRect(ctx, 5, 4, 10, 4, '#3a3f47');
    fillEllipse(ctx, 8, 6, 2, 1, '#ff8529');
    fillEllipse(ctx, 13, 6, 2, 1, '#585f6b');
    // Simmering soup pot
    fillRect(ctx, 6, 0, 6, 5, '#b84235');
    fillRect(ctx, 7, 1, 4, 2, '#ffe07d');
    // Oven door & wooden drawer
    fillRect(ctx, 5, 10, 10, 10, '#494f59');
    fillRect(ctx, 7, 12, 6, 5, '#ff9c3b');
    fillRect(ctx, 18, 9, 10, 5, '#bd7b42');
    fillRect(ctx, 18, 15, 10, 5, '#bd7b42');
    px(ctx, 22, 11, '#f2c75c');
    px(ctx, 22, 17, '#f2c75c');
    register('interior_kitchen', c);
  }

  // Mine Floor Tiles (16x16)
  for (let v = 0; v < 2; v++) {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, v === 0 ? '#5c534c' : '#544c45');
    px(ctx, 3 + v * 4, 4, '#6e645c');
    px(ctx, 11 - v * 2, 11, '#423b36');
    px(ctx, 7, 13, '#6e645c');
    register(`mine_floor_${v}`, c);
  }

  // Mine Cavern Wall
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, '#2b262e');
    fillRect(ctx, 1, 1, 14, 10, '#423b47');
    fillRect(ctx, 2, 2, 6, 4, '#544b59');
    fillRect(ctx, 9, 5, 5, 5, '#544b59');
    register('mine_wall', c);
  }

  // Mine Ladders
  for (const [key, rail] of [
    ['mine_ladder', '#a66530'],
    ['mine_exit_ladder', '#e0a63b'],
  ] as const) {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 3, 2, 10, 12, '#141117');
    fillRect(ctx, 4, 1, 2, 14, rail);
    fillRect(ctx, 10, 1, 2, 14, rail);
    for (const ry of [3, 7, 11]) {
      fillRect(ctx, 5, ry, 6, 2, '#d49453');
    }
    register(key, c);
  }

  // Mine Ore & Gem Rock Nodes
  register('mine_rock_stone', buildMineRock('#787c82', '#9ba0a6', '#565a5e', null));
  register('mine_rock_copper', buildMineRock('#78726d', '#968f88', '#544f4b', '#e67d3c'));
  register('mine_rock_iron', buildMineRock('#6d737d', '#8e96a3', '#494e57', '#d2e2f2'));
  register('mine_rock_gold', buildMineRock('#787264', '#9c9482', '#524d42', '#ffd942'));
  register('mine_rock_gem', buildMineRock('#6a6278', '#8b809e', '#463f52', '#c86bff'));

  // Slimes (3 tiers x 2 bounce frames)
  const slimeThemes: [string, string, string, string][] = [
    ['green', '#369942', '#5ce06b', '#b8ffbf'],
    ['blue', '#2d6eb8', '#52a3f5', '#b8e0ff'],
    ['purple', '#7d36ad', '#b45ee8', '#e8b8ff'],
  ];
  for (const [name, dark, mid, hi] of slimeThemes) {
    for (let f = 0; f < 2; f++) {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillEllipse(ctx, 8, 13, 6, 2, 'rgba(0,0,0,0.32)');
      const sy = f === 0 ? 9 : 7;
      const rx = f === 0 ? 6 : 5;
      const ry = f === 0 ? 4 : 5;
      fillEllipse(ctx, 8, sy, rx, ry, dark);
      fillEllipse(ctx, 8, sy - 1, rx - 1, ry - 1, mid);
      px(ctx, 6, sy - 2, hi);
      // Cute angry eyes
      px(ctx, 6, sy, '#1c1218');
      px(ctx, 10, sy, '#1c1218');
      register(`slime_${name}_${f}`, c);
    }
  }
}

/* =========================================================
   8. BLACKSMITH CLINT NPC SPRITE & PORTRAIT
   ========================================================= */
function bakeClintNpc(register: RegisterSpriteFn): void {
  for (let frame = 0; frame < 3; frame++) {
    const c = createCanvas(16, 24);
    const ctx = getCtx(c);
    const bob = frame === 0 ? 0 : -1;
    fillEllipse(ctx, 8, 22, 5, 2, 'rgba(20, 32, 16, 0.3)');
    fillRect(ctx, 5, 19, 3, 3, '#3b2416');
    fillRect(ctx, 8, 19, 3, 3, '#3b2416');
    fillRect(ctx, 5, 16 + bob, 6, 4, '#474c54');
    fillRect(ctx, 4, 11 + bob, 8, 6, '#7a5032'); // leather apron
    fillRect(ctx, 5, 12 + bob, 6, 5, '#59361e');
    fillRect(ctx, 3, 12 + bob, 1, 4, '#f0c49b');
    fillRect(ctx, 12, 12 + bob, 1, 4, '#f0c49b');
    fillRect(ctx, 4, 4 + bob, 8, 7, '#f0c49b');
    fillRect(ctx, 3, 3 + bob, 10, 3, '#693c1e'); // brown hair
    fillRect(ctx, 5, 9 + bob, 6, 2, '#693c1e'); // sturdy beard
    px(ctx, 6, 7 + bob, '#2b180e');
    px(ctx, 9, 7 + bob, '#2b180e');
    register(`npc_clint_${frame}`, c);
  }

  // Portrait (24x24)
  {
    const c = createCanvas(24, 24);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 24, 24, '#e3c794');
    fillRect(ctx, 1, 1, 22, 22, '#f5e6c4');
    fillRect(ctx, 4, 17, 16, 7, '#7a5032');
    fillRect(ctx, 7, 18, 10, 6, '#59361e');
    fillRect(ctx, 7, 7, 10, 9, '#f0c49b');
    fillRect(ctx, 6, 4, 12, 4, '#693c1e');
    fillRect(ctx, 7, 13, 10, 4, '#693c1e'); // beard
    fillRect(ctx, 9, 10, 2, 2, '#2e1a10');
    fillRect(ctx, 13, 10, 2, 2, '#2e1a10');
    px(ctx, 9, 10, '#ffffff');
    px(ctx, 13, 10, '#ffffff');
    register('portrait_clint', c);
  }
}

/* ---------------- Helper factories ---------------- */

function buildOreSprite(mid: string, hi: string, dark: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 3, 6, 10, 7, '#63686e');
  fillRect(ctx, 4, 5, 8, 6, '#7f868f');
  fillRect(ctx, 5, 6, 3, 3, mid);
  px(ctx, 5, 6, hi);
  fillRect(ctx, 9, 8, 3, 3, mid);
  px(ctx, 10, 8, hi);
  px(ctx, 7, 11, dark);
  return c;
}

function buildBarSprite(mid: string, hi: string, dark: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 2, 7, 12, 5, dark);
  fillRect(ctx, 3, 5, 10, 5, mid);
  fillRect(ctx, 4, 6, 8, 2, hi);
  return c;
}

function buildGemSprite(mid: string, hi: string, dark: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 6, 2, 4, 12, mid);
  fillRect(ctx, 4, 4, 8, 8, mid);
  fillRect(ctx, 3, 6, 10, 4, mid);
  fillRect(ctx, 5, 4, 3, 4, hi);
  fillRect(ctx, 8, 9, 3, 3, dark);
  return c;
}

function buildSeedPacket(accent: string, leaf: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 3, 2, 10, 12, '#8b5c34');
  fillRect(ctx, 4, 3, 8, 10, '#e8c896');
  fillRect(ctx, 4, 3, 8, 2, '#d1ab72');
  fillRect(ctx, 6, 7, 4, 4, accent);
  fillRect(ctx, 7, 5, 2, 2, leaf);
  return c;
}

function buildFishSprite(body: string, belly: string, fin: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 2, 6, 3, 5, fin);
  fillEllipse(ctx, 9, 8, 5, 3, body);
  fillRect(ctx, 6, 9, 6, 2, belly);
  fillRect(ctx, 8, 4, 3, 2, fin);
  px(ctx, 12, 7, '#1c1210');
  return c;
}

function buildMineRock(base: string, hi: string, dark: string, vein: string | null): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillEllipse(ctx, 8, 13, 6, 2, 'rgba(0,0,0,0.32)');
  fillRect(ctx, 2, 6, 12, 7, base);
  fillRect(ctx, 3, 4, 10, 4, hi);
  fillRect(ctx, 2, 11, 12, 2, dark);
  if (vein) {
    fillRect(ctx, 4, 6, 3, 3, vein);
    fillRect(ctx, 9, 8, 3, 3, vein);
    fillRect(ctx, 7, 5, 2, 2, vein);
  }
  return c;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D offscreen canvas context');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string
): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
    }
  }
}
