import type { RegisterSpriteFn } from './PixelArtExpansion';
import type { SpriteAtlas } from './SpriteAtlas';

/**
 * Asynchronously upgrades both companion cats' portraits and all 5 animation frames
 * with high-fidelity pixel-art PNGs crafted directly from the real WeChat photo & video!
 */
export async function loadRealCatSpriteAssets(atlas: SpriteAtlas): Promise<void> {
  if (typeof Image === 'undefined') return;

  const base = (import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/');
  const entries: [string, string][] = [
    ['portrait_pet_cat_maine_silver', `${base}assets/pets/portrait_maine.png`],
    ['pet_cat_maine_silver_idle_0', `${base}assets/pets/maine_idle_0.png`],
    ['pet_cat_maine_silver_idle_1', `${base}assets/pets/maine_idle_1.png`],
    ['pet_cat_maine_silver_walk_0', `${base}assets/pets/maine_walk_0.png`],
    ['pet_cat_maine_silver_walk_1', `${base}assets/pets/maine_walk_1.png`],
    ['pet_cat_maine_silver_sleep', `${base}assets/pets/maine_sleep.png`],

    ['portrait_pet_cat_bicolor_tabby', `${base}assets/pets/portrait_bicolor.png`],
    ['pet_cat_bicolor_tabby_idle_0', `${base}assets/pets/bicolor_idle_0.png`],
    ['pet_cat_bicolor_tabby_idle_1', `${base}assets/pets/bicolor_idle_1.png`],
    ['pet_cat_bicolor_tabby_walk_0', `${base}assets/pets/bicolor_walk_0.png`],
    ['pet_cat_bicolor_tabby_walk_1', `${base}assets/pets/bicolor_walk_1.png`],
    ['pet_cat_bicolor_tabby_sleep', `${base}assets/pets/bicolor_sleep.png`],
  ];

  await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        await atlas.loadImage(key, url);
      } catch {
        // Keep synchronous procedural fallback if running offline/headless
      }
    })
  );
}

