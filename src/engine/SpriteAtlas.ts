import { bakeInteriorAndTownSprites } from './PixelArtExpansion';
import { bakeFullExpansionSprites } from './PixelArtFullExpansion';

/**
 * SpriteAtlas — Unified 2D pixel-art sprite registry.
 *
 * Bakes crisp procedural pixel-art sprites to offscreen canvases at startup so the game
 * works out of the box with zero external binary asset dependencies, while exposing
 * `registerCanvas` / `loadImage` / `loadSpriteSheet` so external Aseprite/PNG spritesheets
 * can replace any sprite key cleanly during long-term iteration.
 */
export class SpriteAtlas {
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private readonly dataUrlCache = new Map<string, string>();

  constructor() {
    this.bakeAllProceduralSprites();
  }

  get(key: string): HTMLCanvasElement | undefined {
    return this.sprites.get(key);
  }

  has(key: string): boolean {
    return this.sprites.has(key);
  }

  registerCanvas(key: string, canvas: HTMLCanvasElement): void {
    this.sprites.set(key, canvas);
    this.dataUrlCache.delete(key);
  }

  /**
   * Loads a single external PNG image into a sprite key.
   */
  async loadImage(key: string, url: string): Promise<void> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = createCanvas(img.width, img.height);
    const ctx = getCtx(canvas);
    ctx.drawImage(img, 0, 0);
    this.registerCanvas(key, canvas);
  }

  /**
   * Slices a grid-aligned external PNG/Aseprite spritesheet into named sprite keys.
   */
  async loadSpriteSheet(
    url: string,
    cellWidth: number,
    cellHeight: number,
    mapping: Record<string, { col: number; row: number; w?: number; h?: number }>
  ): Promise<void> {
    const img = new Image();
    img.src = url;
    await img.decode();
    for (const [key, rect] of Object.entries(mapping)) {
      const sw = (rect.w ?? 1) * cellWidth;
      const sh = (rect.h ?? 1) * cellHeight;
      const canvas = createCanvas(sw, sh);
      const ctx = getCtx(canvas);
      ctx.drawImage(img, rect.col * cellWidth, rect.row * cellHeight, sw, sh, 0, 0, sw, sh);
      this.registerCanvas(key, canvas);
    }
  }

  /** Returns a crisp data URL for rendering pixel sprites inside DOM HUD / Shop elements. */
  getIconDataUrl(key: string): string {
    const cached = this.dataUrlCache.get(key);
    if (cached) return cached;
    const sprite = this.sprites.get(key);
    if (!sprite) return '';
    const url = sprite.toDataURL('image/png');
    this.dataUrlCache.set(key, url);
    return url;
  }

  private bakeAllProceduralSprites(): void {
    this.bakeTerrainTiles();
    this.bakeLandmarksAndProps();
    this.bakeItemIcons();
    this.bakeCropStages();
    this.bakePlayerSprites();
    bakeInteriorAndTownSprites((key, canvas) => this.registerCanvas(key, canvas));
    bakeFullExpansionSprites((key, canvas) => this.registerCanvas(key, canvas));
  }

  /* =========================================================
     1. TERRAIN TILES (16x16)
     ========================================================= */
  private bakeTerrainTiles(): void {
    // Base meadow grass variants
    const grassColors = ['#73b046', '#6da941', '#77b449'];
    grassColors.forEach((base, idx) => {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 0, 0, 16, 16, base);

      // Subtle organic speckles & grass blades
      const tufts = [
        [2, 3],
        [10, 2],
        [6, 9],
        [13, 12],
        [3, 13],
      ];
      for (let i = 0; i < tufts.length; i++) {
        const [tx, ty] = tufts[(i + idx) % tufts.length];
        px(ctx, (tx + idx * 3) % 15, (ty + idx * 2) % 14, '#88c557');
        px(ctx, (tx + idx * 3) % 15, ((ty + idx * 2) % 14) + 1, '#5d9536');
      }
      if (idx === 1) {
        px(ctx, 4, 6, '#5c9335');
        px(ctx, 5, 5, '#8bc85b');
        px(ctx, 11, 10, '#5c9335');
      }
      this.registerCanvas(`grass_${idx}`, c);
    });

    // Wildflower grass variants
    const flowerSpecs: [string, string, string][] = [
      ['grass_flower_yellow', '#ffe26a', '#f0a82e'],
      ['grass_flower_pink', '#ff9db8', '#e26188'],
    ];
    for (const [key, petal, center] of flowerSpecs) {
      const c = cloneCanvas(this.sprites.get('grass_0')!);
      const ctx = getCtx(c);
      drawTinyFlower(ctx, 4, 5, petal, center);
      drawTinyFlower(ctx, 11, 11, petal, center);
      this.registerCanvas(key, c);
    }

    // Clover grass
    {
      const c = cloneCanvas(this.sprites.get('grass_2')!);
      const ctx = getCtx(c);
      px(ctx, 5, 6, '#528b2e');
      px(ctx, 6, 5, '#528b2e');
      px(ctx, 6, 7, '#528b2e');
      px(ctx, 7, 6, '#528b2e');
      px(ctx, 6, 6, '#8fd15a');
      this.registerCanvas('grass_clover', c);
    }

    // Sunny clearing dirt (farmable base soil)
    for (let v = 0; v < 2; v++) {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 0, 0, 16, 16, v === 0 ? '#d8a66a' : '#d29e62');
      // Soft sandy texture
      const dots = v === 0 ? [[3, 4], [11, 3], [7, 10], [13, 13], [2, 12]] : [[5, 2], [12, 7], [4, 11], [10, 14]];
      for (const [x, y] of dots) {
        px(ctx, x, y, '#e6ba82');
        px(ctx, x + 1, y + 1, '#be894e');
      }
      this.registerCanvas(`dirt_farm_${v}`, c);
    }

    // Warm cobblestone path
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 0, 0, 16, 16, '#b79164');
      // Cobble stones
      drawStone(ctx, 1, 1, 6, 5, '#e2cba5', '#c5a57a', '#8d6b46');
      drawStone(ctx, 8, 1, 7, 6, '#d9bf94', '#bd9b70', '#8d6b46');
      drawStone(ctx, 1, 8, 7, 7, '#dcc49b', '#bfa075', '#8d6b46');
      drawStone(ctx, 9, 9, 6, 6, '#e6d0ac', '#c8a97e', '#8d6b46');
      this.registerCanvas('path_stone', c);
    }

    // Tilled dry soil
    this.registerCanvas('soil_tilled', buildSoilTile('#9d6236', '#7a4722', '#b97a49', '#603517'));

    // Tilled watered moist soil
    this.registerCanvas('soil_watered', buildSoilTile('#5b321a', '#3f200f', '#724226', '#2e1609'));

    // Animated water frames
    for (let f = 0; f < 2; f++) {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 0, 0, 16, 16, '#4396cc');
      fillRect(ctx, 0, 0, 16, 2, '#53a7db');
      const ox = f * 3;
      fillRect(ctx, (2 + ox) % 12, 4, 4, 1, '#8bd5f7');
      fillRect(ctx, (8 + ox) % 11, 10, 5, 1, '#8bd5f7');
      fillRect(ctx, (4 + ox) % 12, 13, 3, 1, '#317fb3');
      px(ctx, (10 + ox) % 14, 6, '#bcebff');
      this.registerCanvas(`water_${f}`, c);
    }
  }

  /* =========================================================
     2. LANDMARKS & PROPS
     ========================================================= */
  private bakeLandmarksAndProps(): void {
    // Wooden Fence Horizontal
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      // Posts
      fillRect(ctx, 2, 4, 3, 11, '#8b522a');
      fillRect(ctx, 2, 4, 1, 11, '#b67542');
      fillRect(ctx, 4, 4, 1, 11, '#583016');
      fillRect(ctx, 11, 4, 3, 11, '#8b522a');
      fillRect(ctx, 11, 4, 1, 11, '#b67542');
      fillRect(ctx, 13, 4, 1, 11, '#583016');
      // Rails
      fillRect(ctx, 0, 6, 16, 2, '#a46434');
      fillRect(ctx, 0, 6, 16, 1, '#c9884f');
      fillRect(ctx, 0, 11, 16, 2, '#995b2e');
      fillRect(ctx, 0, 11, 16, 1, '#be7e47');
      // Cap tops
      fillRect(ctx, 2, 3, 3, 1, '#dca166');
      fillRect(ctx, 11, 3, 3, 1, '#dca166');
      this.registerCanvas('fence_h', c);
    }

    // Wooden Fence Post (vertical/corner)
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 6, 2, 4, 13, '#8b522a');
      fillRect(ctx, 6, 2, 1, 13, '#bd7b47');
      fillRect(ctx, 9, 2, 1, 13, '#583016');
      fillRect(ctx, 6, 1, 4, 1, '#dfa468');
      fillRect(ctx, 5, 14, 6, 1, 'rgba(35,18,8,0.35)');
      this.registerCanvas('fence_v', c);
    }

    // Lush Oak Tree (32x40)
    {
      const c = createCanvas(32, 40);
      const ctx = getCtx(c);
      // Soft ground shadow
      fillEllipse(ctx, 16, 35, 11, 4, 'rgba(26, 46, 20, 0.32)');
      // Trunk
      fillRect(ctx, 13, 22, 6, 13, '#7b4827');
      fillRect(ctx, 14, 22, 2, 13, '#9c6036');
      fillRect(ctx, 18, 22, 1, 13, '#4f2c15');
      // Roots
      fillRect(ctx, 12, 33, 2, 2, '#6d3f20');
      fillRect(ctx, 18, 33, 2, 2, '#5a3319');

      // Leaf canopy layers (dark outline -> mid green -> sunlit top)
      fillEllipse(ctx, 16, 16, 13, 12, '#2d5c25');
      fillEllipse(ctx, 16, 15, 12, 10, '#3f7d30');
      fillEllipse(ctx, 12, 13, 8, 7, '#589c3b');
      fillEllipse(ctx, 20, 14, 7, 7, '#4c8e35');
      fillEllipse(ctx, 15, 9, 8, 6, '#75bc4a');
      // Sunlit leaf speckles
      const spots = [
        [11, 7], [14, 6], [18, 8], [9, 12], [15, 11], [21, 11], [12, 16], [19, 17],
      ];
      for (const [x, y] of spots) {
        fillRect(ctx, x, y, 2, 2, '#99db62');
      }
      this.registerCanvas('tree_oak', c);
    }

    // Garden Rock (16x16)
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillEllipse(ctx, 8, 12, 6, 3, 'rgba(25,35,20,0.3)');
      fillRect(ctx, 3, 7, 10, 6, '#7a7d78');
      fillRect(ctx, 4, 5, 8, 3, '#979b94');
      fillRect(ctx, 5, 6, 4, 2, '#b6bab2');
      fillRect(ctx, 3, 11, 10, 2, '#5a5d59');
      // Moss accent
      px(ctx, 4, 8, '#5f9a3e');
      px(ctx, 5, 7, '#75b54c');
      this.registerCanvas('rock_small', c);
    }

    // Cozy Farmhouse (80x72 — spans 5x4 tiles + roof overhang)
    {
      const c = createCanvas(80, 72);
      const ctx = getCtx(c);

      // Ground shadow
      fillRect(ctx, 3, 62, 74, 8, 'rgba(30, 42, 22, 0.3)');

      // Stone chimney
      fillRect(ctx, 58, 4, 10, 24, '#7e7971');
      fillRect(ctx, 59, 5, 3, 20, '#9d978e');
      fillRect(ctx, 57, 3, 12, 3, '#5d5952');

      // Main timber walls
      fillRect(ctx, 6, 32, 68, 34, '#e3be87');
      // Horizontal plank lines
      for (let y = 36; y < 65; y += 5) {
        fillRect(ctx, 6, y, 68, 1, '#c99f67');
      }
      // Corner wooden beams
      fillRect(ctx, 6, 32, 4, 34, '#7d4a26');
      fillRect(ctx, 70, 32, 4, 34, '#7d4a26');
      // Stone foundation
      fillRect(ctx, 5, 60, 70, 6, '#847e77');
      for (let x = 8; x < 72; x += 9) {
        fillRect(ctx, x, 61, 6, 4, '#a29c93');
      }

      // Cozy terracotta shingle pitched roof
      for (let row = 0; row < 24; row++) {
        const inset = Math.max(0, 18 - row);
        const y = 10 + row;
        const xStart = 2 + inset;
        const width = 76 - inset * 2;
        const color = row % 4 === 0 ? '#8e3827' : row % 2 === 0 ? '#b64c35' : '#c95c41';
        fillRect(ctx, xStart, y, width, 1, color);
      }
      // Roof eave trim
      fillRect(ctx, 2, 33, 76, 3, '#69391c');
      fillRect(ctx, 3, 33, 74, 1, '#a16337');
      // Roof ridge
      fillRect(ctx, 20, 9, 40, 2, '#f2c88b');

      // Arched wooden front door (centered around x=32..48)
      fillRect(ctx, 33, 44, 14, 22, '#5c3118');
      fillRect(ctx, 35, 46, 10, 20, '#8f522a');
      fillRect(ctx, 37, 48, 6, 8, '#a8673a');
      px(ctx, 43, 56, '#f4c74e'); // Brass doorknob
      // Wooden porch step
      fillRect(ctx, 30, 65, 20, 4, '#a96c3b');
      fillRect(ctx, 30, 65, 20, 1, '#d3975c');

      // Left & right sunlit cottage windows with flower boxes
      drawCottageWindow(ctx, 14, 42);
      drawCottageWindow(ctx, 54, 42);

      this.registerCanvas('house', c);
    }

    // Shipping Bin (32x24)
    {
      const c = createCanvas(32, 24);
      const ctx = getCtx(c);
      fillRect(ctx, 2, 19, 28, 4, 'rgba(30, 35, 18, 0.3)');
      // Lid
      fillRect(ctx, 2, 3, 28, 7, '#a86431');
      fillRect(ctx, 3, 4, 26, 2, '#cf8a4e');
      fillRect(ctx, 2, 9, 28, 2, '#5e3216');
      // Body
      fillRect(ctx, 3, 11, 26, 10, '#8d5025');
      fillRect(ctx, 5, 12, 22, 8, '#9f5d2d');
      // Iron bands
      fillRect(ctx, 7, 3, 3, 18, '#535862');
      fillRect(ctx, 22, 3, 3, 18, '#535862');
      // Gold latch
      fillRect(ctx, 14, 9, 4, 4, '#e6b12e');
      fillRect(ctx, 15, 10, 2, 2, '#ffe17d');
      this.registerCanvas('shipping_bin', c);
    }

    // Seed Stall (48x40)
    {
      const c = createCanvas(48, 40);
      const ctx = getCtx(c);
      fillRect(ctx, 3, 34, 42, 5, 'rgba(26, 38, 18, 0.28)');
      // Wooden posts
      fillRect(ctx, 5, 12, 3, 24, '#7b4723');
      fillRect(ctx, 40, 12, 3, 24, '#7b4723');
      // Counter
      fillRect(ctx, 4, 24, 40, 12, '#9a5d30');
      fillRect(ctx, 3, 22, 42, 3, '#c8884f');
      fillRect(ctx, 4, 34, 40, 2, '#5d3217');

      // Seed baskets on counter
      fillRect(ctx, 9, 19, 8, 4, '#d9a45c');
      fillRect(ctx, 10, 18, 6, 2, '#82cc49');
      fillRect(ctx, 20, 19, 8, 4, '#d9a45c');
      fillRect(ctx, 21, 18, 6, 2, '#ff789a');
      fillRect(ctx, 31, 19, 8, 4, '#d9a45c');
      fillRect(ctx, 32, 18, 6, 2, '#f29f2e');

      // Red & cream striped awning
      for (let i = 0; i < 6; i++) {
        const col = i % 2 === 0 ? '#c94338' : '#f7ead0';
        fillRect(ctx, 3 + i * 7, 4, 7, 10, col);
        fillRect(ctx, 3 + i * 7, 14, 7, 2, i % 2 === 0 ? '#962b22' : '#d4c19c');
      }
      fillRect(ctx, 2, 3, 44, 2, '#69371b');

      // Little wooden sign plaque on front
      fillRect(ctx, 15, 27, 18, 6, '#f2d9a2');
      fillRect(ctx, 17, 29, 14, 2, '#6b3b1e');

      this.registerCanvas('seed_stall', c);
    }
  }

  /* =========================================================
     3. ITEM ICONS (16x16)
     ========================================================= */
  private bakeItemIcons(): void {
    // Iron Hoe
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      // Diagonal wooden handle
      for (let i = 0; i < 9; i++) {
        fillRect(ctx, 3 + i, 12 - i, 2, 2, '#995c2e');
        px(ctx, 3 + i, 12 - i, '#c78449');
      }
      // Metal blade
      fillRect(ctx, 8, 2, 6, 3, '#aeb7c2');
      fillRect(ctx, 12, 4, 2, 4, '#8b95a3');
      fillRect(ctx, 9, 2, 4, 1, '#e1e7ef');
      this.registerCanvas('item_hoe', c);
    }

    // Copper Watering Can
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      // Handle
      fillRect(ctx, 9, 4, 4, 2, '#b06431');
      fillRect(ctx, 12, 5, 2, 6, '#8e4d23');
      // Body
      fillRect(ctx, 5, 6, 7, 7, '#d48244');
      fillRect(ctx, 6, 7, 5, 5, '#e89d5d');
      fillRect(ctx, 6, 6, 5, 1, '#78401d');
      // Water glint inside top
      fillRect(ctx, 7, 6, 3, 1, '#7cd1fa');
      // Spout
      fillRect(ctx, 2, 7, 3, 2, '#c5753b');
      fillRect(ctx, 1, 6, 2, 3, '#e89d5d');
      // Droplet accent
      px(ctx, 1, 10, '#62c4f5');
      this.registerCanvas('item_watering_can', c);
    }

    // Harvest Basket
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      // Handle arch
      fillRect(ctx, 5, 3, 6, 1, '#8c5126');
      fillRect(ctx, 4, 4, 1, 4, '#8c5126');
      fillRect(ctx, 11, 4, 1, 4, '#8c5126');
      // Basket woven body
      fillRect(ctx, 3, 7, 10, 6, '#c88743');
      fillRect(ctx, 4, 8, 8, 4, '#dea258');
      fillRect(ctx, 3, 9, 10, 1, '#9c622b');
      fillRect(ctx, 3, 11, 10, 1, '#9c622b');
      fillRect(ctx, 4, 13, 8, 1, '#75441c');
      this.registerCanvas('item_basket', c);
    }

    // Seed packets
    this.registerCanvas('seed_parsnip', buildSeedPacket('#f6e1b2', '#70b33d'));
    this.registerCanvas('seed_tulip', buildSeedPacket('#ff88ad', '#5ca636'));
    this.registerCanvas('seed_strawberry', buildSeedPacket('#e64545', '#58a334'));
    this.registerCanvas('seed_pumpkin', buildSeedPacket('#f29124', '#4d8f2f'));

    // Harvested crops
    // Parsnip
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      // Leafy top
      fillRect(ctx, 6, 2, 4, 3, '#62ab38');
      fillRect(ctx, 5, 3, 6, 2, '#82ca4e');
      // Creamy root
      fillRect(ctx, 5, 5, 6, 4, '#f5e2b5');
      fillRect(ctx, 6, 9, 4, 3, '#ead098');
      fillRect(ctx, 7, 12, 2, 2, '#d8b675');
      px(ctx, 6, 6, '#fff8e2');
      this.registerCanvas('crop_parsnip', c);
    }

    // Tulip
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 7, 8, 2, 6, '#509430');
      fillRect(ctx, 5, 10, 2, 2, '#73ba44');
      fillRect(ctx, 9, 9, 2, 2, '#73ba44');
      // Pink petals
      fillRect(ctx, 5, 3, 6, 6, '#f26a93');
      fillRect(ctx, 6, 2, 4, 2, '#ffa1be');
      px(ctx, 7, 4, '#ffd4e2');
      this.registerCanvas('crop_tulip', c);
    }

    // Strawberry
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 5, 3, 6, 2, '#59a632');
      fillRect(ctx, 7, 2, 2, 2, '#7ac949');
      fillRect(ctx, 4, 5, 8, 5, '#e03b3b');
      fillRect(ctx, 5, 10, 6, 3, '#c82c2c');
      fillRect(ctx, 6, 13, 4, 1, '#a32121');
      // Seeds
      px(ctx, 6, 7, '#ffe082');
      px(ctx, 9, 7, '#ffe082');
      px(ctx, 7, 10, '#ffe082');
      px(ctx, 5, 6, '#ff7575');
      this.registerCanvas('crop_strawberry', c);
    }

    // Golden Pumpkin
    {
      const c = createCanvas(16, 16);
      const ctx = getCtx(c);
      fillRect(ctx, 7, 2, 2, 3, '#4c872b');
      fillRect(ctx, 8, 2, 2, 1, '#70b341');
      fillRect(ctx, 3, 5, 10, 8, '#e8831c');
      fillRect(ctx, 4, 4, 8, 10, '#f59c2a');
      fillRect(ctx, 6, 5, 4, 8, '#ffb648');
      // Ribs
      fillRect(ctx, 5, 5, 1, 8, '#c76912');
      fillRect(ctx, 10, 5, 1, 8, '#c76912');
      this.registerCanvas('crop_pumpkin', c);
    }
  }

  /* =========================================================
     4. CROP GROWTH STAGES (16x20)
     ========================================================= */
  private bakeCropStages(): void {
    const cropIds = ['parsnip', 'tulip', 'strawberry', 'pumpkin'] as const;

    for (const id of cropIds) {
      // Stage 0: freshly planted seeds
      {
        const c = createCanvas(16, 20);
        const ctx = getCtx(c);
        const seedCol = id === 'pumpkin' ? '#f2cf8d' : id === 'tulip' ? '#d4a373' : '#e6c98a';
        fillRect(ctx, 4, 12, 2, 2, seedCol);
        fillRect(ctx, 9, 14, 2, 2, seedCol);
        fillRect(ctx, 10, 10, 2, 1, seedCol);
        fillRect(ctx, 6, 15, 2, 1, '#8c6239');
        this.registerCanvas(`crop_${id}_0`, c);
      }

      // Stage 1: tender green sprout
      {
        const c = createCanvas(16, 20);
        const ctx = getCtx(c);
        fillRect(ctx, 7, 11, 2, 5, '#4b8f2b');
        fillRect(ctx, 4, 10, 3, 2, '#7bc948');
        fillRect(ctx, 9, 10, 3, 2, '#8cd656');
        this.registerCanvas(`crop_${id}_1`, c);
      }

      // Stage 2: medium bushy growth
      {
        const c = createCanvas(16, 20);
        const ctx = getCtx(c);
        fillRect(ctx, 6, 9, 4, 7, '#3f7f25');
        fillRect(ctx, 3, 8, 10, 5, '#5ca835');
        fillRect(ctx, 5, 6, 6, 4, '#7ec94b');
        if (id === 'tulip') {
          fillRect(ctx, 7, 5, 2, 2, '#f598b5');
        } else if (id === 'strawberry') {
          px(ctx, 5, 10, '#fff7d6');
          px(ctx, 10, 9, '#fff7d6');
        } else if (id === 'pumpkin') {
          fillRect(ctx, 2, 12, 12, 2, '#4f912d');
        }
        this.registerCanvas(`crop_${id}_2`, c);
      }

      // Stage 3: mature harvest-ready!
      {
        const c = createCanvas(16, 20);
        const ctx = getCtx(c);
        if (id === 'parsnip') {
          // Lush green fronds + plump cream root peeking out
          fillRect(ctx, 4, 3, 8, 6, '#5aa833');
          fillRect(ctx, 3, 5, 10, 4, '#7ed14b');
          fillRect(ctx, 6, 2, 4, 3, '#9be364');
          fillRect(ctx, 5, 10, 6, 6, '#f6e2b4');
          fillRect(ctx, 6, 11, 4, 4, '#fff6de');
          fillRect(ctx, 6, 16, 4, 1, '#cfb074');
        } else if (id === 'tulip') {
          fillRect(ctx, 7, 9, 2, 8, '#468a29');
          fillRect(ctx, 4, 12, 3, 4, '#6ab83d');
          fillRect(ctx, 9, 11, 3, 4, '#6ab83d');
          fillRect(ctx, 4, 3, 8, 7, '#ed5b89');
          fillRect(ctx, 5, 2, 6, 4, '#ff8eb0');
          fillRect(ctx, 6, 4, 4, 2, '#ffd0df');
        } else if (id === 'strawberry') {
          fillRect(ctx, 2, 6, 12, 10, '#3b7a24');
          fillRect(ctx, 3, 5, 10, 8, '#58a334');
          fillRect(ctx, 5, 4, 6, 4, '#7ac74a');
          // Three plump red berries
          fillRect(ctx, 4, 10, 3, 4, '#e33939');
          px(ctx, 5, 11, '#ffcf70');
          fillRect(ctx, 9, 11, 3, 4, '#e33939');
          px(ctx, 10, 12, '#ffcf70');
          fillRect(ctx, 7, 7, 3, 3, '#f04b4b');
        } else {
          // Big ribbed golden pumpkin
          fillRect(ctx, 2, 13, 12, 3, '#438226');
          fillRect(ctx, 7, 4, 2, 3, '#4c872b');
          fillRect(ctx, 2, 7, 12, 9, '#e07a19');
          fillRect(ctx, 3, 6, 10, 10, '#f59a27');
          fillRect(ctx, 6, 7, 4, 8, '#ffba4c');
          fillRect(ctx, 5, 7, 1, 9, '#ba6010');
          fillRect(ctx, 10, 7, 1, 9, '#ba6010');
        }
        this.registerCanvas(`crop_${id}_3`, c);
      }
    }
  }

  /* =========================================================
     5. PLAYER SPRITES (16x24, 4 dirs x 3 frames)
     ========================================================= */
  private bakePlayerSprites(): void {
    const dirs = ['down', 'up', 'left', 'right'] as const;
    for (const dir of dirs) {
      for (let frame = 0; frame < 3; frame++) {
        this.registerCanvas(`player_${dir}_${frame}`, buildPlayerFrame(dir, frame));
      }
    }
  }
}

