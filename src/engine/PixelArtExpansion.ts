export type RegisterSpriteFn = (key: string, canvas: HTMLCanvasElement) => void;

/**
 * Modular pixel-art sprite generator for Milestone 2:
 * Farmhouse interior, customizable furniture, Sunmeadow Town buildings/props,
 * and Town NPC sprites + dialogue portraits.
 */
export function bakeInteriorAndTownSprites(register: RegisterSpriteFn): void {
  bakeInteriorSprites(register);
  bakeFurnitureSprites(register);
  bakeTownSprites(register);
  bakeNpcSpritesAndPortraits(register);
}

/* =========================================================
   1. FARMHOUSE INTERIOR TILES & FIXTURES
   ========================================================= */
function bakeInteriorSprites(register: RegisterSpriteFn): void {
  // Warm oak floorboards
  for (let v = 0; v < 2; v++) {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, v === 0 ? '#c9935a' : '#c28c53');
    for (let y = 0; y < 16; y += 4) {
      fillRect(ctx, 0, y, 16, 1, '#a97440');
      fillRect(ctx, 0, y + 1, 16, 1, '#d8a66e');
    }
    // Staggered plank joints
    fillRect(ctx, v === 0 ? 5 : 11, 0, 1, 4, '#9a6534');
    fillRect(ctx, v === 0 ? 12 : 4, 4, 1, 4, '#9a6534');
    fillRect(ctx, v === 0 ? 7 : 13, 8, 1, 4, '#9a6534');
    fillRect(ctx, v === 0 ? 3 : 9, 12, 1, 4, '#9a6534');
    register(`floor_wood_${v}`, c);
  }

  // Interior timber wall tile (16x16)
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, '#edd5a7');
    // Subtle vertical wallpaper stripes
    for (let x = 0; x < 16; x += 4) {
      fillRect(ctx, x, 0, 1, 12, '#e2c58f');
    }
    // Wainscoting wooden lower trim
    fillRect(ctx, 0, 10, 16, 6, '#9e6234');
    fillRect(ctx, 0, 10, 16, 1, '#c4864f');
    fillRect(ctx, 0, 15, 16, 1, '#613619');
    for (let x = 3; x < 16; x += 4) {
      fillRect(ctx, x, 11, 1, 4, '#7d4923');
    }
    register('wall_cabin', c);
  }

  // Interior sunlit window (24x20)
  {
    const c = createCanvas(24, 20);
    const ctx = getCtx(c);
    fillRect(ctx, 1, 1, 22, 18, '#6e3c1e');
    fillRect(ctx, 3, 3, 18, 14, '#8ed6f7');
    fillRect(ctx, 4, 4, 7, 5, '#cef2ff');
    // Distant meadow glimpse
    fillRect(ctx, 3, 12, 18, 5, '#76b84b');
    // Frame mullions
    fillRect(ctx, 11, 3, 2, 14, '#7a4523');
    fillRect(ctx, 3, 9, 18, 2, '#7a4523');
    // Curtains
    fillRect(ctx, 3, 3, 3, 14, '#e67c6a');
    fillRect(ctx, 18, 3, 3, 14, '#e67c6a');
    fillRect(ctx, 0, 18, 24, 2, '#995c2f');
    register('interior_window', c);
  }

  // Cozy crackling stone fireplace (32x34, 2 frames)
  for (let f = 0; f < 2; f++) {
    const c = createCanvas(32, 34);
    const ctx = getCtx(c);
    // Chimney stone body
    fillRect(ctx, 2, 0, 28, 32, '#8b837a');
    for (let y = 2; y < 30; y += 5) {
      fillRect(ctx, 3, y, 26, 1, '#6b645c');
      fillRect(ctx, 4 + ((y * 3) % 10), y + 1, 8, 3, '#a49c92');
    }
    // Wooden mantlepiece
    fillRect(ctx, 0, 10, 32, 4, '#8f5228');
    fillRect(ctx, 1, 10, 30, 1, '#c4834b');
    // Hearth opening
    fillRect(ctx, 7, 17, 18, 14, '#291a14');
    // Logs
    fillRect(ctx, 9, 27, 14, 3, '#6b3b1c');
    // Flickering flames
    fillRect(ctx, 11, 21 + f, 10, 7 - f, '#e85d24');
    fillRect(ctx, 13, 19 + (1 - f), 6, 8, '#ff9f2e');
    fillRect(ctx, 14 + f, 22, 4, 4, '#fff18c');
    // Stone hearth base
    fillRect(ctx, 1, 31, 30, 3, '#726b63');
    register(`interior_fireplace_${f}`, c);
  }

  // Farmhouse Cozy Bed (32x40)
  {
    const c = createCanvas(32, 40);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 36, 28, 3, 'rgba(35,18,8,0.28)');
    // Wooden headboard
    fillRect(ctx, 2, 2, 28, 12, '#7d4723');
    fillRect(ctx, 4, 4, 24, 8, '#a46434');
    fillRect(ctx, 2, 1, 4, 13, '#633519');
    fillRect(ctx, 26, 1, 4, 13, '#633519');
    // Cream pillow
    fillRect(ctx, 6, 9, 20, 7, '#f7f0de');
    fillRect(ctx, 7, 10, 18, 4, '#ffffff');
    // Cozy patchwork quilt (sage green & warm terracotta trim)
    fillRect(ctx, 3, 16, 26, 19, '#5e9947');
    fillRect(ctx, 3, 16, 26, 4, '#f0d8a8'); // folded sheet
    fillRect(ctx, 5, 22, 10, 5, '#7ab85d');
    fillRect(ctx, 17, 22, 10, 5, '#4b8038');
    fillRect(ctx, 5, 28, 10, 5, '#4b8038');
    fillRect(ctx, 17, 28, 10, 5, '#7ab85d');
    // Footboard
    fillRect(ctx, 2, 33, 28, 5, '#7d4723');
    fillRect(ctx, 3, 33, 26, 1, '#be7e46');
    register('interior_bed', c);
  }

  // Exit Doormat (32x16)
  {
    const c = createCanvas(32, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 2, 28, 12, '#7d4822');
    fillRect(ctx, 4, 4, 24, 8, '#c78c4e');
    fillRect(ctx, 6, 6, 20, 4, '#e3b374');
    register('doormat', c);
  }
}