export function bakePetSprites(register: RegisterSpriteFn): void {
  registerCat(register, 'cat_maine_silver', {"a": "#444149", "b": "#69666a", "c": "#919094", "d": "#b3afb0", "e": "#d9d4cb", "f": "#f6ecda", "g": "#bc8e87", "h": "#e4b5a5", "i": "#819576", "j": "#b4c595", "k": "#36332f", "l": "#97695b", "m": "#c5bcae"}, [
    ["................................",
     "...a........................a...",
     "...aa......................aa...",
     "...aaaa..................aaaa...",
     "...acaaa................aaaca...",
     "....ceaaa..............aaaec....",
     "....ceeaa..............aaeec....",
     "....ageeaa............aaeega....",
     "....aggecaa...aaaa...aacegga....",
     "....aghgecaaaaaccaaaaaceghga....",
     "....acghgeccbbbddbbbcceghgca....",
     ".....cghggeddbbddbbddegghgc.....",
     ".....cggeedbdbbddbbdbdeeggc.....",
     ".....agebbbbbdbbbbdbbbbbega.....",
     ".....aedddbbbdbbbbdbbbdddea.....",
     ".....acddddbbbddddbbbddddca.....",
     "....aacdkkkkddbddbddkkkkdcaa....",
     "....ackifikikddddddkikifikca....",
     "...aacckiikikddeeddkikiikccaa...",
     "...abbckjjjikddeeddkijjjkcbba...",
     "..acacbbkikkeddeeddekkikbbcaca..",
     ".aaaaccceeeeeeeeeeeeeeeecccaaaa.",
     "...abbbbceeeeffffffeeeecbbbba...",
     "...caaccceffffllllffffecccaac...",
     "..aaaaceeefmfffllfffmfeeecaaaa..",
     ".....ccccmffffffffffffmcccc.....",
     ".....aaaacfffffbbfffffcaaaa.....",
     ".........aaemmfeefmmeaa.........",
     "...........aeemmmmeea...........",
     "............aaaaaaaa............",
     "................................",
     "................................"],
    ["................................",
     "...a........................a...",
     "...aa......................aa...",
     "...aaaa..................aaaa...",
     "...acaaa................aaaca...",
     "....ceaaa..............aaaec....",
     "....ceeaa..............aaeec....",
     "....ageeaa............aaeega....",
     "....aggecaa...aaaa...aacegga....",
     "....aghgecaaaaaccaaaaaceghga....",
     "....acghgeccbbbddbbbcceghgca....",
     ".....cghggeddbbddbbddegghgc.....",
     ".....cggeedbdbbddbbdbdeeggc.....",
     ".....agebbbbbdbbbbdbbbbbega.....",
     ".....aedddbbbdbbbbdbbbdddea.....",
     ".....acddddbbbddddbbbddddca.....",
     "....aacdddddddbddbdddddddcaa....",
     "....accddddddddddddddddddcca....",
     "...aaccbdddbbddeeddbbdddbccaa...",
     "...abbceaaaedddeedddeaaaecbba...",
     "..acacbbeeeeeddeeddeeeeebbcaca..",
     ".aaaaccceeeeeeeeeeeeeeeecccaaaa.",
     "...abbbbceeeeffffffeeeecbbbba...",
     "...caaccceffffllllffffecccaac...",
     "..aaaaceeefmfffllfffmfeeecaaaa..",
     ".....ccccmffffffffffffmcccc.....",
     ".....aaaacfffffbbfffffcaaaa.....",
     ".........aaemmfeefmmeaa.........",
     "...........aeemmmmeea...........",
     "............aaaaaaaa............",
     "................................",
     "................................"]
  ]);
  registerCat(register, 'cat_bicolor_tabby', {"a": "#45392e", "b": "#594432", "c": "#71523b", "d": "#96734f", "e": "#b89368", "f": "#d3be9d", "g": "#e5ddc9", "h": "#f4eede", "i": "#e0c185", "j": "#a78043", "k": "#322923", "l": "#a87962", "m": "#ce9781", "n": "#bf9281", "o": "#8e6a50", "p": "#cbb8a5"}, [
    [
        "................................",
        "................................",
        "............................a...",
        "...........................aa...",
        "...a.....................aaca...",
        "...aca..................aabca...",
        "....cbca...............acbbca...",
        "....abobaa...........aacbobc....",
        "....acoobcaaaaaaaaaaaccbobba....",
        "....acbooobccccbbbccccbobbca....",
        ".....cbobbbbbddbbccccccbbbca....",
        ".....acbbbbbbddbbcccbcccbbca....",
        ".....acbbbbdbddbdccdcbbbbbca....",
        ".....acddbbdbdbbddddddbbbbca....",
        "....accdddbbggbdddaaadddccbca...",
        "....acdaaadbggbddfkkjadddccca...",
        "...aacfkkjadhgddajkkkabbbbccca..",
        "...abajkkkaghggddjkkjaddbbbcca..",
        "..aacdjkkjaghhgddaijaadddbbbba..",
        "..accdaijaaghhgddddaddddddcccc..",
        "..accbbbadgghhgddddddddddccbbca.",
        ".acbbcccdghhhhhhggddddddcbbccca.",
        ".accccccghlmmmlhhhhhgdcccccccaa.",
        "..acccccghhlllhhhhhhgcccccccca..",
        "..accccghphhahhhhhpppgccccccaa..",
        "...acccgghhhaghhhhaggccccccaa...",
        "...aaaccghhhaaaaaaggcccccaa.....",
        "......aagggggaamaaccccccaa......",
        "........aagggannacccccaa........",
        "..........agggacccccaaa.........",
        "............aaaaaaaaa...........",
        "................................"
    ],
    [
        "................................",
        "................................",
        "............................a...",
        "...........................aa...",
        "...a.....................aaca...",
        "...aca..................aabca...",
        "....cbca...............acbbca...",
        "....abobaa...........aacbobc....",
        "....acoobcaaaaaaaaaaaccbobba....",
        "....acbooobccccbbbccccbobbca....",
        ".....cbobbbbbddbbccccccbbbca....",
        ".....acbbbbbbddbbcccbcccbbca....",
        ".....acbbbbdbddbdccdcbbbbbca....",
        ".....acddbbdbdbbddddddbbbbca....",
        "....accdddbbggbdddddddddccbca...",
        "....acdddddbggbddddddddddccca...",
        "...aacbbddddhgddddddddabbbccca..",
        "...abbdddddghggdaaddaaddbbbcca..",
        "..aacadddaaghhgdddaadddddbbbba..",
        "..accdaaaddghhgdddddddddddcccc..",
        "..accbbbddgghhgddddddddddccbbca.",
        ".acbbcccdghhhhhhggddddddcbbccca.",
        ".accccccghlmmmlhhhhhgdcccccccaa.",
        "..acccccghhlllhhhhhhgcccccccca..",
        "..accccghphhahhhhhpppgccccccaa..",
        "...acccgghhhaghhhhaggccccccaa...",
        "...aaaccghhhaaaaaaggcccccaa.....",
        "......aagggggaamaaccccccaa......",
        "........aagggannacccccaa........",
        "..........agggacccccaaa.........",
        "............aaaaaaaaa...........",
        "................................"
    ]
]);
  bakePetWaterBowl(register);
  bakeBirthdayWorldProps(register);
}

