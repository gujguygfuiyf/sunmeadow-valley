import {
  BOUQUET_CATALOG,
  BOUQUET_IDS,
  type BouquetBalloonTheme,
  type BouquetDef,
  type BouquetWrapTheme,
} from '../data/bouquets';
import type { RegisterSpriteFn } from './PixelArtExpansion';

interface WrapPalette {
  dark: string;
  mid: string;
  light: string;
  hi: string;
  rim: string;
}

const WRAP_PALETTES: Record<BouquetWrapTheme, WrapPalette> = {
  white: {
    dark: '#bfb8ad',
    mid: '#e6e0d6',
    light: '#f7f4ee',
    hi: '#ffffff',
    rim: '#8a8278',
  },
  black: {
    dark: '#141418',
    mid: '#24242b',
    light: '#3a3b45',
    hi: '#5d5f6e',
    rim: '#0b0b0e',
  },
  purple: {
    dark: '#82648f',
    mid: '#a887b5',
    light: '#ccb0d6',
    hi: '#f2e8f5',
    rim: '#593e66',
  },
  ice_blue: {
    dark: '#9bbcd6',
    mid: '#c4e0f5',
    light: '#e8f5ff',
    hi: '#ffffff',
    rim: '#6b94b5',
  },
  blush_white: {
    dark: '#cfb8bf',
    mid: '#eddce2',
    light: '#faf0f3',
    hi: '#ffffff',
    rim: '#9c8089',
  },
  pearl_white: {
    dark: '#c2c8db',
    mid: '#e1e6f5',
    light: '#f4f6fc',
    hi: '#ffffff',
    rim: '#8a91a8',
  },
};

/**
 * Handcrafted Stardew-style pixel art for all 16 bespoke giant 999-rose bouquets:
 * - 40x48 lush bouquet cards for the Cabin Flower Gallery (faithful domes, layered wraps, ribbons, orchids, fairy lights & heart balloons)
 * - 36x36 giant oak pedestal bouquet displays for the live Farmhouse Interior
 */
export function bakeBouquetSprites(register: RegisterSpriteFn): void {
  for (const id of BOUQUET_IDS) {
    const def = BOUQUET_CATALOG[id];
    register(def.spriteKey, drawBouquetCardSprite(def));
    register(def.standSpriteKey, drawIndoorGiantStand(def));
  }
  register('interior_flower_stand_empty', drawEmptyIndoorStand());
}

/* =========================================================
   1. 40x48 BESPOKE GIANT ROSE BOUQUET CARD SPRITES
   ========================================================= */
function drawBouquetCardSprite(def: BouquetDef): HTMLCanvasElement {
  const c = createCanvas(40, 48);
  const ctx = getCtx(c);
  const wp = WRAP_PALETTES[def.wrapTheme];

  // Subtle floor shadow under bouquet base
  fillEllipse(ctx, 20, 45, 11, 2, 'rgba(42, 24, 16, 0.22)');

  // Floating metallic heart balloons behind dome (if applicable)
  if (def.balloons !== 'none') {
    drawBalloonCluster(ctx, 20, 12, def.balloons);
  }

  // Dramatic layered pleated Korean paper wrap skirt (y = 24..44)
  drawRuffledWrapSkirt(ctx, 20, 25, wp, 1);

  // Lush hemispherical rose dome packed with shaded rose rosettes!
  drawGiantRoseDome(ctx, 20, 21, 14, 8, def);

  // Top translucent organza collar puffs framing the lower dome rim
  drawRuffleCollarRim(ctx, 20, 25, wp, 14);

  // Flowing satin ribbons + pearl chains (for fairy-light style)
  drawCascadingRibbons(ctx, 20, 24, def, 18);

  return c;
}

/* =========================================================
   2. 36x36 INDOOR FARMHOUSE FLOWER STAND + GIANT BOUQUET
   ========================================================= */
function drawEmptyIndoorStand(): HTMLCanvasElement {
  const c = createCanvas(36, 36);
  const ctx = getCtx(c);

  drawOakPedestal(ctx);

  // Empty cream ceramic vase waiting for Yiyi's chosen bouquet
  fillRect(ctx, 14, 14, 8, 6, '#e8e0d4');
  fillRect(ctx, 13, 16, 10, 4, '#f7f1e8');
  fillRect(ctx, 14, 19, 8, 2, '#c7baa8');
  fillRect(ctx, 15, 13, 6, 2, '#d4c8b8');
  fillRect(ctx, 15, 13, 6, 1, '#ffffff');
  fillRect(ctx, 14, 17, 8, 1, '#7ea8cc');
  fillRect(ctx, 16, 13, 4, 1, '#7a6c5e');
  px(ctx, 15, 15, '#ffffff');

  return c;
}

