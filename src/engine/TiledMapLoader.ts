export interface TiledLayerJson {
  name: string;
  type: 'tilelayer' | 'objectgroup';
  width?: number;
  height?: number;
  data?: number[];
  objects?: {
    id: number;
    name: string;
    type?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: { name: string; value: unknown }[];
  }[];
}

export interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayerJson[];
}

export interface ParsedTiledObject {
  id: number;
  name: string;
  type: string;
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  properties: Record<string, unknown>;
}

export interface ParsedTiledMap {
  cols: number;
  rows: number;
  tileSize: number;
  groundGids: number[][];
  collisionGrid: boolean[][];
  objects: ParsedTiledObject[];
}

/**
 * Standard Tiled JSON (.tmj / .json) map parser.
 * Allows external Tiled Editor maps to plug cleanly into Sunmeadow Valley scenes.
 */
export function parseTiledMapJson(json: TiledMapJson): ParsedTiledMap {
  const cols = json.width;
  const rows = json.height;
  const tileSize = json.tilewidth || 16;

  const groundGids: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );
  const collisionGrid: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  );
  const objects: ParsedTiledObject[] = [];

  for (const layer of json.layers) {
    if (layer.type === 'tilelayer' && Array.isArray(layer.data)) {
      const lower = layer.name.toLowerCase();
      const isCollision = lower.includes('collision') || lower.includes('solid');
      const isGround = lower.includes('ground') || lower.includes('terrain');

      for (let i = 0; i < layer.data.length; i++) {
        const gid = layer.data[i];
        const x = i % cols;
        const y = Math.floor(i / cols);
        if (y >= rows) continue;

        if (isCollision && gid > 0) {
          collisionGrid[y][x] = true;
        } else if (isGround) {
          groundGids[y][x] = gid;
        }
      }
    } else if (layer.type === 'objectgroup' && Array.isArray(layer.objects)) {
      for (const obj of layer.objects) {
        const props: Record<string, unknown> = {};
        if (Array.isArray(obj.properties)) {
          for (const p of obj.properties) {
            props[p.name] = p.value;
          }
        }
        objects.push({
          id: obj.id,
          name: obj.name,
          type: obj.type ?? '',
          tileX: Math.floor(obj.x / tileSize),
          tileY: Math.floor(obj.y / tileSize),
          widthTiles: Math.max(1, Math.round(obj.width / tileSize)),
          heightTiles: Math.max(1, Math.round(obj.height / tileSize)),
          properties: props,
        });
      }
    }
  }

  return {
    cols,
    rows,
    tileSize,
    groundGids,
    collisionGrid,
    objects,
  };
}

export async function loadTiledMapFromUrl(url: string): Promise<ParsedTiledMap> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load Tiled map at ${url}: HTTP ${res.status}`);
  }
  const json = (await res.json()) as TiledMapJson;
  return parseTiledMapJson(json);
}