function registerCat(register: RegisterSpriteFn, breed: string, palette: Record<string, string>, faces: string[][]): void {
  for (const pose of ['idle_0', 'idle_1', 'walk_0', 'walk_1', 'sleep', 'portrait']) {
    const canvas = createCanvas(32, 32);
    const ctx = getCtx(canvas);
    const rows = faces[pose === 'idle_1' || pose === 'sleep' ? 1 : 0]!;
    rows.forEach((row, y) => Array.from(row).forEach((pixel, x) => {
      if (pixel !== '.') px(ctx, x, y - Number(pose === 'walk_1'), palette[pixel]!);
    }));
    register(pose === 'portrait' ? 'portrait_pet_' + breed : 'pet_' + breed + '_' + pose, canvas);
  }
}

function bakePetWaterBowl(register: RegisterSpriteFn): void {
  const drawBowl = (filled: boolean): HTMLCanvasElement => {
    const c = createCanvas(16, 16);
    const ctx = getCtx(c);

    // Wooden coaster mat beneath bowl
    fillRect(ctx, 1, 4, 14, 10, '#784826');
    fillRect(ctx, 2, 5, 12, 8, '#a66b3a');
    fillRect(ctx, 2, 5, 12, 1, '#c48652');
    fillRect(ctx, 2, 12, 12, 1, '#5c341a');

    // Stone/ceramic pet water bowl rim
    fillEllipse(ctx, 8, 9, 5, 4, '#59423a');
    fillEllipse(ctx, 8, 8, 5, 3, '#c7b5a3');
    fillEllipse(ctx, 8, 8, 4, 2, filled ? '#3897d6' : '#57433b');

    if (filled) {
      // Sparkling fresh water glint!
      fillRect(ctx, 6, 7, 4, 1, '#6cc7f5');
      px(ctx, 6, 7, '#d9f6ff');
      px(ctx, 10, 8, '#9ce0ff');
    } else {
      // Dry empty interior shading
      fillRect(ctx, 6, 8, 4, 1, '#40302a');
    }

    // Tiny cute paw emblem on front rim
    px(ctx, 7, 11, '#8c6958');
    px(ctx, 8, 11, '#8c6958');
    return c;
  };

  register('pet_bowl_empty', drawBowl(false));
  register('pet_bowl_full', drawBowl(true));
}

/**
 * Handcrafted in-world pixel props for Yiyi's organic 12.03 Birthday Easter Egg:
 * - Outdoor porch mailbox (unread with raised red flag vs read)
 * - Indoor lace-draped oak cake table with 3-candle strawberry birthday cake (2 lit flicker frames + blown out)
 */
