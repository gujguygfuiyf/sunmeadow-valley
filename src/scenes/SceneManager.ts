import type { SceneId } from '../data/events';

export interface Scene {
  readonly id: SceneId;
  enter(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void;
  exit(): void;
  onViewportResize(width: number, height: number): void;
  handlePrimaryClick(screenX: number, screenY: number): void;
  handleSecondaryClick(screenX: number, screenY: number): void;
  handleActionKey(): void;
  handleInteractKey(): void;
}

/**
 * Scene registry and lifecycle manager for seamless multi-map switching
 * (FarmScene <-> HouseInteriorScene <-> TownScene).
 */
export class SceneManager {
  private readonly scenes = new Map<SceneId, Scene>();
  private currentScene: Scene | null = null;

  register(scene: Scene): void {
    this.scenes.set(scene.id, scene);
  }

  get active(): Scene | null {
    return this.currentScene;
  }

  switchTo(sceneId: SceneId): Scene | null {
    const next = this.scenes.get(sceneId);
    if (!next) return null;
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentScene = next;
    this.currentScene.enter();
    return next;
  }

  onViewportResize(width: number, height: number): void {
    for (const scene of this.scenes.values()) {
      scene.onViewportResize(width, height);
    }
  }

  update(dt: number): void {
    this.currentScene?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number): void {
    this.currentScene?.render(ctx, viewportWidth, viewportHeight);
  }
}