function drawIndoorGiantStand(def: BouquetDef): HTMLCanvasElement {
  const c = createCanvas(36, 36);
  const ctx = getCtx(c);
  const wp = WRAP_PALETTES[def.wrapTheme];

  // Oak flower pedestal underneath
  drawOakPedestal(ctx);

  // Floating heart balloons rising above the cabin bouquet!
  if (def.balloons !== 'none') {
    drawBalloonCluster(ctx, 18, 7, def.balloons, true);
  }

  // Compact ruffled wrap skirt resting atop the oak table
  drawRuffledWrapSkirt(ctx, 18, 18, wp, 0.72);

  // Rich blooming giant rose dome right inside the cabin!
  drawGiantRoseDome(ctx, 18, 15, 11, 6, def);

  // Ruffled wrap collar & trailing ribbons
  drawRuffleCollarRim(ctx, 18, 18, wp, 11);
  drawCascadingRibbons(ctx, 18, 18, def, 10);

  return c;
}

function drawOakPedestal(ctx: CanvasRenderingContext2D): void {
  // Ground shadow
  fillEllipse(ctx, 18, 33, 14, 2, 'rgba(35, 18, 8, 0.28)');

  // Four warm oak table legs
  fillRect(ctx, 5, 24, 3, 9, '#6e3d1e');
  fillRect(ctx, 6, 24, 1, 9, '#9c5c30');
  fillRect(ctx, 28, 24, 3, 9, '#6e3d1e');
  fillRect(ctx, 29, 24, 1, 9, '#9c5c30');
  fillRect(ctx, 7, 29, 22, 2, '#8a522a');
  fillRect(ctx, 8, 29, 20, 1, '#b5733f');

  // Tabletop + soft cream lace runner
  fillRect(ctx, 3, 19, 30, 7, '#7d4623');
  fillRect(ctx, 4, 20, 28, 5, '#b3713c');
  fillRect(ctx, 4, 20, 28, 1, '#d6955c');
  fillRect(ctx, 9, 21, 18, 4, '#fff6e8');
  fillRect(ctx, 10, 22, 16, 2, '#f5e2c6');
}

/* =========================================================
   SHARED PIXEL BOUQUET DRAWING PRIMITIVES
   ========================================================= */

