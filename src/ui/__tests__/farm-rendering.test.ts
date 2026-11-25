import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameWorld, type GameWorldDeps } from '../../core/GameWorld';
import { bakePetSprites } from '../../engine/PixelArtPets';
import { pickCat } from '../../scenes/CompanionCatSprite';
import { MinimapRenderer } from '../MinimapRenderer';

afterEach(() => vi.unstubAllGlobals());

describe('Companion sprite picking', () => {
  it('uses the drawn pixels of each sprite, including mirrored ears and transparent margins', () => {
    vi.stubGlobal('document', {
      createElement: () => {
        const pixels = new Uint8ClampedArray(32 * 32 * 4);
        return { getContext: () => ({
          fillRect(x: number, y: number) { pixels[(32 * y + x) * 4 + 3] = 255; },
          getImageData: () => ({ data: pixels }),
        }) };
      },
    });
    const sprites = new Map<string, HTMLCanvasElement>();
    bakePetSprites((key, canvas) => sprites.set(key, canvas));
    const world = new GameWorld({ atlas: { get: (key: string) => sprites.get(key) } } as GameWorldDeps);
    const grey = world.pets.adopt('cat_maine_silver')!;
    const tabby = world.pets.adopt('cat_bicolor_tabby')!;
    for (const [cat, ear] of [[grey, [3, 1]], [tabby, [28, 2]]] as const) {
      for (const facing of ['left', 'right'] as const) {
        cat.facing = facing;
        const left = Math.round(cat.x) - 12;
        const top = Math.round(cat.y) - 20;
        const sourceX = facing === 'left' ? 31 - ear[0] : ear[0];
        expect(pickCat(world, left + (sourceX + 0.5) * 0.75, top + (ear[1] + 0.5) * 0.75)).toBe(cat);
        expect(pickCat(world, left + 0.5, top + 0.5)).toBeNull();
      }
    }
    tabby.x = grey.x;
    tabby.y = grey.y + 1;
    expect(pickCat(world, grey.x, grey.y - 5)).toBe(tabby);
  });
});

describe('Farm minimap layers', () => {
  it('reuses terrain across movement and refreshes water, ready crops, buildings and seasons', () => {
    const newCanvas = () => {
      const ctx = { clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '' };
      return { width: 96, height: 64, getContext: () => ctx, ctx };
    };
    const terrain = newCanvas();
    const cropMarks = newCanvas();
    const visible = newCanvas();
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValueOnce(terrain).mockReturnValueOnce(cropMarks),
    });
    const world = new GameWorld({} as GameWorldDeps);
    const minimap = new MinimapRenderer(visible as unknown as HTMLCanvasElement);
    minimap.render(world);
    expect(terrain.ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(660);
    terrain.ctx.fillRect.mockClear();
    cropMarks.ctx.clearRect.mockClear();
    world.player.x += 16;
    minimap.render(world);
    expect(terrain.ctx.fillRect).not.toHaveBeenCalled();
    expect(cropMarks.ctx.clearRect).not.toHaveBeenCalled();
    expect(visible.ctx.drawImage).toHaveBeenCalledTimes(4);

    world.tileMap.waterTile(6, 10);
    minimap.render(world);
    expect(terrain.ctx.fillRect).toHaveBeenCalled();
    terrain.ctx.fillRect.mockClear();
    world.crops.load([{ x: 6, y: 10, cropId: 'parsnip', daysGrown: 10, harvestedOnce: false }]);
    minimap.render(world);
    expect(terrain.ctx.fillRect).not.toHaveBeenCalled();
    expect(cropMarks.ctx.fillRect).toHaveBeenCalledTimes(1);
    cropMarks.ctx.fillRect.mockClear();
    world.crops.harvest(6, 10);
    minimap.render(world);
    expect(cropMarks.ctx.clearRect).toHaveBeenCalledTimes(2);
    expect(cropMarks.ctx.fillRect).not.toHaveBeenCalled();

    world.tileMap.setBuildingBuilt('coop', true);
    minimap.render(world);
    expect(terrain.ctx.fillRect).toHaveBeenCalled();
    terrain.ctx.fillRect.mockClear();
    world.time.seasonIndex = 3;
    minimap.render(world);
    expect(terrain.ctx.fillRect).toHaveBeenCalled();
    visible.width = 128;
    minimap.render(world);
    expect([terrain.width, cropMarks.width]).toEqual([128, 128]);
  });
});