/* =========================================================
   2. CUSTOMIZABLE FURNITURE SPRITES
   ========================================================= */
function bakeFurnitureSprites(register: RegisterSpriteFn): void {
  // Woven Rug (32x32)
  {
    const c = createCanvas(32, 32);
    const ctx = getCtx(c);
    fillRect(ctx, 1, 2, 30, 28, '#9e382e');
    fillRect(ctx, 3, 4, 26, 24, '#c94c3e');
    fillRect(ctx, 5, 6, 22, 20, '#f2d9a2');
    fillRect(ctx, 8, 9, 16, 14, '#c94c3e');
    fillRect(ctx, 12, 13, 8, 6, '#e8b658');
    // Fringe tassels
    for (let y = 4; y < 28; y += 3) {
      px(ctx, 0, y, '#f2d9a2');
      px(ctx, 31, y, '#f2d9a2');
    }
    register('furn_rug', c);
  }

  // Potted Plant (16x22)
  {
    const c = createCanvas(16, 22);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 19, 5, 2, 'rgba(35,20,10,0.28)');
    // Terracotta pot
    fillRect(ctx, 4, 13, 8, 7, '#c2653b');
    fillRect(ctx, 3, 12, 10, 2, '#db7d4f');
    fillRect(ctx, 5, 14, 2, 5, '#e69468');
    // Lush leaves
    fillRect(ctx, 6, 6, 4, 6, '#3c7a26');
    fillRect(ctx, 3, 5, 4, 4, '#5ba637');
    fillRect(ctx, 9, 4, 4, 4, '#5ba637');
    fillRect(ctx, 6, 2, 4, 5, '#78c94b');
    px(ctx, 7, 3, '#a4e870');
    register('furn_plant', c);
  }

  // Oak Bookshelf (32x26)
  {
    const c = createCanvas(32, 26);
    const ctx = getCtx(c);
    fillRect(ctx, 1, 23, 30, 3, 'rgba(35,20,10,0.28)');
    fillRect(ctx, 2, 2, 28, 22, '#6b3b1c');
    fillRect(ctx, 3, 3, 26, 20, '#96592d');
    // Shelves
    fillRect(ctx, 4, 5, 24, 7, '#4c2812');
    fillRect(ctx, 4, 14, 24, 7, '#4c2812');
    // Colorful books
    const topColors = ['#d94b43', '#4c8bc9', '#6ab547', '#e8b644', '#c9678d', '#4fa6a3'];
    for (let i = 0; i < 6; i++) {
      fillRect(ctx, 5 + i * 4, 6 + (i % 2), 3, 6 - (i % 2), topColors[i]);
    }
    const botColors = ['#e89c44', '#569c5e', '#d65c5c', '#5a7fc2', '#d9c26c'];
    for (let i = 0; i < 5; i++) {
      fillRect(ctx, 6 + i * 4, 15, 3, 6, botColors[i]);
    }
    fillRect(ctx, 2, 1, 28, 2, '#bd7c46');
    register('furn_bookshelf', c);
  }

  // Oak Side Table (16x18)
  {
    const c = createCanvas(16, 18);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 15, 6, 2, 'rgba(35,20,10,0.28)');
    // Legs
    fillRect(ctx, 3, 9, 2, 7, '#6e3d1d');
    fillRect(ctx, 11, 9, 2, 7, '#6e3d1d');
    // Tabletop
    fillRect(ctx, 1, 4, 14, 6, '#9e6032');
    fillRect(ctx, 2, 3, 12, 5, '#c9884f');
    fillRect(ctx, 3, 4, 10, 2, '#dea165');
    // Little teacup on table
    fillRect(ctx, 6, 3, 4, 3, '#f7f2e4');
    px(ctx, 7, 3, '#72b046');
    register('furn_table', c);
  }

  // Sunflower Ceramic Vase (16x20)
  {
    const c = createCanvas(16, 20);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 18, 5, 2, 'rgba(35,20,10,0.25)');
    // Vase
    fillRect(ctx, 5, 11, 6, 7, '#4d82b5');
    fillRect(ctx, 6, 9, 4, 3, '#6fa3d4');
    fillRect(ctx, 6, 12, 2, 4, '#95c4ed');
    // Stems & sunflower bloom
    fillRect(ctx, 7, 5, 2, 5, '#4c912d');
    fillRect(ctx, 5, 2, 6, 5, '#ffd23f');
    fillRect(ctx, 6, 3, 4, 3, '#75411c');
    px(ctx, 6, 2, '#fff08a');
    register('furn_vase', c);
  }

  // Warm Wooden Floor Lamp (16x22)
  {
    const c = createCanvas(16, 22);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 20, 5, 2, 'rgba(35,20,10,0.28)');
    // Stand
    fillRect(ctx, 5, 18, 6, 2, '#6b3b1c');
    fillRect(ctx, 7, 10, 2, 9, '#8c5228');
    // Warm lampshade
    fillRect(ctx, 3, 3, 10, 7, '#f5c767');
    fillRect(ctx, 4, 2, 8, 7, '#ffe08c');
    fillRect(ctx, 5, 4, 6, 4, '#fff6c7');
    fillRect(ctx, 3, 9, 10, 1, '#c98836');
    register('furn_lamp', c);
  }
}