function drawGiantRoseDome(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  def: BouquetDef
): void {
  // Base dark silhouette outline + deep shadow core
  fillEllipse(ctx, cx, cy, rx + 1, ry + 1, def.roseShadow);
  fillEllipse(ctx, cx, cy, rx, ry, def.rosePalette[0]);

  // Dense individual 3x3 pixel rosettes tiled across the dome for realistic 999-rose texture!
  let idx = 0;
  for (let row = -ry + 1; row <= ry - 1; row += 2) {
    const rowNorm = row / ry;
    const halfSpan = Math.floor(rx * Math.sqrt(Math.max(0, 1 - rowNorm * rowNorm)));
    const xShift = ((row + 20) % 4 === 0) ? 1 : 0;

    for (let col = -halfSpan + 1; col <= halfSpan - 1; col += 3) {
      const bx = cx + col + xShift;
      const by = cy + row;
      const baseCol = def.rosePalette[(idx * 7 + Math.abs(col) + Math.abs(row)) % def.rosePalette.length];

      // Subtle rose shadow cup + petal body + top highlight center
      px(ctx, bx - 1, by + 1, def.roseShadow);
      px(ctx, bx + 1, by + 1, def.roseShadow);
      fillRect(ctx, bx - 1, by, 3, 2, baseCol);
      px(ctx, bx, by - 1, baseCol);
      if (row < ry * 0.45 && (idx % 2 === 0)) {
        px(ctx, bx, by, def.roseHighlight);
      }
      idx++;
    }
  }

  // Delicate butterfly orchids perched across the dome (粉荔枝+蝴蝶兰 / 粉雪山)
  if (def.hasOrchids) {
    const spots = rx >= 13
      ? [
          [cx - 7, cy + 1],
          [cx + 1, cy - 3],
          [cx + 7, cy + 1],
          [cx - 2, cy + 3],
        ]
      : [
          [cx - 5, cy],
          [cx + 1, cy - 2],
          [cx + 5, cy + 1],
        ];
    for (const [ox, oy] of spots) {
      fillRect(ctx, ox - 2, oy - 1, 5, 2, '#f4eeff');
      fillRect(ctx, ox - 1, oy - 2, 3, 4, '#ffffff');
      px(ctx, ox, oy, '#d6b4f0');
      px(ctx, ox, oy + 1, '#ffe082');
    }
  }

  // Twinkling warm golden fairy lights woven across the pink rose dome (粉玫瑰灯串款)
  if (def.hasFairyLights) {
    const lights = rx >= 13
      ? [
          [cx - 8, cy + 2],
          [cx - 4, cy - 3],
          [cx, cy + 1],
          [cx + 5, cy - 2],
          [cx + 9, cy + 2],
          [cx - 2, cy - 6],
          [cx + 4, cy + 3],
          [cx - 6, cy - 1],
        ]
      : [
          [cx - 6, cy + 1],
          [cx - 2, cy - 3],
          [cx + 3, cy - 1],
          [cx + 6, cy + 1],
          [cx, cy + 2],
        ];
    for (const [lx, ly] of lights) {
      px(ctx, lx - 1, ly, '#ffd970');
      px(ctx, lx + 1, ly, '#ffd970');
      px(ctx, lx, ly - 1, '#ffd970');
      px(ctx, lx, ly, '#ffffff');
    }
  }
}

function drawRuffledWrapSkirt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  wp: WrapPalette,
  scale: number
): void {
  const skirtH = Math.round(19 * scale);
  const topHalfW = Math.round(15 * scale);
  const botHalfW = Math.round(9 * scale);

  // Outer silhouette + vertical paper fold strips
  for (let dy = 0; dy < skirtH; dy++) {
    const t = dy / Math.max(1, skirtH - 1);
    const hw = Math.round(topHalfW * (1 - t) + botHalfW * t);
    // Scalloped zigzag hem at the bottom
    const hemTrim = dy > skirtH - 4 ? ((dy % 2) * 2) : 0;
    fillRect(ctx, cx - hw - 1, topY + dy, (hw + 1) * 2, 1, wp.rim);
    fillRect(ctx, cx - hw + hemTrim, topY + dy, Math.max(2, hw * 2 - hemTrim * 2), 1, wp.mid);
  }

  // Multi-tiered crisp diamond/angular paper pleats (signature 999-rose wrap!)
  const layers = scale > 0.85 ? 4 : 3;
  for (let layer = 0; layer < layers; layer++) {
    const ly = topY + Math.round(layer * (skirtH / layers));
    const spread = Math.round((topHalfW - layer * 1.4));
    const step = scale > 0.85 ? 5 : 4;
    for (let ox = -spread + 2; ox <= spread - 2; ox += step) {
      const px0 = cx + ox;
      fillRect(ctx, px0 - 2, ly, 4, 3, wp.light);
      fillRect(ctx, px0 - 1, ly, 2, 4, wp.hi);
      px(ctx, px0, ly + 4, wp.light);
      px(ctx, px0 - 2, ly + 2, wp.dark);
      px(ctx, px0 + 2, ly + 2, wp.dark);
    }
  }
}

function drawRuffleCollarRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  rimY: number,
  wp: WrapPalette,
  halfW: number
): void {
  for (let ox = -halfW; ox <= halfW; ox += 4) {
    const rx = cx + ox;
    fillRect(ctx, rx - 2, rimY - 1, 4, 3, wp.light);
    fillRect(ctx, rx - 1, rimY - 2, 2, 2, wp.hi);
    px(ctx, rx - 2, rimY + 2, wp.dark);
    px(ctx, rx + 1, rimY + 2, wp.dark);
  }
}