function bakeBirthdayWorldProps(register: RegisterSpriteFn): void {
  // 1. Porch Mailbox (16x22)
  const drawMailbox = (unread: boolean): HTMLCanvasElement => {
    const c = createCanvas(16, 22);
    const ctx = getCtx(c);

    // Ground shadow
    fillEllipse(ctx, 8, 20, 5, 2, 'rgba(24, 34, 22, 0.28)');

    // Sturdy wooden post
    fillRect(ctx, 6, 10, 4, 10, '#6e3f20');
    fillRect(ctx, 7, 10, 2, 10, '#995c30');
    fillRect(ctx, 5, 18, 6, 2, '#542e15');

    // Classic Stardew curved country mailbox top
    fillRect(ctx, 3, 4, 10, 7, '#4f6d8a');
    fillRect(ctx, 4, 3, 8, 2, '#698db0');
    fillRect(ctx, 4, 5, 8, 5, '#7da3c7');
    fillRect(ctx, 4, 4, 7, 1, '#a9cbe8');
    // Front door rim + mail slot
    fillRect(ctx, 3, 5, 3, 5, '#3b5269');
    fillRect(ctx, 4, 6, 1, 3, '#d9e8f5');
    // Little wooden bracket
    fillRect(ctx, 4, 11, 8, 1, '#5c3318');

    if (unread) {
      // Raised red mailbox flag!
      fillRect(ctx, 12, 2, 1, 6, '#b82a3b');
      fillRect(ctx, 12, 2, 3, 2, '#f04d63');
      px(ctx, 13, 2, '#ff9aa8');
    } else {
      // Lowered flag resting along side
      fillRect(ctx, 10, 8, 4, 1, '#a83344');
      px(ctx, 13, 7, '#d9485b');
    }

    return c;
  };

  register('farm_mailbox_unread', drawMailbox(true));
  register('farm_mailbox_read', drawMailbox(false));

  // 2. Indoor Strawberry Birthday Cake Table (32x26)
  const drawCakeTable = (litFrame: -1 | 0 | 1): HTMLCanvasElement => {
    const c = createCanvas(32, 26);
    const ctx = getCtx(c);

    // Warm shadow under table legs
    fillEllipse(ctx, 16, 23, 13, 2, 'rgba(35, 18, 8, 0.28)');

    // Four oak table legs
    fillRect(ctx, 4, 16, 3, 8, '#6e3d1e');
    fillRect(ctx, 5, 16, 1, 8, '#9c5c30');
    fillRect(ctx, 25, 16, 3, 8, '#6e3d1e');
    fillRect(ctx, 26, 16, 1, 8, '#9c5c30');
    fillRect(ctx, 7, 17, 2, 5, '#593016');
    fillRect(ctx, 23, 17, 2, 5, '#593016');

    // Tabletop wood base
    fillRect(ctx, 2, 10, 28, 7, '#7d4623');
    fillRect(ctx, 3, 11, 26, 5, '#b3713c');
    fillRect(ctx, 3, 11, 26, 1, '#d6955c');

    // Cream & blush-rose scalloped runner cloth across center
    fillRect(ctx, 6, 11, 20, 6, '#fff3e6');
    fillRect(ctx, 7, 12, 18, 4, '#ffdbe6');
    fillRect(ctx, 6, 17, 20, 1, '#f0a8bf');
    for (let x = 7; x <= 24; x += 3) {
      px(ctx, x, 18, '#fff5ec');
    }

    // Little pink-wrapped gift box on left side of table
    fillRect(ctx, 4, 9, 5, 4, '#e8688c');
    fillRect(ctx, 6, 9, 1, 4, '#ffe57d');
    fillRect(ctx, 4, 10, 5, 1, '#ffe57d');
    px(ctx, 6, 8, '#ffe57d');

    // Tiny rosebud in mini glass on right side
    fillRect(ctx, 25, 10, 3, 3, '#c8e9f5');
    px(ctx, 26, 9, '#4c993c');
    fillRect(ctx, 25, 7, 3, 2, '#f0567a');
    px(ctx, 26, 7, '#ffa8be');

    // 2-tier Strawberry Cream Birthday Cake on golden plate in center!
    fillRect(ctx, 10, 12, 12, 2, '#e6b85c');
    fillRect(ctx, 11, 12, 10, 1, '#fff0b3');
    // Lower cake tier
    fillRect(ctx, 11, 8, 10, 4, '#f7a6be');
    fillRect(ctx, 11, 8, 10, 2, '#fff9f0');
    px(ctx, 12, 10, '#fff9f0');
    px(ctx, 15, 10, '#fff9f0');
    px(ctx, 19, 10, '#fff9f0');
    // Upper cake tier + strawberry dots
    fillRect(ctx, 13, 5, 6, 3, '#ffc2d4');
    fillRect(ctx, 13, 5, 6, 1, '#ffffff');
    px(ctx, 13, 6, '#e03c58');
    px(ctx, 18, 6, '#e03c58');

    // Three birthday candles (1 · 2 · 3)
    const candleXs = [14, 16, 18];
    for (let i = 0; i < candleXs.length; i++) {
      const cx = candleXs[i];
      const topY = i === 1 ? 2 : 3;
      fillRect(ctx, cx, topY, 1, 5 - topY, '#fff5f8');
      px(ctx, cx, topY + 1, '#ff7aa8');

      if (litFrame >= 0) {
        const flicker = (litFrame + i) % 2;
        px(ctx, cx, topY - 1, '#ff9838');
        px(ctx, cx + (flicker === 0 ? 0 : 0), topY - 2, '#fff07c');
        if (flicker === 1) {
          px(ctx, cx, topY - 1, '#ffe66d');
        }
      } else {
        // Soft silvery wish wisp rising after blowing out candles!
        px(ctx, cx, topY - 1, 'rgba(235, 228, 255, 0.7)');
        px(ctx, cx + (i % 2 === 0 ? -1 : 1), topY - 2, 'rgba(255, 232, 245, 0.45)');
      }
    }

    return c;
  };

  register('interior_cake_table_lit_0', drawCakeTable(0));
  register('interior_cake_table_lit_1', drawCakeTable(1));
  register('interior_cake_table_blown', drawCakeTable(-1));
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function getCtx(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
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
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
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
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx + 0.01) + (dy * dy) / (ry * ry + 0.01) <= 1) {
        ctx.fillRect(Math.floor(cx + dx), Math.floor(cy + dy), 1, 1);
      }
    }
  }
}
