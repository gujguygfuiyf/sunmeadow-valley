import { BOUQUET_IDS, type BouquetId } from '../data/bouquets';
import type { RegisterSpriteFn } from './PixelArtExpansion';

/**
 * Handcrafted Stardew-style pixel art for the Farmhouse Flower Bouquet Stand
 * (empty vase + 6 lush classic flower bouquets) and 24x24 bouquet selection icons.
 */
export function bakeBouquetSprites(register: RegisterSpriteFn): void {
  // 1. Standalone 24x24 Bouquet Icons for the Flower Picker Modal
  for (const id of BOUQUET_IDS) {
    register(`bouquet_${id}`, drawBouquetIcon(id));
  }

  // 2. Indoor 32x30 Oak Flower Stand + Ceramic Vase (empty & filled with each bouquet)
  register('interior_flower_stand_empty', drawIndoorFlowerStand(null));
  for (const id of BOUQUET_IDS) {
    register(`interior_flower_stand_${id}`, drawIndoorFlowerStand(id));
  }
}

function drawBouquetIcon(id: BouquetId): HTMLCanvasElement {
  const c = createCanvas(24, 24);
  const ctx = getCtx(c);

  // Soft parchment florist wrapping cone
  const wrapDark = id === 'hydrangea_blue' || id === 'lily_valley' ? '#cad6e0' : '#d6b489';
  const wrapMid = id === 'hydrangea_blue' || id === 'lily_valley' ? '#edf4fa' : '#f2dcc0';
  const wrapHi = '#fffbf2';

  // Wrapping upper fan behind blooms
  fillRect(ctx, 5, 9, 14, 6, wrapDark);
  fillRect(ctx, 6, 8, 12, 6, wrapMid);
  fillRect(ctx, 7, 8, 10, 2, wrapHi);

  // Tapered bouquet cone + satin ribbon bow
  fillRect(ctx, 7, 14, 10, 3, wrapMid);
  fillRect(ctx, 8, 17, 8, 3, wrapDark);
  fillRect(ctx, 10, 20, 4, 2, '#5a8f3b'); // green stems peeking out
  px(ctx, 11, 21, '#3d6e26');

  // Satin ribbon around waist
  const ribbonCol =
    id === 'rose_red'
      ? '#b82542'
      : id === 'sunflower'
        ? '#d98a2b'
        : id === 'hydrangea_blue'
          ? '#4b86c9'
          : '#e86f93';
  fillRect(ctx, 8, 16, 8, 2, ribbonCol);
  px(ctx, 9, 18, ribbonCol);
  px(ctx, 14, 18, ribbonCol);
  px(ctx, 11, 16, '#fff5dc');
  px(ctx, 12, 16, '#fff5dc');

  // Lush foliage leaves around bouquet rim
  drawFoliageBase(ctx, 12, 11);

  // Specific iconic blooms centered at (12, 8)
  drawFlowerCluster(ctx, id, 12, 8);

  return c;
}

