export interface MousePointerState {
  screenX: number;
  screenY: number;
  isInsideCanvas: boolean;
  isPrimaryDown: boolean;
}

export interface InputCallbacks {
  onPrimaryClick?: (screenX: number, screenY: number) => void;
  onSecondaryClick?: (screenX: number, screenY: number) => void;
  onHotbarSelect?: (index: number) => void;
  onHotbarWheel?: (delta: number) => void;
  onActionKey?: () => void;
  onInteractKey?: () => void;
  onShortcutKey?: (code: string) => void;
}

/**
 * Centralized keyboard and pointer input manager.
 * Tracks held Space / Mouse button for Fishing mini-game and blocks gameplay keys during modals.
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly callbacks: InputCallbacks;
  private readonly keysDown = new Set<string>();
  private blocked = false;

  readonly pointer: MousePointerState = {
    screenX: 0,
    screenY: 0,
    isInsideCanvas: false,
    isPrimaryDown: false,
  };

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;
    if (blocked) {
      this.keysDown.clear();
      this.pointer.isPrimaryDown = false;
    }
  }

  /** Used by Fishing mini-game to detect holding Space or Primary mouse button. */
  isReelHeld(): boolean {
    return this.pointer.isPrimaryDown || this.keysDown.has('Space');
  }

  getMovementVector(): { dx: number; dy: number } {
    if (this.blocked) return { dx: 0, dy: 0 };

    let dx = 0;
    let dy = 0;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) dx -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) dx += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) dy -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = Math.SQRT1_2;
      dx *= inv;
      dy *= inv;
    }

    return { dx, dy };
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const isTypingInput =
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement;

    if (event.code === 'Escape') {
      this.callbacks.onShortcutKey?.('Escape');
      return;
    }

    if (isTypingInput) {
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();
      this.callbacks.onShortcutKey?.('KeyI');
      return;
    }

    // Track Space even while fishing overlay is active
    if (event.code === 'Space') {
      event.preventDefault();
      const wasDown = this.keysDown.has('Space');
      this.keysDown.add('Space');
      if (!this.blocked && !wasDown) {
        this.callbacks.onActionKey?.();
      }
      return;
    }

    if (this.blocked) return;

    if (
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault();
    }

    const wasDown = this.keysDown.has(event.code);
    this.keysDown.add(event.code);
    if (wasDown) return;

    if (event.code.startsWith('Digit')) {
      const num = Number(event.code.slice(5));
      if (num >= 1 && num <= 9) {
        this.callbacks.onHotbarSelect?.(num - 1);
      }
      return;
    }

    if (event.code === 'KeyE') {
      this.callbacks.onInteractKey?.();
      return;
    }

    const shortcutCodes = new Set([
      'KeyB',
      'KeyN',
      'KeyH',
      'KeyF',
      'KeyV',
      'KeyI',
      'KeyK',
      'KeyJ',
      'KeyC',
      'KeyM',
      'KeyP',
    ]);
    if (shortcutCodes.has(event.code)) {
      this.callbacks.onShortcutKey?.(event.code);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
  };

  private handleBlur = (): void => {
    this.keysDown.clear();
    this.pointer.isPrimaryDown = false;
  };

  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.screenX = event.clientX - rect.left;
    this.pointer.screenY = event.clientY - rect.top;
    this.pointer.isInsideCanvas = true;
  };

  private handleMouseLeave = (): void => {
    this.pointer.isInsideCanvas = false;
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.pointer.isPrimaryDown = true;
    }
    if (this.blocked) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.pointer.screenX = x;
    this.pointer.screenY = y;

    if (event.button === 0) {
      this.callbacks.onPrimaryClick?.(x, y);
    } else if (event.button === 2) {
      this.callbacks.onSecondaryClick?.(x, y);
    }
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.pointer.isPrimaryDown = false;
    }
  };

  private handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private handleWheel = (event: WheelEvent): void => {
    if (this.blocked) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    this.callbacks.onHotbarWheel?.(delta);
  };
}