/* =========================================================
   3. SUNMEADOW TOWN TILES, PROPS & BUILDINGS
   ========================================================= */
function bakeTownSprites(register: RegisterSpriteFn): void {
  // Town Square Sandstone Flagstones
  for (let v = 0; v < 2; v++) {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, '#c2ae8c');
    fillRect(ctx, 1, 1, 6, 6, v === 0 ? '#e6d7ba' : '#dfd0b2');
    fillRect(ctx, 9, 1, 6, 6, '#e2d2b4');
    fillRect(ctx, 1, 9, 6, 6, '#ddd0b6');
    fillRect(ctx, 9, 9, 6, 6, v === 0 ? '#e8dac0' : '#e0d1b3');
    register(`town_plaza_${v}`, c);
  }

  // Directional Wooden Signpost (16x16)
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 7, 8, 2, 7, '#6b3c1d');
    fillRect(ctx, 2, 3, 11, 5, '#b8763e');
    fillRect(ctx, 13, 4, 2, 3, '#b8763e');
    fillRect(ctx, 3, 4, 9, 1, '#dfa164');
    fillRect(ctx, 4, 6, 7, 1, '#5e3216');
    register('town_sign', c);
  }

  // Stone Village Fountain (48x48, 2 animated frames)
  for (let f = 0; f < 2; f++) {
    const c = createCanvas(48, 48);
    const ctx = getCtx(c);
    fillEllipse(ctx, 24, 37, 22, 9, 'rgba(30, 35, 22, 0.28)');
    // Outer stone basin
    fillEllipse(ctx, 24, 31, 21, 12, '#8b8a82');
    fillEllipse(ctx, 24, 29, 20, 11, '#b6b4ab');
    // Shimmering basin water
    fillEllipse(ctx, 24, 29, 16, 8, '#469ad1');
    fillEllipse(ctx, 24, 28, 13, 6, '#64b8eb');
    // Ripples
    fillRect(ctx, 14 + f * 2, 29, 5, 1, '#bcebff');
    fillRect(ctx, 28 - f * 2, 31, 6, 1, '#bcebff');
    // Center carved pedestal
    fillRect(ctx, 20, 12, 8, 18, '#a6a49b');
    fillRect(ctx, 21, 12, 3, 17, '#cbc9c0');
    fillEllipse(ctx, 24, 13, 9, 4, '#b8b6ad');
    fillEllipse(ctx, 24, 12, 7, 3, '#64b8eb');
    // Water spout arc
    fillRect(ctx, 23, 5 + f, 2, 7, '#bcebff');
    px(ctx, 19, 9 + f, '#9be0ff');
    px(ctx, 28, 9 + f, '#9be0ff');
    px(ctx, 17, 15 + (1 - f), '#bcebff');
    px(ctx, 30, 15 + (1 - f), '#bcebff');
    register(`town_fountain_${f}`, c);
  }

  // Park Bench (32x16)
  {
    const c = createCanvas(32, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 2, 13, 28, 2, 'rgba(25,35,20,0.28)');
    fillRect(ctx, 4, 8, 3, 6, '#4d3a2c');
    fillRect(ctx, 25, 8, 3, 6, '#4d3a2c');
    fillRect(ctx, 2, 3, 28, 3, '#b8763e');
    fillRect(ctx, 2, 3, 28, 1, '#dba062');
    fillRect(ctx, 2, 8, 28, 3, '#a36432');
    fillRect(ctx, 2, 8, 28, 1, '#cf8f53');
    register('town_bench', c);
  }

  // Town Lamppost (16x32)
  {
    const c = createCanvas(16, 32);
    const ctx = getCtx(c);
    fillEllipse(ctx, 8, 30, 4, 2, 'rgba(20,30,18,0.3)');
    fillRect(ctx, 6, 26, 4, 4, '#3d424a');
    fillRect(ctx, 7, 10, 2, 17, '#4f5560');
    fillRect(ctx, 4, 4, 8, 6, '#3d424a');
    fillRect(ctx, 5, 5, 6, 4, '#ffe184');
    fillRect(ctx, 6, 6, 4, 2, '#fff9d1');
    fillRect(ctx, 5, 2, 6, 2, '#3d424a');
    register('town_lamp', c);
  }

  // Brick Flowerbed (16x16)
  {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);
    fillRect(ctx, 0, 0, 16, 16, '#9c5a3c');
    fillRect(ctx, 1, 1, 14, 14, '#5e3c24');
    fillRect(ctx, 2, 2, 12, 12, '#4f9430');
    // Colorful tulips & daisies
    fillRect(ctx, 3, 4, 3, 3, '#ff8cb0');
    px(ctx, 4, 5, '#ffe066');
    fillRect(ctx, 9, 3, 3, 3, '#ffe266');
    px(ctx, 10, 4, '#e88b23');
    fillRect(ctx, 6, 9, 3, 3, '#9bd6ff');
    px(ctx, 7, 10, '#fff7cc');
    register('town_flowerbed', c);
  }

  // Town Notice Board (32x28)
  {
    const c = createCanvas(32, 28);
    const ctx = getCtx(c);
    fillRect(ctx, 5, 16, 3, 10, '#6b3b1c');
    fillRect(ctx, 24, 16, 3, 10, '#6b3b1c');
    fillRect(ctx, 2, 4, 28, 15, '#7a4522');
    fillRect(ctx, 4, 6, 24, 11, '#c48d52');
    // Pinned paper notes
    fillRect(ctx, 6, 8, 6, 7, '#fff4d4');
    fillRect(ctx, 14, 7, 6, 6, '#f5e1b3');
    fillRect(ctx, 21, 9, 5, 6, '#fff4d4');
    px(ctx, 8, 8, '#c94338');
    px(ctx, 16, 7, '#4c8bc9');
    // Little roof
    fillRect(ctx, 1, 2, 30, 3, '#9e4733');
    register('town_notice_board', c);
  }

  // Pierre's General Store (96x72)
  register(
    'building_store',
    buildTownBuilding({
      roofDark: '#2f5278',
      roofMid: '#436e9e',
      roofLight: '#5a89bd',
      wallBase: '#f0dcb6',
      wallLine: '#d9be8f',
      awningA: '#3e8c4b',
      awningB: '#f7ead0',
      signAccent: '#f2b729',
    })
  );

  // Robin's Carpenter Workshop (96x72)
  register(
    'building_carpenter',
    buildTownBuilding({
      roofDark: '#3c6b35',
      roofMid: '#518a46',
      roofLight: '#68a65a',
      wallBase: '#c98e55',
      wallLine: '#a86e39',
      awningA: '#b84c35',
      awningB: '#f2d9a2',
      signAccent: '#73b046',
    })
  );
}