function drawIndoorFlowerStand(bouquetId: BouquetId | null): HTMLCanvasElement {
  const c = createCanvas(32, 30);
  const ctx = getCtx(c);

  // Ground shadow under oak flower stand
  fillEllipse(ctx, 16, 27, 13, 2, 'rgba(35, 18, 8, 0.28)');

  // Warm oak console flower stand (2 tiles wide)
  fillRect(ctx, 4, 19, 3, 9, '#6e3d1e');
  fillRect(ctx, 5, 19, 1, 9, '#9c5c30');
  fillRect(ctx, 25, 19, 3, 9, '#6e3d1e');
  fillRect(ctx, 26, 19, 1, 9, '#9c5c30');
  // Lower display shelf
  fillRect(ctx, 6, 23, 20, 2, '#8a522a');
  fillRect(ctx, 7, 23, 18, 1, '#b5733f');

  // Tabletop
  fillRect(ctx, 2, 13, 28, 7, '#7d4623');
  fillRect(ctx, 3, 14, 26, 5, '#b3713c');
  fillRect(ctx, 3, 14, 26, 1, '#d6955c');

  // Cozy cream lace doily under vase
  fillRect(ctx, 9, 15, 14, 4, '#fff6e8');
  fillRect(ctx, 10, 16, 12, 2, '#f5e2c6');

  // Small decorative ribbons & card resting on left/right of stand
  fillRect(ctx, 4, 15, 4, 2, '#f29eb0');
  px(ctx, 5, 15, '#fff4f7');
  fillRect(ctx, 24, 15, 4, 3, '#fff9ee');
  px(ctx, 25, 16, '#d95772');

  // Handcrafted cream-glaze ceramic vase centered at x=16
  fillRect(ctx, 12, 11, 8, 6, '#e8e0d4');
  fillRect(ctx, 11, 13, 10, 4, '#f5efe6');
  fillRect(ctx, 12, 16, 8, 2, '#c7baa8');
  fillRect(ctx, 13, 10, 6, 2, '#d4c8b8');
  fillRect(ctx, 13, 10, 6, 1, '#ffffff');
  // Delicate blue ceramic band
  fillRect(ctx, 12, 14, 8, 1, '#7ea8cc');
  px(ctx, 13, 12, '#ffffff');

  if (!bouquetId) {
    // Empty vase with dark opening & tiny sparkle waiting for flowers
    fillRect(ctx, 14, 10, 4, 1, '#7a6c5e');
    return c;
  }

  // Lush foliage & chosen bouquet blooming right out of the ceramic vase!
  drawFoliageBase(ctx, 16, 9);
  drawFlowerCluster(ctx, bouquetId, 16, 6);

  return c;
}

function drawFoliageBase(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const leafDark = '#326924';
  const leafMid = '#4c9436';
  const leafHi = '#72bd4f';

  fillRect(ctx, cx - 6, cy - 1, 12, 3, leafDark);
  fillRect(ctx, cx - 7, cy, 3, 2, leafMid);
  fillRect(ctx, cx + 4, cy, 3, 2, leafMid);
  fillRect(ctx, cx - 5, cy - 2, 10, 2, leafMid);
  px(ctx, cx - 6, cy - 1, leafHi);
  px(ctx, cx + 5, cy - 1, leafHi);
  px(ctx, cx - 2, cy - 2, leafHi);
  px(ctx, cx + 2, cy - 2, leafHi);
}

