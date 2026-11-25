import './styles/main.css';

import { GameWorld } from './core/GameWorld';
import type { GameEvents } from './data/events';
import { AudioManager } from './engine/AudioManager';
import { EventBus } from './engine/EventBus';
import { GameLoop } from './engine/GameLoop';
import { InputManager } from './engine/InputManager';
import { SaveManager } from './engine/SaveManager';
import { loadRealCatSpriteAssets } from './engine/PixelArtPets';
import { SpriteAtlas } from './engine/SpriteAtlas';
import { FarmScene } from './scenes/FarmScene';
import { HouseInteriorScene } from './scenes/HouseInteriorScene';
import { MineScene } from './scenes/MineScene';
import { SceneManager } from './scenes/SceneManager';
import { TownScene } from './scenes/TownScene';
import { HudController } from './ui/HudController';

/**
 * Sunmeadow Valley — Application Bootstrap
 * Wires together the core engine, shared GameWorld, all 4 playable scenes
 * (Farm, House Interior, Sunmeadow Town, Underground Mines), HUD, and game loop.
 */
function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Could not find #game-canvas element');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D rendering context');

  const bus = new EventBus<GameEvents>();
  const atlas = new SpriteAtlas();
  const audio = new AudioManager();
  const saveManager = new SaveManager();
  const sceneManager = new SceneManager();

  let world: GameWorld;
  let hud: HudController;

  const input = new InputManager(canvas, {
    onPrimaryClick: (x, y) => sceneManager.active?.handlePrimaryClick(x, y),
    onSecondaryClick: (x, y) => sceneManager.active?.handleSecondaryClick(x, y),
    onHotbarSelect: (index) => {
      world.inventory.selectSlot(index);
      audio.play('ui');
      bus.emit('inventory:changed', undefined);
    },
    onHotbarWheel: (delta) => {
      world.inventory.cycleSlot(delta);
      bus.emit('inventory:changed', undefined);
    },
    onActionKey: () => sceneManager.active?.handleActionKey(),
    onInteractKey: () => sceneManager.active?.handleInteractKey(),
    onShortcutKey: (code) => {
      if (code === 'Escape') {
        if (world.fishing.isActive()) {
          world.fishing.cancel();
          bus.emit('fishing:stateChanged', { active: false });
        } else if (hud.hasOpenModal()) {
          hud.closeModals();
        } else if (world.decorateMode) {
          world.setDecorateMode(false);
        }
      } else if (code === 'KeyB') {
        audio.play('ui');
        hud.openShop();
      } else if (code === 'KeyN') {
        hud.closeModals();
        world.triggerSleep();
      } else if (code === 'KeyF') {
        hud.toggleDecorateMode();
      } else if (code === 'KeyV') {
        audio.play('ui');
        hud.openVillagers();
      } else if (code === 'KeyI') {
        audio.play('ui');
        hud.openBackpack();
      } else if (code === 'KeyK') {
        audio.play('ui');
        hud.openCrafting();
      } else if (code === 'KeyJ') {
        audio.play('ui');
        hud.openQuests();
      } else if (code === 'KeyC') {
        audio.play('ui');
        hud.openBundles();
      } else if (code === 'KeyM') {
        audio.play('ui');
        hud.openMap();
      } else if (code === 'KeyP') {
        audio.play('ui');
        hud.openPets();
      } else if (code === 'KeyL') {
        audio.play('ui');
        hud.openBirthday();
      } else if (code === 'KeyH') {
        audio.play('ui');
        hud.openHelp();
      }
    },
  });

  world = new GameWorld({
    bus,
    atlas,
    audio,
    saveManager,
    input,
  });

  const farmScene = new FarmScene(world);
  const houseScene = new HouseInteriorScene(world);
  const townScene = new TownScene(world);
  const mineScene = new MineScene(world);

  sceneManager.register(farmScene);
  sceneManager.register(houseScene);
  sceneManager.register(townScene);
  sceneManager.register(mineScene);

  world.bindSceneSwitcher((target, spawnTile) => {
    if (spawnTile) {
      world.player.setPositionTile(spawnTile.x, spawnTile.y, spawnTile.facing ?? 'down');
    }
    sceneManager.switchTo(target);
  });

  hud = new HudController(world);

  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  const resizeCanvas = (): void => {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewportWidth * dpr);
    canvas.height = Math.floor(viewportHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    sceneManager.onViewportResize(viewportWidth, viewportHeight);
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const loaded = world.loadGameState();
  sceneManager.switchTo(world.currentSceneId);
  world.emitAllHudSync();

  // Hot-swap in the real-photo-derived high-fidelity pixel portraits & sprites for both cats
  void loadRealCatSpriteAssets(atlas).then(() => {
    bus.emit('pet:changed', undefined);
  });

  if (loaded) {
    world.toast(`欢迎回到晨露谷！已读取${world.time.season}第 ${world.time.day} 天存档`);
  } else {
    world.toast('欢迎来到晨露谷！种田、钓鱼、砍树挖矿、造机器、养动物、探索小镇尽情体验！');
  }

  // Support direct romantic link (#1203 / #birthday / ?yiyi) to open Yiyi's 12.03 Birthday Screen immediately!
  const urlTag = `${window.location.hash} ${window.location.search}`.toLowerCase();
  if (urlTag.includes('1203') || urlTag.includes('birthday') || urlTag.includes('yiyi')) {
    hud.openBirthday();
  }

  const loop = new GameLoop({
    update: (dt) => {
      if (!hud.hasOpenModal()) {
        sceneManager.update(dt);
      }
    },
    render: () => {
      if (hud.isBirthdayOpen()) return;
      sceneManager.render(ctx, viewportWidth, viewportHeight);
      hud.renderFrameHud();
    },
  });

  loop.start();
}

bootstrap();