/* ---------------- Helper pixel drawing utilities ---------------- */

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

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(source.width, source.height);
  const ctx = getCtx(c);
  ctx.drawImage(source, 0, 0);
  return c;
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

function drawTinyFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  petal: string,
  center: string
): void {
  px(ctx, x, y - 1, petal);
  px(ctx, x, y + 1, petal);
  px(ctx, x - 1, y, petal);
  px(ctx, x + 1, y, petal);
  px(ctx, x, y, center);
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
  mid: string,
  dark: string
): void {
  fillRect(ctx, x, y, w, h, mid);
  fillRect(ctx, x, y, w - 1, 1, light);
  fillRect(ctx, x, y, 1, h - 1, light);
  fillRect(ctx, x, y + h - 1, w, 1, dark);
  fillRect(ctx, x + w - 1, y, 1, h, dark);
}

function buildSoilTile(base: string, furrow: string, ridge: string, border: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  fillRect(ctx, 0, 0, 16, 16, border);
  fillRect(ctx, 1, 1, 14, 14, base);
  // Horizontal tilled furrows
  for (const fy of [3, 7, 11]) {
    fillRect(ctx, 2, fy, 12, 1, ridge);
    fillRect(ctx, 2, fy + 1, 12, 1, furrow);
  }
  return c;
}