function drawCascadingRibbons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  startY: number,
  def: BouquetDef,
  length: number
): void {
  const streams = [-8, -1, 7];
  for (let i = 0; i < streams.length; i++) {
    const rx = cx + Math.round(streams[i] * (length >= 16 ? 1 : 0.72));
    const len = length - (i === 1 ? 2 : 0);
    // Tiny ribbon bow knot at collar
    fillRect(ctx, rx - 1, startY, 3, 2, def.ribbonColor);
    px(ctx, rx, startY, def.ribbonHighlight);
    // Hanging ribbon tail with gentle wave
    for (let dy = 2; dy < len; dy++) {
      const wave = dy > len * 0.55 ? (i % 2 === 0 ? -1 : 1) : 0;
      px(ctx, rx + wave, startY + dy, def.ribbonColor);
      if (dy % 3 === 0) {
        px(ctx, rx + wave, startY + dy, def.ribbonHighlight);
      }
    }
  }

  // Pearl bead chains dangling down white skirt on fairy-light bouquet
  if (def.hasFairyLights) {
    for (const bx of [cx - 5, cx + 4]) {
      for (let dy = 2; dy < length; dy += 2) {
        px(ctx, bx, startY + dy, '#ffffff');
      }
    }
  }
}

function drawBalloonCluster(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  theme: BouquetBalloonTheme,
  compact = false
): void {
  const palettes: Record<Exclude<BouquetBalloonTheme, 'none'>, [string, string, string][]> = {
    silver: [
      ['#8f97a6', '#cfd6e3', '#ffffff'],
      ['#7e8694', '#bec6d4', '#ffffff'],
      ['#98a0b0', '#dce3f0', '#ffffff'],
    ],
    black_silver: [
      ['#1a1a22', '#383845', '#9aa0b0'],
      ['#8d96a6', '#cfd7e6', '#ffffff'],
      ['#16161c', '#2e2e38', '#808594'],
    ],
    black_pink: [
      ['#1a1a22', '#383845', '#a67b8e'],
      ['#8c3858', '#d96c94', '#ffd9e8'],
      ['#1a1a22', '#383845', '#ff94b8'],
    ],
    purple: [
      ['#6b3d8a', '#a86ed1', '#f0dbff'],
      ['#8552a8', '#c48ee8', '#ffffff'],
      ['#5c3278', '#965ec0', '#e8ccff'],
    ],
    rosegold: [
      ['#a85b6d', '#e899ab', '#fff0f4'],
      ['#994e61', '#de889d', '#ffffff'],
      ['#b56b7d', '#f2aec0', '#fff5f7'],
    ],
  };

  if (theme === 'none') return;
  const cols = palettes[theme];
  const positions = compact
    ? [
        [cx - 4, baseY - 1, 0],
        [cx + 3, baseY - 2, 1],
        [cx, baseY - 4, 2],
      ]
    : [
        [cx - 5, baseY - 3, 0],
        [cx + 5, baseY - 4, 1],
        [cx, baseY - 8, 2],
      ];

  // Thin metallic balloon strings leading into rose dome
  for (const [bx, by] of positions) {
    const steps = compact ? 5 : 8;
    for (let s = 2; s < steps; s++) {
      const sx = Math.round(bx + ((cx - bx) * s) / steps);
      px(ctx, sx, by + s, 'rgba(220, 226, 238, 0.78)');
    }
  }

  // Heart-shaped metallic foil balloons!
  for (const [bx, by, ci] of positions) {
    const [dark, mid, hi] = cols[ci];
    if (compact) {
      fillRect(ctx, bx - 2, by - 2, 2, 2, mid);
      fillRect(ctx, bx + 1, by - 2, 2, 2, mid);
      fillRect(ctx, bx - 2, by - 1, 5, 2, mid);
      fillRect(ctx, bx - 1, by + 1, 3, 1, dark);
      px(ctx, bx, by + 2, dark);
      px(ctx, bx - 1, by - 2, hi);
    } else {
      fillRect(ctx, bx - 3, by - 2, 3, 2, mid);
      fillRect(ctx, bx + 1, by - 2, 3, 2, mid);
      fillRect(ctx, bx - 3, by - 1, 7, 2, mid);
      fillRect(ctx, bx - 2, by + 1, 5, 1, dark);
      fillRect(ctx, bx - 1, by + 2, 3, 1, dark);
      px(ctx, bx, by + 3, dark);
      // Glossy foil reflection
      fillRect(ctx, bx - 2, by - 2, 2, 1, hi);
      px(ctx, bx - 2, by - 1, hi);
    }
  }
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
