import type { GameWorld } from '../core/GameWorld';
import type { CompanionCatRuntime } from '../systems/PetSystem';

const DRAW_SIZE = 24;
const masks = new WeakMap<HTMLCanvasElement, Uint8ClampedArray | null>();

function spriteOrigin(cat: CompanionCatRuntime) {
  return { x: Math.round(cat.x) - DRAW_SIZE / 2, y: Math.round(cat.y) - DRAW_SIZE + 4 };
}

export function drawCat(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  cat: CompanionCatRuntime,
  elapsed: number
): void {
  const { x, y } = spriteOrigin(cat);
  ctx.save();
  ctx.translate(cat.facing === 'left' ? x + DRAW_SIZE : x, y);
  if (cat.facing === 'left') ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0, DRAW_SIZE, DRAW_SIZE);
  ctx.restore();

  if (cat.pendingGiftItemId) {
    const bob = Math.round(Math.sin(elapsed * 5 + cat.x) * 1.5);
    ctx.fillStyle = '#3b1f12';
    ctx.fillRect(x + 8, y - 6 + bob, 8, 7);
    ctx.fillStyle = '#ffe570';
    ctx.fillRect(x + 9, y - 5 + bob, 6, 5);
    ctx.fillStyle = '#e05674';
    ctx.fillRect(x + 11, y - 5 + bob, 2, 5);
  } else if (cat.state === 'sleep') {
    const phase = Math.floor(elapsed * 2) % 3;
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(x + 16 + phase, y - 1 - phase, 2, 1);
    ctx.fillRect(x + 17 + phase, y - phase, 1, 1);
    ctx.fillRect(x + 16 + phase, y + 1 - phase, 2, 1);
  }
}

function opaqueAt(sprite: HTMLCanvasElement, x: number, y: number): boolean {
  let mask = masks.get(sprite);
  if (mask === undefined) {
    try {
      mask = sprite.getContext('2d')?.getImageData(0, 0, sprite.width, sprite.height).data ?? null;
    } catch {
      // External atlases can be displayed even when their pixels cannot be read.
      mask = null;
    }
    masks.set(sprite, mask);
  }
  return mask === null || mask[(y * sprite.width + x) * 4 + 3] > 0;
}

export function pickCat(world: GameWorld, worldX: number, worldY: number): CompanionCatRuntime | null {
  let hit: CompanionCatRuntime | null = null;
  for (const cat of world.pets.cats) {
    if (hit && cat.y < hit.y) continue;
    const origin = spriteOrigin(cat);
    const dx = worldX - origin.x;
    const dy = worldY - origin.y;
    if (dx < 0 || dy < 0 || dx >= DRAW_SIZE || dy >= DRAW_SIZE) continue;
    const sprite = world.atlas.get(world.pets.getSpriteKey(cat));
    if (!sprite) continue;
    const x = Math.floor(dx * sprite.width / DRAW_SIZE);
    const y = Math.floor(dy * sprite.height / DRAW_SIZE);
    if (opaqueAt(sprite, cat.facing === 'left' ? sprite.width - 1 - x : x, y)) hit = cat;
  }
  return hit;
}