function drawFlowerCluster(
  ctx: CanvasRenderingContext2D,
  id: BouquetId,
  cx: number,
  cy: number
): void {
  switch (id) {
    case 'rose_red': {
      // Velvet crimson roses + tiny gold baby's breath dots
      const blooms = [
        [-4, 1],
        [3, 1],
        [-1, -2],
        [-5, -2],
        [4, -2],
        [0, 1],
      ];
      for (const [ox, oy] of blooms) {
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 4, 3, '#8f182d');
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 3, 2, '#d92b4b');
        px(ctx, cx + ox, cy + oy - 1, '#ff7a92');
      }
      px(ctx, cx - 6, cy - 1, '#fff6db');
      px(ctx, cx + 6, cy, '#fff6db');
      px(ctx, cx + 1, cy - 4, '#fff6db');
      break;
    }

    case 'rose_pink': {
      // Soft blush lychee garden roses + pearl baby's breath
      const blooms = [
        [-4, 1],
        [3, 1],
        [0, -2],
        [-4, -2],
        [4, -2],
        [-1, 1],
      ];
      for (const [ox, oy] of blooms) {
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 4, 3, '#d45f88');
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 3, 2, '#ffa8c5');
        px(ctx, cx + ox, cy + oy - 1, '#ffe6ef');
      }
      px(ctx, cx - 6, cy - 2, '#ffffff');
      px(ctx, cx + 6, cy - 1, '#ffffff');
      px(ctx, cx - 1, cy - 4, '#ffffff');
      px(ctx, cx + 2, cy - 4, '#fff5f8');
      break;
    }

    case 'tulip_pink': {
      // Elegant upright coral-pink & pastel tulip cups
      const stems: [number, number, string, string][] = [
        [-5, 0, '#eb5c82', '#ff9db8'],
        [-2, -2, '#f57396', '#ffc2d4'],
        [1, -3, '#eb5c82', '#ffa6c0'],
        [4, -1, '#f57396', '#ffd1df'],
        [-1, 1, '#d9486e', '#ff94b2'],
      ];
      for (const [ox, oy, base, hi] of stems) {
        fillRect(ctx, cx + ox, cy + oy + 2, 1, 2, '#4c9436');
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 3, 3, base);
        px(ctx, cx + ox - 1, cy + oy - 2, hi);
        px(ctx, cx + ox + 1, cy + oy - 2, hi);
        px(ctx, cx + ox, cy + oy - 1, '#ffe6ee');
      }
      break;
    }

    case 'sunflower': {
      // Three bright golden sunflowers + tiny white chamomile daisies
      const suns = [
        [-4, 0],
        [4, 0],
        [0, -2],
      ];
      for (const [ox, oy] of suns) {
        fillRect(ctx, cx + ox - 2, cy + oy - 2, 5, 5, '#e89d1e');
        fillRect(ctx, cx + ox - 2, cy + oy - 1, 5, 3, '#ffd942');
        fillRect(ctx, cx + ox - 1, cy + oy - 2, 3, 5, '#ffd942');
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 3, 3, '#61381b');
        px(ctx, cx + ox, cy + oy - 1, '#8c5328');
      }
      // Chamomile accents
      const daisies = [
        [-6, -3],
        [6, -2],
        [-2, 2],
        [3, 2],
      ];
      for (const [ox, oy] of daisies) {
        fillRect(ctx, cx + ox - 1, cy + oy, 3, 1, '#ffffff');
        fillRect(ctx, cx + ox, cy + oy - 1, 1, 3, '#ffffff');
        px(ctx, cx + ox, cy + oy, '#ffd53d');
      }
      break;
    }

    case 'hydrangea_blue': {
      // Lush cloud of sky-blue, periwinkle & milk-white hydrangea florets
      fillEllipse(ctx, cx - 2, cy, 4, 3, '#4c8fd4');
      fillEllipse(ctx, cx + 3, cy, 4, 3, '#69b0f0');
      fillEllipse(ctx, cx, cy - 2, 4, 3, '#8ac8fa');
      const florets: [number, number, string][] = [
        [-5, 0, '#9bd4ff'],
        [-3, -2, '#dff2ff'],
        [-1, -3, '#ffffff'],
        [1, -2, '#b8e1ff'],
        [4, -2, '#e8f6ff'],
        [5, 0, '#99d1ff'],
        [2, 1, '#ffffff'],
        [-2, 1, '#c9e8ff'],
        [0, 0, '#5ba0e6'],
        [3, -1, '#5ba0e6'],
      ];
      for (const [ox, oy, col] of florets) {
        fillRect(ctx, cx + ox, cy + oy, 2, 2, col);
      }
      break;
    }

    case 'lily_valley': {
      // Graceful arching stems with dangling snow-white lily bells & baby's breath
      const arches = [
        [-4, -2],
        [0, -4],
        [4, -2],
      ];
      for (const [ox, oy] of arches) {
        fillRect(ctx, cx + ox, cy + oy, 1, 5, '#468a34');
        fillRect(ctx, cx + ox - 1, cy + oy - 1, 3, 1, '#68b34d');
      }
      const bells = [
        [-5, -1],
        [-3, 1],
        [-1, -3],
        [1, -1],
        [3, -2],
        [5, 0],
        [0, 1],
      ];
      for (const [ox, oy] of bells) {
        fillRect(ctx, cx + ox - 1, cy + oy, 2, 2, '#e8f0eb');
        fillRect(ctx, cx + ox - 1, cy + oy, 2, 1, '#ffffff');
        px(ctx, cx + ox, cy + oy + 2, '#fff8cf');
      }
      // Starry baby's breath dots
      px(ctx, cx - 6, cy - 3, '#ffffff');
      px(ctx, cx + 6, cy - 3, '#ffffff');
      px(ctx, cx - 2, cy - 4, '#ffffff');
      px(ctx, cx + 2, cy - 4, '#ffffff');
      break;
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
