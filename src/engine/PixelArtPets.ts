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