function drawCottageWindow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  fillRect(ctx, x, y, 12, 12, '#69391b');
  fillRect(ctx, x + 1, y + 1, 10, 10, '#8dd5f5');
  fillRect(ctx, x + 2, y + 2, 3, 3, '#c8f0ff');
  // Window mullions
  fillRect(ctx, x + 5, y + 1, 2, 10, '#69391b');
  fillRect(ctx, x + 1, y + 5, 10, 2, '#69391b');
  // Flower box
  fillRect(ctx, x - 1, y + 12, 14, 4, '#8d5027');
  fillRect(ctx, x, y + 10, 12, 2, '#5aa633');
  px(ctx, x + 2, y + 10, '#ff7ca3');
  px(ctx, x + 6, y + 10, '#ffe26a');
  px(ctx, x + 9, y + 10, '#ff7ca3');
}

function buildSeedPacket(accent: string, leaf: string): HTMLCanvasElement {
  const c = createCanvas(16, 16);
  const ctx = getCtx(c);
  // Kraft paper envelope
  fillRect(ctx, 3, 2, 10, 12, '#8b5c34');
  fillRect(ctx, 4, 3, 8, 10, '#e8c896');
  fillRect(ctx, 4, 3, 8, 2, '#d1ab72');
  // Crop emblem inside packet
  fillRect(ctx, 6, 7, 4, 4, accent);
  fillRect(ctx, 7, 5, 2, 2, leaf);
  return c;
}