/* =========================================================
   4. TOWN NPC SPRITES (16x24) & PORTRAITS (24x24)
   ========================================================= */
function bakeNpcSpritesAndPortraits(register: RegisterSpriteFn): void {
  const specs = [
    {
      id: 'emily',
      hair: '#2c8cc4',
      hairLight: '#5ab4e6',
      skin: '#f7d1ab',
      shirt: '#e85d68',
      accent: '#f7d87c',
      pants: '#455a8c',
      glasses: false,
    },
    {
      id: 'pierre',
      hair: '#784421',
      hairLight: '#9c5d33',
      skin: '#f2c49b',
      shirt: '#f2ead8',
      accent: '#4d9142', // green shopkeeper apron
      pants: '#574a3e',
      glasses: true,
    },
    {
      id: 'robin',
      hair: '#d95b26',
      hairLight: '#f28246',
      skin: '#f7cda6',
      shirt: '#d99a4e',
      accent: '#8c4427', // carpenter tool belt
      pants: '#3f6394',
      glasses: false,
    },
  ];

  for (const s of specs) {
    // Standing & walking frames
    for (let frame = 0; frame < 3; frame++) {
      const c = createCanvas(16, 24);
      const ctx = getCtx(c);
      const bob = frame === 0 ? 0 : -1;
      const lOff = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      const rOff = -lOff;

      fillEllipse(ctx, 8, 22, 5, 2, 'rgba(20, 32, 16, 0.3)');
      // Boots / pants
      fillRect(ctx, 5, 19 + Math.max(0, lOff), 3, 3, '#4f2c16');
      fillRect(ctx, 8, 19 + Math.max(0, rOff), 3, 3, '#4f2c16');
      fillRect(ctx, 5, 16 + bob, 6, 4, s.pants);
      // Shirt / outfit
      fillRect(ctx, 4, 11 + bob, 8, 6, s.shirt);
      fillRect(ctx, 5, 13 + bob, 6, 4, s.accent);
      // Arms
      fillRect(ctx, 3, 12 + bob, 1, 4, s.skin);
      fillRect(ctx, 12, 12 + bob, 1, 4, s.skin);
      // Head
      fillRect(ctx, 4, 4 + bob, 8, 7, s.skin);
      // Hair
      fillRect(ctx, 3, 2 + bob, 10, 4, s.hair);
      fillRect(ctx, 4, 2 + bob, 8, 2, s.hairLight);
      fillRect(ctx, 3, 5 + bob, 1, 4, s.hair);
      fillRect(ctx, 12, 5 + bob, 1, 4, s.hair);
      // Eyes & optional glasses
      px(ctx, 6, 8 + bob, '#2b180e');
      px(ctx, 9, 8 + bob, '#2b180e');
      if (s.glasses) {
        fillRect(ctx, 5, 7 + bob, 3, 3, 'rgba(180,230,255,0.45)');
        fillRect(ctx, 8, 7 + bob, 3, 3, 'rgba(180,230,255,0.45)');
        px(ctx, 6, 8 + bob, '#2b180e');
        px(ctx, 9, 8 + bob, '#2b180e');
      } else {
        px(ctx, 5, 9 + bob, '#eba08e');
        px(ctx, 10, 9 + bob, '#eba08e');
      }

      register(`npc_${s.id}_${frame}`, c);
    }

    // Crisp 24x24 Dialogue Portrait
    {
      const c = createCanvas(24, 24);
      const ctx = getCtx(c);
      // Warm sunlit portrait backdrop
      fillRect(ctx, 0, 0, 24, 24, '#e3c794');
      fillRect(ctx, 1, 1, 22, 22, '#f5e6c4');
      // Shoulders
      fillRect(ctx, 4, 17, 16, 7, s.shirt);
      fillRect(ctx, 6, 19, 12, 5, s.accent);
      // Neck & Face
      fillRect(ctx, 10, 15, 4, 3, s.skin);
      fillRect(ctx, 7, 7, 10, 9, s.skin);
      // Hair
      fillRect(ctx, 5, 3, 14, 5, s.hair);
      fillRect(ctx, 7, 4, 10, 2, s.hairLight);
      fillRect(ctx, 5, 7, 2, 7, s.hair);
      fillRect(ctx, 17, 7, 2, 7, s.hair);
      // Eyes & warm smile
      fillRect(ctx, 9, 10, 2, 2, '#2e1a10');
      fillRect(ctx, 13, 10, 2, 2, '#2e1a10');
      px(ctx, 9, 10, '#ffffff');
      px(ctx, 13, 10, '#ffffff');
      if (s.glasses) {
        fillRect(ctx, 8, 9, 4, 1, '#5e493a');
        fillRect(ctx, 12, 9, 4, 1, '#5e493a');
        fillRect(ctx, 8, 12, 4, 1, '#5e493a');
        fillRect(ctx, 12, 12, 4, 1, '#5e493a');
      }
      fillRect(ctx, 8, 12, 1, 1, '#e89687');
      fillRect(ctx, 15, 12, 1, 1, '#e89687');
      fillRect(ctx, 10, 14, 4, 1, '#a65341');

      register(`portrait_${s.id}`, c);
    }
  }
}

