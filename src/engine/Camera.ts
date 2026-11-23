/**
 * 2D pixel-snapped camera with smooth exponential damping and world bounds clamping.
 * Operates in logical world pixels; renderer applies integer zoom scaling.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom: number;
  viewportWidth = 800;
  viewportHeight = 600;
  private worldWidth: number;
  private worldHeight: number;
  private readonly smoothing: number;

  constructor(worldWidth: number, worldHeight: number, zoom = 3, smoothing = 8) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.zoom = zoom;
    this.smoothing = smoothing;
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clamp();
  }

  setWorldBounds(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.clamp();
  }

  snapTo(targetX: number, targetY: number): void {
    this.x = targetX - this.viewWorldWidth / 2;
    this.y = targetY - this.viewWorldHeight / 2;
    this.clamp();
  }

  follow(targetX: number, targetY: number, dt: number): void {
    const desiredX = targetX - this.viewWorldWidth / 2;
    const desiredY = targetY - this.viewWorldHeight / 2;
    const factor = 1 - Math.exp(-this.smoothing * dt);
    this.x += (desiredX - this.x) * factor;
    this.y += (desiredY - this.y) * factor;
    this.clamp();
  }

  get viewWorldWidth(): number {
    return this.viewportWidth / this.zoom;
  }

  get viewWorldHeight(): number {
    return this.viewportHeight / this.zoom;
  }

  /** Integer pixel offset to prevent sub-pixel shimmer on tile edges */
  get renderX(): number {
    return Math.round(this.x * this.zoom) / this.zoom;
  }

  get renderY(): number {
    return Math.round(this.y * this.zoom) / this.zoom;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom + this.renderX,
      y: screenY / this.zoom + this.renderY,
    };
  }

  private clamp(): void {
    const vw = this.viewWorldWidth;
    const vh = this.viewWorldHeight;

    if (vw >= this.worldWidth) {
      this.x = (this.worldWidth - vw) / 2;
    } else {
      this.x = Math.max(0, Math.min(this.worldWidth - vw, this.x));
    }

    if (vh >= this.worldHeight) {
      this.y = (this.worldHeight - vh) / 2;
    } else {
      this.y = Math.max(0, Math.min(this.worldHeight - vh, this.y));
    }
  }
}