function buildPlayerFrame(dir: 'down' | 'up' | 'left' | 'right', frame: number): HTMLCanvasElement {
  const c = createCanvas(16, 24);
  const ctx = getCtx(c);

  const bob = frame === 0 ? 0 : -1;
  const leftLegOff = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const rightLegOff = -leftLegOff;

  // Ground shadow
  fillEllipse(ctx, 8, 22, 5, 2, 'rgba(20, 32, 16, 0.32)');

  // Boots / legs
  fillRect(ctx, 5, 19 + Math.max(0, leftLegOff), 3, 3, '#5c331a');
  fillRect(ctx, 8, 19 + Math.max(0, rightLegOff), 3, 3, '#5c331a');

  // Denim overalls & cream shirt
  fillRect(ctx, 4, 12 + bob, 8, 8, '#3d6ea8');
  fillRect(ctx, 5, 13 + bob, 6, 3, '#f5ebd6');
  fillRect(ctx, 5, 14 + bob, 1, 4, '#3d6ea8'); // left strap
  fillRect(ctx, 10, 14 + bob, 1, 4, '#3d6ea8'); // right strap
  fillRect(ctx, 6, 16 + bob, 4, 3, '#4c80bd'); // bib highlight

  // Arms
  if (dir === 'left' || dir === 'right') {
    const swing = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    fillRect(ctx, 6 + swing, 13 + bob, 3, 5, '#f2c9a0');
  } else {
    fillRect(ctx, 3, 13 + bob + (frame === 1 ? 1 : 0), 1, 4, '#f2c9a0');
    fillRect(ctx, 12, 13 + bob + (frame === 2 ? 1 : 0), 1, 4, '#f2c9a0');
  }

  // Head
  fillRect(ctx, 4, 5 + bob, 8, 7, '#f5cba0');
  // Hair back/sides
  fillRect(ctx, 4, 5 + bob, 8, 2, '#6b3e21');
  if (dir === 'up') {
    fillRect(ctx, 4, 6 + bob, 8, 5, '#6b3e21');
  } else if (dir === 'down') {
    px(ctx, 6, 9 + bob, '#2e1b10');
    px(ctx, 9, 9 + bob, '#2e1b10');
    px(ctx, 5, 10 + bob, '#eba08e'); // rosy cheek
    px(ctx, 10, 10 + bob, '#eba08e');
  } else if (dir === 'left') {
    fillRect(ctx, 9, 6 + bob, 3, 5, '#6b3e21');
    px(ctx, 5, 9 + bob, '#2e1b10');
    px(ctx, 6, 10 + bob, '#eba08e');
  } else {
    fillRect(ctx, 4, 6 + bob, 3, 5, '#6b3e21');
    px(ctx, 10, 9 + bob, '#2e1b10');
    px(ctx, 9, 10 + bob, '#eba08e');
  }

  // Iconic warm straw sun hat with red ribbon
  fillRect(ctx, 2, 4 + bob, 12, 2, '#e8bc5a');
  fillRect(ctx, 4, 2 + bob, 8, 3, '#f4cf72');
  fillRect(ctx, 4, 4 + bob, 8, 1, '#c94338'); // red ribbon
  fillRect(ctx, 3, 5 + bob, 10, 1, '#c29237');

  return c;
}