/* ---------------- Internal helpers ---------------- */

interface BuildingTheme {
  roofDark: string;
  roofMid: string;
  roofLight: string;
  wallBase: string;
  wallLine: string;
  awningA: string;
  awningB: string;
  signAccent: string;
}

function buildTownBuilding(theme: BuildingTheme): HTMLCanvasElement {
  const c = createCanvas(96, 72);
  const ctx = getCtx(c);

  fillRect(ctx, 4, 62, 88, 7, 'rgba(26, 36, 18, 0.28)');

  // Walls
  fillRect(ctx, 6, 30, 84, 35, theme.wallBase);
  for (let y = 35; y < 64; y += 5) {
    fillRect(ctx, 6, y, 84, 1, theme.wallLine);
  }
  fillRect(ctx, 6, 30, 4, 35, '#6b3c1d');
  fillRect(ctx, 86, 30, 4, 35, '#6b3c1d');
  // Stone base
  fillRect(ctx, 5, 59, 86, 6, '#7f7a72');

  // Roof
  for (let row = 0; row < 24; row++) {
    const inset = Math.max(0, 14 - row);
    const y = 7 + row;
    const xStart = 2 + inset;
    const width = 92 - inset * 2;
    const col = row % 4 === 0 ? theme.roofDark : row % 2 === 0 ? theme.roofMid : theme.roofLight;
    fillRect(ctx, xStart, y, width, 1, col);
  }
  fillRect(ctx, 2, 30, 92, 3, '#4f2c15');

  // Striped shop awning
  for (let i = 0; i < 10; i++) {
    fillRect(ctx, 10 + i * 7, 36, 7, 6, i % 2 === 0 ? theme.awningA : theme.awningB);
  }

  // Entrance door
  fillRect(ctx, 40, 45, 16, 20, '#593017');
  fillRect(ctx, 42, 47, 12, 18, '#8d5129');
  fillRect(ctx, 44, 49, 8, 7, '#99dcf7');
  px(ctx, 52, 57, '#ffd24c');

  // Shopfront display windows
  for (const wx of [14, 64]) {
    fillRect(ctx, wx, 45, 18, 12, '#633519');
    fillRect(ctx, wx + 1, 46, 16, 10, '#8dd5f5');
    fillRect(ctx, wx + 2, 47, 5, 4, '#cff2ff');
    fillRect(ctx, wx + 8, 46, 2, 10, '#633519');
  }

  // Hanging shop sign emblem on roof gable
  fillRect(ctx, 36, 18, 24, 10, '#6b3c1d');
  fillRect(ctx, 38, 20, 20, 6, '#f6e4bc');
  fillRect(ctx, 41, 22, 14, 2, theme.signAccent);

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
