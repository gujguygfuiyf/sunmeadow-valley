import type { GameWorld } from '../core/GameWorld';
import { ANIMAL_CATALOG, FARM_BUILDINGS, type AnimalKind, type BuildingKind } from '../data/animals';
import { COLLECTION_GROUPS, COMMUNITY_BUNDLES } from '../data/bundles';
import { CRAFTING_RECIPES } from '../data/crafting';
import { getCropDef } from '../data/crops';
import type {
  DaySummaryPayload,
  DialoguePayload,
  SceneId,
  TileInspectPayload,
  TvBroadcastPayload,
} from '../data/events';
import { FURNITURE_SHOP_IDS, getFurnitureDef } from '../data/furniture';
import {
  getItemDef,
  getSeedsForSeason,
  type UpgradeableToolKind,
} from '../data/items';
import {
  TOOL_TIERS,
  UPGRADEABLE_TOOL_NAMES,
  UPGRADEABLE_TOOL_SPRITES,
} from '../data/mining';
import { getNpcDef, NPC_IDS } from '../data/npcs';
import { CAT_BREED_IDS, getCatBreedDef, type CatBreedId } from '../data/pets';
import { COOKING_RECIPES } from '../data/recipes';
import { MAX_HEARTS } from '../systems/NpcSystem';
import { PET_MAX_FRIENDSHIP, PET_MAX_HEARTS } from '../systems/PetSystem';
import { BirthdayOverlay } from './BirthdayOverlay';
import { MinimapRenderer } from './MinimapRenderer';

type ModalKind =
  | 'shop'
  | 'furniture'
  | 'blacksmith'
  | 'villagers'
  | 'pets'
  | 'birthday'
  | 'backpack'
  | 'chest'
  | 'crafting'
  | 'cooking'
  | 'quests'
  | 'bundles'
  | 'map'
  | 'tv'
  | 'dialogue'
  | 'summary'
  | 'help'
  | null;

/**
 * Unified HUD & Modal Controller syncing all 5 feature pillars via EventBus + GameWorld.
 */
export class HudController {
  private readonly world: GameWorld;
  private readonly minimap: MinimapRenderer;
  private readonly birthdayOverlay: BirthdayOverlay;

  // Core HUD elements
  private readonly locationEl = mustGetEl('hud-location');
  private readonly weatherEl = mustGetEl('hud-weather');
  private readonly festivalBannerEl = mustGetEl('hud-festival-banner');
  private readonly festivalNameEl = mustGetEl('hud-festival-name');

  private readonly mineHudEl = mustGetEl('mine-hud');
  private readonly mineFloorEl = mustGetEl('mine-floor-label');
  private readonly mineSlimesEl = mustGetEl('mine-slimes-label');

  private readonly seasonEl = mustGetEl('hud-season');
  private readonly dayEl = mustGetEl('hud-day');
  private readonly timeEl = mustGetEl('hud-time');
  private readonly phaseEl = mustGetEl('hud-dayphase');
  private readonly goldEl = mustGetEl('hud-gold');
  private readonly energyFillEl = mustGetEl('hud-energy-fill');
  private readonly energyTextEl = mustGetEl('hud-energy-text');
  private readonly hpFillEl = mustGetEl('hud-hp-fill');
  private readonly hpTextEl = mustGetEl('hud-hp-text');

  private readonly inspectorEl = mustGetEl('tile-inspector');
  private readonly inspectorNameEl = mustGetEl('inspector-name');
  private readonly inspectorPillEl = mustGetEl('inspector-water-pill');
  private readonly inspectorFillEl = mustGetEl('inspector-progress-fill');
  private readonly inspectorMetaEl = mustGetEl('inspector-meta');

  private readonly hotbarWrapEl = mustGetEl('hud-hotbar-wrap');
  private readonly hotbarEl = mustGetEl('hotbar-slots');
  private readonly selectedNameEl = mustGetEl('selected-item-name');
  private readonly selectedDescEl = mustGetEl('selected-item-desc');
  private readonly contextPromptEl = mustGetEl('context-prompt');
  private readonly toastContainerEl = mustGetEl('toast-container');

  // Fishing overlay
  private readonly fishingOverlayEl = mustGetEl('fishing-overlay');
  private readonly fishingTitleEl = mustGetEl('fishing-status-title');
  private readonly fishingBarEl = mustGetEl('fishing-bar');
  private readonly fishingFishEl = mustGetEl('fishing-fish');
  private readonly fishingProgEl = mustGetEl('fishing-progress-fill');

  // House decoration
  private readonly decorateBtnEl = mustGetEl('btn-decorate');
  private readonly decorateDockEl = mustGetEl('decorate-dock');
  private readonly decorateListEl = mustGetEl('decorate-furniture-list');

  // Dialogue
  private readonly dialogueModalEl = mustGetEl('modal-dialogue');
  private readonly dialoguePortraitEl = mustGetEl('dialogue-portrait') as HTMLImageElement;
  private readonly dialogueNameEl = mustGetEl('dialogue-npc-name');
  private readonly dialogueRoleEl = mustGetEl('dialogue-npc-role');
  private readonly dialogueHeartsEl = mustGetEl('dialogue-hearts');
  private readonly dialogueEventBannerEl = mustGetEl('dialogue-event-banner');
  private readonly dialogueTextEl = mustGetEl('dialogue-text');
  private readonly dialogueRewardEl = mustGetEl('dialogue-reward-note');
  private readonly dialogueGiftBtnsEl = mustGetEl('dialogue-gift-buttons');
  private readonly dialogueShopBtnEl = mustGetEl('btn-dialogue-shop');

  // All modal backdrops
  private readonly backpackModalEl = mustGetEl('modal-backpack');
  private readonly backpackGridEl = mustGetEl('backpack-grid');
  private readonly backpackDetailEl = mustGetEl('backpack-detail-text');
  private readonly backpackEatBtnEl = mustGetEl('btn-backpack-eat');

  private readonly chestModalEl = mustGetEl('modal-chest');
  private readonly chestGridEl = mustGetEl('chest-grid');
  private readonly chestBackpackGridEl = mustGetEl('chest-backpack-grid');

  private readonly craftingModalEl = mustGetEl('modal-crafting');
  private readonly craftingListEl = mustGetEl('crafting-list');

  private readonly cookingModalEl = mustGetEl('modal-cooking');
  private readonly cookingListEl = mustGetEl('cooking-list');

  private readonly shopModalEl = mustGetEl('modal-shop');
  private readonly shopSubtitleEl = mustGetEl('shop-subtitle');
  private readonly shopGoldEl = mustGetEl('shop-gold-value');
  private readonly shopSeedListEl = mustGetEl('shop-seed-list');
  private readonly shopSellListEl = mustGetEl('shop-sell-list');

  private readonly furnitureModalEl = mustGetEl('modal-furniture');
  private readonly furnitureGoldEl = mustGetEl('furniture-gold-value');
  private readonly robinContentEl = mustGetEl('robin-tab-content');

  private readonly blacksmithModalEl = mustGetEl('modal-blacksmith');
  private readonly blacksmithWalletEl = mustGetEl('blacksmith-wallet');
  private readonly blacksmithListEl = mustGetEl('blacksmith-list');

  private readonly questsModalEl = mustGetEl('modal-quests');
  private readonly questContentEl = mustGetEl('quest-content');

  private readonly bundlesModalEl = mustGetEl('modal-bundles');
  private readonly bundlesSubtitleEl = mustGetEl('bundles-subtitle');
  private readonly bundlesContentEl = mustGetEl('bundles-tab-content');

  private readonly mapModalEl = mustGetEl('modal-map');
  private readonly mapStatusEl = mustGetEl('map-fast-travel-status');
  private readonly mapGridEl = mustGetEl('world-map-grid');

  private readonly tvModalEl = mustGetEl('modal-tv');
  private readonly tvContentEl = mustGetEl('tv-content');

  private readonly villagersModalEl = mustGetEl('modal-villagers');
  private readonly villagersListEl = mustGetEl('villagers-list');

  private readonly petsModalEl = mustGetEl('modal-pets');
  private readonly petsBowlBarEl = mustGetEl('pets-bowl-bar');
  private readonly petsListEl = mustGetEl('pets-list');

  private readonly summaryModalEl = mustGetEl('modal-summary');
  private readonly summaryTitleEl = mustGetEl('summary-title');
  private readonly summaryLinesEl = mustGetEl('summary-lines');
  private readonly summaryTotalEl = mustGetEl('summary-total-gold');
  private readonly summaryGrowthEl = mustGetEl('summary-growth-note');

  private readonly helpModalEl = mustGetEl('modal-help');
  private readonly nightOverlayEl = mustGetEl('night-overlay');
  private readonly muteBtnEl = mustGetEl('btn-mute');
  private readonly bgmBtnEl = mustGetEl('btn-bgm');

  private activeModal: ModalKind = null;
  private activeDialogueShopKind: 'seeds' | 'furniture' | 'blacksmith' | undefined;
  private selectedBackpackSlot: number | null = null;
  private robinTab: 'buildings' | 'animals' | 'furniture' = 'buildings';
  private ccTab: 'bundles' | 'encyclopedia' = 'bundles';

  constructor(world: GameWorld) {
    this.world = world;
    this.minimap = new MinimapRenderer(mustGetEl('minimap-canvas') as HTMLCanvasElement);
    this.birthdayOverlay = new BirthdayOverlay(world, () => this.closeModals());
    this.bindButtons();
    this.subscribeEvents();
  }

  hasOpenModal(): boolean {
    return this.activeModal !== null;
  }

  isBirthdayOpen(): boolean {
    return this.birthdayOverlay.isOpen();
  }

  /** Called every render frame to animate the live Minimap and Fishing Mini-Game smoothly. */
  renderFrameHud(): void {
    this.minimap.render(this.world);

    if (this.world.fishing.isActive()) {
      const f = this.world.fishing;
      if (f.phase === 'waiting') {
        this.fishingTitleEl.textContent = '浮漂下沉中……等待咬钩！';
      } else {
        this.fishingTitleEl.textContent = '咬钩啦！收线追鱼！';
      }
      this.fishingBarEl.style.height = `${Math.round(f.barHeight * 100)}%`;
      this.fishingBarEl.style.bottom = `${Math.round(f.barPos * 100)}%`;
      this.fishingFishEl.style.bottom = `${Math.round(f.fishPos * 100)}%`;
      this.fishingProgEl.style.height = `${Math.round(f.progress * 100)}%`;
    }
  }

  closeModals(): void {
    if (this.activeModal === 'summary') {
      this.closeSummaryModal();
      return;
    }
    if (this.activeModal === 'dialogue') {
      this.world.closeDialogue();
    }
    if (this.activeModal === 'chest') {
      this.world.activeChestUid = null;
    }
    if (this.birthdayOverlay.isOpen()) {
      this.birthdayOverlay.close();
    }
    for (const el of this.getStandardModals()) {
      el.classList.add('hidden');
    }
    this.dialogueModalEl.classList.add('hidden');
    this.selectedBackpackSlot = null;
    this.activeModal = null;
    this.world.input.setBlocked(false);
  }

  openBackpack(): void {
    this.openStandardModal('backpack', this.backpackModalEl, () => {
      this.selectedBackpackSlot = null;
      this.renderBackpackModal();
    });
  }

  openChestModal(): void {
    this.openStandardModal('chest', this.chestModalEl, () => this.renderChestModal());
  }

  openCrafting(): void {
    this.openStandardModal('crafting', this.craftingModalEl, () => this.renderCraftingModal());
  }

  openCooking(): void {
    this.openStandardModal('cooking', this.cookingModalEl, () => this.renderCookingModal());
  }

  openShop(): void {
    this.openStandardModal('shop', this.shopModalEl, () => this.renderShopContents());
  }

  openFurnitureShop(defaultTab?: 'buildings' | 'animals' | 'furniture'): void {
    if (defaultTab) this.robinTab = defaultTab;
    this.openStandardModal('furniture', this.furnitureModalEl, () => this.renderRobinModal());
  }

  openBlacksmith(): void {
    this.openStandardModal('blacksmith', this.blacksmithModalEl, () =>
      this.renderBlacksmithModal()
    );
  }

  openQuests(): void {
    this.openStandardModal('quests', this.questsModalEl, () => this.renderQuestsModal());
  }

  openBundles(): void {
    this.openStandardModal('bundles', this.bundlesModalEl, () => this.renderBundlesModal());
  }

  openMap(): void {
    this.openStandardModal('map', this.mapModalEl, () => this.renderWorldMapModal());
  }

  openVillagers(): void {
    this.openStandardModal('villagers', this.villagersModalEl, () => this.renderVillagersPanel());
  }

  openPets(): void {
    this.openStandardModal('pets', this.petsModalEl, () => this.renderPetsModal());
  }

  openBirthday(): void {
    if (this.activeModal === 'summary') return;
    this.closeModals();
    this.birthdayOverlay.open();
    this.activeModal = 'birthday';
    this.world.input.setBlocked(true);
  }

  openHelp(): void {
    this.openStandardModal('help', this.helpModalEl, () => {});
  }

  toggleDecorateMode(): void {
    if (this.world.currentSceneId !== 'house') {
      this.world.toast('进入农舍小屋后，按 F 即可自由摆放与装修家具！');
      return;
    }
    this.world.audio.play('ui');
    this.world.setDecorateMode(!this.world.decorateMode);
  }

  private openStandardModal(kind: ModalKind, el: HTMLElement, renderFn: () => void): void {
    if (this.activeModal === 'summary') return;
    this.closeModals();
    renderFn();
    el.classList.remove('hidden');
    this.activeModal = kind;
    this.world.input.setBlocked(true);
  }

  private getStandardModals(): HTMLElement[] {
    return [
      this.backpackModalEl,
      this.chestModalEl,
      this.craftingModalEl,
      this.cookingModalEl,
      this.shopModalEl,
      this.furnitureModalEl,
      this.blacksmithModalEl,
      this.questsModalEl,
      this.bundlesModalEl,
      this.mapModalEl,
      this.tvModalEl,
      this.villagersModalEl,
      this.petsModalEl,
      this.helpModalEl,
    ];
  }

  /* =========================================================
     BUTTON & EVENT BINDINGS
     ========================================================= */

  private bindButtons(): void {
    const toggleOrOpen = (kind: ModalKind, openFn: () => void): void => {
      if (this.activeModal === kind) {
        this.closeModals();
      } else {
        this.world.audio.play('ui');
        openFn();
      }
    };

    mustGetEl('btn-sleep').addEventListener('click', () => {
      this.closeModals();
      this.world.triggerSleep();
    });
    this.decorateBtnEl.addEventListener('click', () => this.toggleDecorateMode());
    mustGetEl('btn-dock-exit').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.world.setDecorateMode(false);
    });
    mustGetEl('btn-dock-catalog').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.openFurnitureShop('furniture');
    });

    mustGetEl('btn-minimap').addEventListener('click', () => toggleOrOpen('map', () => this.openMap()));
    mustGetEl('btn-map').addEventListener('click', () => toggleOrOpen('map', () => this.openMap()));
    mustGetEl('btn-backpack').addEventListener('click', () => toggleOrOpen('backpack', () => this.openBackpack()));
    mustGetEl('btn-crafting').addEventListener('click', () => toggleOrOpen('crafting', () => this.openCrafting()));
    mustGetEl('btn-quests').addEventListener('click', () => toggleOrOpen('quests', () => this.openQuests()));
    mustGetEl('btn-bundles').addEventListener('click', () => toggleOrOpen('bundles', () => this.openBundles()));
    mustGetEl('btn-villagers').addEventListener('click', () => toggleOrOpen('villagers', () => this.openVillagers()));
    mustGetEl('btn-pets').addEventListener('click', () => toggleOrOpen('pets', () => this.openPets()));
    mustGetEl('btn-shop').addEventListener('click', () => toggleOrOpen('shop', () => this.openShop()));
    mustGetEl('btn-furniture').addEventListener('click', () => toggleOrOpen('furniture', () => this.openFurnitureShop()));
    mustGetEl('btn-blacksmith').addEventListener('click', () => toggleOrOpen('blacksmith', () => this.openBlacksmith()));
    mustGetEl('btn-help').addEventListener('click', () => toggleOrOpen('help', () => this.openHelp()));

    mustGetEl('btn-cancel-fishing').addEventListener('click', () => {
      this.world.fishing.cancel();
      this.world.bus.emit('fishing:stateChanged', { active: false });
    });

    // Mine elevator buttons
    document.querySelectorAll<HTMLButtonElement>('.mine-elev-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const floor = Number(btn.dataset.floor ?? '1');
        if (
          floor > 1 &&
          !this.world.collections.unlockedMineElevator &&
          this.world.mine.deepestFloor < floor
        ) {
          this.world.toast(`到达过第 ${floor} 层（或完成矿洞地质收集包）后即可乘电梯直达！`);
          return;
        }
        this.world.audio.play('ui');
        this.world.enterMineFloor(floor);
        this.world.toast(`电梯直达地下第 ${floor} 层！`);
      });
    });

    // Backpack sort & eat
    mustGetEl('btn-backpack-sort').addEventListener('click', () => {
      this.world.inventory.sortBackpack();
      this.world.audio.play('ui');
      this.world.bus.emit('inventory:changed', undefined);
      this.renderBackpackModal();
    });
    this.backpackEatBtnEl.addEventListener('click', () => {
      if (this.selectedBackpackSlot !== null) {
        this.world.eatFromSlot(this.selectedBackpackSlot);
        this.renderBackpackModal();
      }
    });

    // Robin tabs
    document.querySelectorAll<HTMLButtonElement>('[data-robin-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.robinTab = btn.dataset.robinTab as 'buildings' | 'animals' | 'furniture';
        this.world.audio.play('ui');
        this.renderRobinModal();
      });
    });

    // Community Center tabs
    document.querySelectorAll<HTMLButtonElement>('[data-cc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.ccTab = btn.dataset.ccTab as 'bundles' | 'encyclopedia';
        this.world.audio.play('ui');
        this.renderBundlesModal();
      });
    });

    // Close buttons
    const closeIds = [
      'btn-close-backpack',
      'btn-close-chest',
      'btn-close-crafting',
      'btn-close-cooking',
      'btn-close-shop',
      'btn-close-furniture',
      'btn-close-blacksmith',
      'btn-close-quests',
      'btn-close-bundles',
      'btn-close-map',
      'btn-close-tv',
      'btn-close-villagers',
      'btn-close-pets',
      'btn-close-help',
      'btn-dialogue-close',
    ];
    for (const id of closeIds) {
      mustGetEl(id).addEventListener('click', () => {
        this.world.audio.play('ui');
        this.closeModals();
      });
    }

    this.dialogueShopBtnEl.addEventListener('click', () => {
      const kind = this.activeDialogueShopKind;
      this.world.audio.play('ui');
      this.closeModals();
      if (kind === 'seeds') this.openShop();
      else if (kind === 'furniture') this.openFurnitureShop();
      else if (kind === 'blacksmith') this.openBlacksmith();
    });

    mustGetEl('btn-next-morning').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.closeSummaryModal();
    });

    this.bgmBtnEl.addEventListener('click', () => {
      const on = this.world.audio.toggleBgm();
      this.bgmBtnEl.textContent = on ? '音乐:开' : '音乐:关';
    });

    this.muteBtnEl.addEventListener('click', () => {
      const muted = this.world.audio.toggleMute();
      this.muteBtnEl.textContent = muted ? '音效:关' : '音效:开';
    });

    mustGetEl('btn-reset').addEventListener('click', () => {
      if (window.confirm('确定要清空当前存档并重新开始晨露谷吗？')) {
        this.closeModals();
        this.world.resetFarm();
      }
    });

    for (const backdrop of [...this.getStandardModals(), this.dialogueModalEl]) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeModals();
      });
    }
  }

  private subscribeEvents(): void {
    const bus = this.world.bus;

    bus.on('inventory:changed', () => {
      this.renderHotbar();
      if (this.activeModal === 'shop') this.renderShopContents();
      if (this.activeModal === 'backpack') this.renderBackpackModal();
      if (this.activeModal === 'chest') this.renderChestModal();
      if (this.activeModal === 'crafting') this.renderCraftingModal();
      if (this.activeModal === 'cooking') this.renderCookingModal();
      if (this.activeModal === 'blacksmith') this.renderBlacksmithModal();
      if (this.activeModal === 'furniture') this.renderRobinModal();
      if (this.activeModal === 'quests') this.renderQuestsModal();
      if (this.activeModal === 'bundles') this.renderBundlesModal();
      if (this.activeModal === 'pets') this.renderPetsModal();
    });

    bus.on('gold:changed', ({ gold }) => {
      this.goldEl.textContent = String(gold);
      this.shopGoldEl.textContent = `${gold} G`;
      if (this.activeModal === 'furniture') this.renderRobinModal();
      if (this.activeModal === 'blacksmith') this.renderBlacksmithModal();
    });

    bus.on('stats:changed', ({ energy, maxEnergy, hp, maxHp }) => {
      this.energyFillEl.style.width = `${Math.round((energy / maxEnergy) * 100)}%`;
      this.energyTextEl.textContent = String(energy);
      this.hpFillEl.style.width = `${Math.round((hp / maxHp) * 100)}%`;
      this.hpTextEl.textContent = String(hp);
    });

    bus.on('time:changed', ({ day, season, seasonId, festivalName }) => {
      this.seasonEl.textContent = season;
      this.seasonEl.className = `season-tag ${seasonId}`;
      this.dayEl.textContent = `第 ${day} 天`;
      this.timeEl.textContent = this.world.time.getFormattedClock();
      this.phaseEl.textContent = this.world.time.getDayPhaseLabel();

      if (festivalName) {
        this.festivalNameEl.textContent = festivalName;
        this.festivalBannerEl.classList.remove('hidden');
      } else {
        this.festivalBannerEl.classList.add('hidden');
      }
    });

    bus.on('weather:changed', ({ label }) => {
      this.weatherEl.textContent = label;
    });

    bus.on('scene:changed', ({ sceneId, label }) => {
      this.locationEl.textContent = label;
      const inHouse = sceneId === 'house';
      const inMine = sceneId === 'mine';
      this.decorateBtnEl.classList.toggle('hidden', !inHouse);
      this.mineHudEl.classList.toggle('hidden', !inMine);
      if (!inHouse) {
        this.decorateDockEl.classList.add('hidden');
        this.hotbarWrapEl.classList.remove('hidden');
      }
    });

    bus.on('mine:changed', ({ floor, deepestFloor, slimesRemaining }) => {
      this.mineFloorEl.textContent = `地下第 ${floor} 层`;
      this.mineSlimesEl.textContent = `史莱姆：${slimesRemaining} · 最深 ${deepestFloor}F`;
      document.querySelectorAll<HTMLButtonElement>('.mine-elev-btn').forEach((btn) => {
        const f = Number(btn.dataset.floor ?? '1');
        const unlocked =
          f === 1 || this.world.collections.unlockedMineElevator || deepestFloor >= f;
        btn.disabled = !unlocked;
      });
    });

    bus.on('fishing:stateChanged', ({ active }) => {
      this.fishingOverlayEl.classList.toggle('hidden', !active);
    });

    bus.on('house:decorateChanged', ({ active }) => {
      this.decorateBtnEl.textContent = active ? '退出装修 (F)' : '装修农舍 (F)';
      this.decorateDockEl.classList.toggle('hidden', !active);
      this.hotbarWrapEl.classList.toggle('hidden', active);
      if (active) this.renderDecorateDock();
    });

    bus.on('npc:changed', () => {
      if (this.activeModal === 'villagers') this.renderVillagersPanel();
    });
    bus.on('quests:changed', () => {
      if (this.activeModal === 'quests') this.renderQuestsModal();
    });
    bus.on('bundles:changed', () => {
      if (this.activeModal === 'bundles') this.renderBundlesModal();
      if (this.activeModal === 'map') this.renderWorldMapModal();
    });
    bus.on('livestock:changed', () => {
      if (this.activeModal === 'furniture') this.renderRobinModal();
    });
    bus.on('pet:changed', () => {
      if (this.activeModal === 'pets') this.renderPetsModal();
    });

    bus.on('chest:open', () => this.openChestModal());
    bus.on('tv:open', (payload) => this.openTvModal(payload));
    bus.on('dialogue:open', (payload) => this.openDialogue(payload));

    bus.on('context:changed', ({ prompt }) => {
      if (!prompt) {
        this.contextPromptEl.classList.add('hidden');
      } else {
        this.contextPromptEl.textContent = prompt;
        this.contextPromptEl.classList.remove('hidden');
      }
    });

    bus.on('inspector:changed', (payload) => this.renderInspector(payload));
    bus.on('toast:show', ({ message }) => this.showToast(message));
    bus.on('day:summary', (payload) => this.openSummaryWithTransition(payload));

    bus.on('ui:openShop', () => this.openShop());
    bus.on('ui:openFurnitureShop', () => this.openFurnitureShop());
    bus.on('ui:openBlacksmith', () => this.openBlacksmith());
    bus.on('ui:openVillagers', () => this.openVillagers());
    bus.on('ui:openBackpack', () => this.openBackpack());
    bus.on('ui:openCrafting', () => this.openCrafting());
    bus.on('ui:openCooking', () => this.openCooking());
    bus.on('ui:openQuests', () => this.openQuests());
    bus.on('ui:openBundles', () => this.openBundles());
    bus.on('ui:openMap', () => this.openMap());
    bus.on('ui:openPets', () => this.openPets());
    bus.on('ui:openMailboxLetter', () => this.openBirthday());
    bus.on('ui:openHelp', () => this.openHelp());
  }

  /* =========================================================
     HOTBAR & DECORATION DOCK
     ========================================================= */

  private renderHotbar(): void {
    this.hotbarEl.innerHTML = '';
    const inv = this.world.inventory;

    for (let i = 0; i < inv.hotbarSize; i++) {
      const slot = inv.slots[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hotbar-slot${i === inv.selectedSlot ? ' selected' : ''}`;
      btn.setAttribute('aria-label', `快捷栏 ${i + 1}`);
      btn.addEventListener('click', () => {
        inv.selectSlot(i);
        this.world.audio.play('ui');
        this.world.bus.emit('inventory:changed', undefined);
      });

      const keyTag = document.createElement('span');
      keyTag.className = 'slot-key';
      keyTag.textContent = String(i + 1);
      btn.appendChild(keyTag);

      if (slot) this.populateSlotVisual(btn, slot.itemId, slot.quantity);
      this.hotbarEl.appendChild(btn);
    }

    const selected = inv.getSelectedItemDef();
    if (selected) {
      let title = selected.name;
      let extra = selected.description;
      if (
        selected.toolKind === 'hoe' ||
        selected.toolKind === 'watering_can' ||
        selected.toolKind === 'axe' ||
        selected.toolKind === 'pickaxe'
      ) {
        const prefix = this.world.stats.getToolTierLabel(selected.toolKind);
        title = `${prefix}${selected.name}`;
      }
      if (selected.toolKind === 'watering_can') {
        extra = `剩余水量 ${inv.waterLevel}/${inv.maxWaterLevel}（水塘边可装满）`;
      } else if (selected.energyRestore) {
        extra = `售价 ${selected.sellPrice ?? 0}G · 食用恢复 +${selected.energyRestore} 体力（按 E 食用或送礼/加工）`;
      }
      this.selectedNameEl.textContent = title;
      this.selectedDescEl.textContent = extra;
    } else {
      this.selectedNameEl.textContent = '空手';
      this.selectedDescEl.textContent = '可采摘成熟作物、抚摸动物、进出建筑或与村民对话';
    }
  }

  private populateSlotVisual(btn: HTMLElement, itemId: string, quantity: number): void {
    const def = getItemDef(itemId);
    if (!def) return;

    const img = document.createElement('img');
    img.className = 'slot-icon';
    img.src = this.world.atlas.getIconDataUrl(def.spriteKey);
    img.alt = def.name;
    btn.appendChild(img);

    if (def.stackable && quantity > 0) {
      const qty = document.createElement('span');
      qty.className = 'slot-count';
      qty.textContent = String(quantity);
      btn.appendChild(qty);
    }

    if (
      def.toolKind === 'hoe' ||
      def.toolKind === 'watering_can' ||
      def.toolKind === 'axe' ||
      def.toolKind === 'pickaxe'
    ) {
      const tier = this.world.stats.getToolTier(def.toolKind);
      if (tier > 0) {
        const tag = document.createElement('span');
        tag.className = 'slot-tier-tag';
        tag.textContent = TOOL_TIERS[tier]?.prefix.slice(0, 1) ?? '';
        btn.appendChild(tag);
      }
    }

    if (def.toolKind === 'watering_can') {
      const inv = this.world.inventory;
      const bar = document.createElement('div');
      bar.className = 'slot-water-bar';
      const fill = document.createElement('div');
      fill.className = 'slot-water-fill';
      fill.style.width = `${Math.round((inv.waterLevel / inv.maxWaterLevel) * 100)}%`;
      bar.appendChild(fill);
      btn.appendChild(bar);
    }
  }

  private renderDecorateDock(): void {
    this.decorateListEl.innerHTML = '';
    const owned = this.world.house.getOwnedFurnitureList();
    if (owned.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.style.width = '100%';
      empty.textContent = '收纳箱空啦！右键可收回地板家具，或点【去买家具】选购新品。';
      this.decorateListEl.appendChild(empty);
      return;
    }

    for (const { furnitureId, quantity } of owned) {
      const def = getFurnitureDef(furnitureId);
      if (!def) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `furn-chip${this.world.selectedFurnitureId === furnitureId ? ' selected' : ''}`;
      chip.addEventListener('click', () => {
        this.world.audio.play('ui');
        this.world.selectFurnitureToPlace(furnitureId);
      });
      const img = document.createElement('img');
      img.src = this.world.atlas.getIconDataUrl(def.spriteKey);
      img.alt = def.name;
      chip.appendChild(img);
      const label = document.createElement('span');
      label.textContent = `${def.name} ×${quantity}`;
      chip.appendChild(label);
      this.decorateListEl.appendChild(chip);
    }
  }

  /* =========================================================
     BACKPACK & STORAGE CHEST MODALS
     ========================================================= */

  private renderBackpackModal(): void {
    this.backpackGridEl.innerHTML = '';
    const inv = this.world.inventory;

    for (let i = 0; i < inv.slots.length; i++) {
      const slot = inv.slots[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `inv-slot${i < inv.hotbarSize ? ' hotbar-row' : ''}${
        this.selectedBackpackSlot === i ? ' selected' : ''
      }`;
      btn.addEventListener('click', () => {
        if (this.selectedBackpackSlot === null) {
          this.selectedBackpackSlot = i;
        } else if (this.selectedBackpackSlot === i) {
          this.selectedBackpackSlot = null;
        } else {
          inv.swapSlots(this.selectedBackpackSlot, i);
          this.world.audio.play('ui');
          this.selectedBackpackSlot = null;
          this.world.bus.emit('inventory:changed', undefined);
          this.world.saveGameState();
          return;
        }
        this.renderBackpackModal();
      });

      if (i < inv.hotbarSize) {
        const keyTag = document.createElement('span');
        keyTag.className = 'slot-key';
        keyTag.textContent = String(i + 1);
        btn.appendChild(keyTag);
      }

      if (slot) this.populateSlotVisual(btn, slot.itemId, slot.quantity);
      this.backpackGridEl.appendChild(btn);
    }

    const selSlot =
      this.selectedBackpackSlot !== null ? inv.slots[this.selectedBackpackSlot] : null;
    const def = selSlot ? getItemDef(selSlot.itemId) : null;
    if (def) {
      this.backpackDetailEl.textContent = `【${def.name}】${def.description}（再点击另一格可交换位置）`;
      this.backpackEatBtnEl.classList.toggle('hidden', !def.energyRestore && !def.healthRestore);
    } else {
      this.backpackDetailEl.textContent = '点击任意物品查看详情、交换位置，或把工具拖入第一排快捷栏';
      this.backpackEatBtnEl.classList.add('hidden');
    }
  }

  private renderChestModal(): void {
    const chest = this.world.activeChestUid
      ? this.world.machines.getByUid(this.world.activeChestUid)
      : undefined;
    if (!chest || !chest.chestSlots) {
      this.closeModals();
      return;
    }

    this.chestGridEl.innerHTML = '';
    for (let i = 0; i < chest.chestSlots.length; i++) {
      const slot = chest.chestSlots[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-slot';
      if (slot) {
        this.populateSlotVisual(btn, slot.itemId, slot.quantity);
        btn.addEventListener('click', () => {
          if (
            this.world.machines.transferBetweenChestAndInventory(
              chest,
              'chest',
              i,
              this.world.inventory
            )
          ) {
            this.world.audio.play('ui');
            this.world.bus.emit('inventory:changed', undefined);
            this.world.saveGameState();
          } else {
            this.world.toast('随身背包已满！');
          }
        });
      }
      this.chestGridEl.appendChild(btn);
    }

    this.chestBackpackGridEl.innerHTML = '';
    const inv = this.world.inventory;
    for (let i = 0; i < inv.slots.length; i++) {
      const slot = inv.slots[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `inv-slot${i < inv.hotbarSize ? ' hotbar-row' : ''}`;
      if (slot) {
        this.populateSlotVisual(btn, slot.itemId, slot.quantity);
        btn.addEventListener('click', () => {
          if (
            this.world.machines.transferBetweenChestAndInventory(
              chest,
              'inventory',
              i,
              this.world.inventory
            )
          ) {
            this.world.audio.play('ui');
            this.world.bus.emit('inventory:changed', undefined);
            this.world.saveGameState();
          } else {
            this.world.toast('储物箱已满！');
          }
        });
      }
      this.chestBackpackGridEl.appendChild(btn);
    }
  }

  /* =========================================================
     CRAFTING & COOKING MODALS
     ========================================================= */

  private renderCraftingModal(): void {
    this.craftingListEl.innerHTML = '';
    for (const recipe of CRAFTING_RECIPES) {
      const outDef = getItemDef(recipe.outputItemId);
      if (!outDef) continue;
      const canCraft = this.world.inventory.hasIngredients(recipe.ingredients);

      const ingText = recipe.ingredients
        .map((ing) => {
          const name = getItemDef(ing.itemId)?.name ?? ing.itemId;
          const have = this.world.inventory.getItemCount(ing.itemId);
          return `${name} ${have}/${ing.quantity}`;
        })
        .join(' · ');

      const row = this.createShopRow(
        outDef.spriteKey,
        recipe.name,
        `${recipe.description} | 材料：${ingText}`,
        [
          {
            label: '制作',
            primary: true,
            disabled: !canCraft,
            onClick: () => this.world.craftItem(recipe.id),
          },
        ]
      );
      this.craftingListEl.appendChild(row);
    }
  }

  private renderCookingModal(): void {
    this.cookingListEl.innerHTML = '';
    for (const recipe of COOKING_RECIPES) {
      const outDef = getItemDef(recipe.outputItemId);
      if (!outDef) continue;
      const unlocked = this.world.stats.hasRecipe(recipe.id);
      const canCook = unlocked && this.world.inventory.hasIngredients(recipe.ingredients);

      const ingText = recipe.ingredients
        .map((ing) => {
          const name = getItemDef(ing.itemId)?.name ?? ing.itemId;
          const have = this.world.inventory.getItemCount(ing.itemId);
          return `${name} ${have}/${ing.quantity}`;
        })
        .join(' · ');

      const meta = unlocked
        ? `${recipe.description} | 食材：${ingText}`
        : `未解锁：${recipe.unlockHint ?? '提升村民好感度解锁'}`;

      const row = this.createShopRow(outDef.spriteKey, recipe.name, meta, [
        {
          label: unlocked ? '烹饪' : '未解锁',
          primary: unlocked,
          disabled: !canCook,
          onClick: () => this.world.cookRecipe(recipe.id),
        },
      ]);
      this.cookingListEl.appendChild(row);
    }
  }

  /* =========================================================
     SHOPS: PIERRE (SEEDS), ROBIN (BUILDINGS/ANIMALS/FURNITURE), CLINT (BLACKSMITH)
     ========================================================= */

  private renderShopContents(): void {
    const inv = this.world.inventory;
    this.shopGoldEl.textContent = `${inv.gold} G`;

    const allUnlocked = this.world.collections.unlockedGreenhouse;
    this.shopSubtitleEl.textContent = allUnlocked
      ? '四季温室已修复！货架已开放全年四季所有精选种子！'
      : `当前为【${this.world.time.season}】，货架供应当季种子（修复温室可解锁四季全种子）`;

    this.shopSeedListEl.innerHTML = '';
    const seeds = getSeedsForSeason(this.world.time.seasonId, allUnlocked);
    for (const def of seeds) {
      if (def.buyPrice === undefined || !def.cropId) continue;
      const cropDef = getCropDef(def.cropId);
      const harvestDef = cropDef ? getItemDef(cropDef.harvestItemId) : undefined;
      const meta = cropDef
        ? `${cropDef.daysToGrow}天成熟 · 收获卖 ${harvestDef?.sellPrice ?? 0}G${
            cropDef.regrowDays ? ` · 每${cropDef.regrowDays}天再收` : ''
          }`
        : def.description;

      this.shopSeedListEl.appendChild(
        this.createShopRow(def.spriteKey, `${def.name} · ${def.buyPrice} G`, meta, [
          {
            label: '买 1',
            disabled: inv.gold < def.buyPrice,
            onClick: () => this.world.buySeed(def.id, 1),
          },
          {
            label: '买 5',
            primary: true,
            disabled: inv.gold < def.buyPrice * 5,
            onClick: () => this.world.buySeed(def.id, 5),
          },
        ])
      );
    }

    this.shopSellListEl.innerHTML = '';
    const sellables = inv.getSellableInventoryItems();
    if (sellables.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = '背包中暂无可出售农产、鱼获或工匠制品。';
      this.shopSellListEl.appendChild(empty);
      return;
    }

    for (const { def, quantity } of sellables) {
      this.shopSellListEl.appendChild(
        this.createShopRow(
          def.spriteKey,
          `${def.name} ×${quantity}`,
          `单价 ${def.sellPrice ?? 0} G · 全卖可得 ${(def.sellPrice ?? 0) * quantity} G`,
          [
            { label: '卖 1', onClick: () => this.world.sellCropDirect(def.id, 1) },
            {
              label: '全卖',
              primary: true,
              onClick: () => this.world.sellCropDirect(def.id, quantity),
            },
          ]
        )
      );
    }
  }

  private renderRobinModal(): void {
    const inv = this.world.inventory;
    this.furnitureGoldEl.textContent = `${inv.gold} G · 木材 ${inv.getItemCount('res_wood')} · 石头 ${inv.getItemCount('res_stone')}`;

    document.querySelectorAll<HTMLButtonElement>('[data-robin-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.robinTab === this.robinTab);
    });

    this.robinContentEl.innerHTML = '';

    if (this.robinTab === 'buildings') {
      for (const kind of ['coop', 'barn'] as BuildingKind[]) {
        const def = FARM_BUILDINGS[kind];
        const built = this.world.livestock.hasBuilding(kind);
        const canAfford =
          !built &&
          inv.gold >= def.goldCost &&
          inv.getItemCount('res_wood') >= def.woodCost &&
          inv.getItemCount('res_stone') >= def.stoneCost;

        this.robinContentEl.appendChild(
          this.createShopRow(
            def.spriteKey,
            `${def.name}${built ? '（已建成 ✓）' : ` · ${def.goldCost} G`}`,
            `${def.description} | 建材：木材 ×${def.woodCost}、石头 ×${def.stoneCost}`,
            [
              {
                label: built ? '已建成' : '建造',
                primary: !built,
                disabled: !canAfford,
                onClick: () => this.world.buildFarmBuilding(kind),
              },
            ]
          )
        );
      }
      return;
    }

    if (this.robinTab === 'animals') {
      for (const kind of ['chicken', 'cow', 'sheep'] as AnimalKind[]) {
        const def = ANIMAL_CATALOG[kind];
        const check = this.world.livestock.canAdopt(kind);
        const count = this.world.livestock.animals.filter((a) => a.kind === kind).length;
        this.robinContentEl.appendChild(
          this.createShopRow(
            def.spriteKey,
            `${def.name} · ${def.price} G（现有 ${count} 只）`,
            check.ok ? def.description : `${def.description} — ${check.reason}`,
            [
              {
                label: '领养',
                primary: true,
                disabled: !check.ok || inv.gold < def.price,
                onClick: () => this.world.adoptAnimal(kind),
              },
            ]
          )
        );
      }
      return;
    }

    // Furniture catalog tab
    for (const id of FURNITURE_SHOP_IDS) {
      const def = getFurnitureDef(id);
      if (!def) continue;
      const ownedQty = this.world.house.getOwnedCount(id);
      this.robinContentEl.appendChild(
        this.createShopRow(
          def.spriteKey,
          `${def.name} · ${def.price} G${ownedQty > 0 ? `（收纳箱 ${ownedQty} 件）` : ''}`,
          `${def.description}（占 ${def.widthTiles}×${def.heightTiles} 格）`,
          [
            {
              label: '购买',
              primary: true,
              disabled: inv.gold < def.price,
              onClick: () => this.world.buyFurniture(def.id),
            },
          ]
        )
      );
    }
  }

  private renderBlacksmithModal(): void {
    const inv = this.world.inventory;
    this.blacksmithWalletEl.textContent = `${inv.gold} G · 铜锭 ${inv.getItemCount('bar_copper')} · 铁锭 ${inv.getItemCount('bar_iron')} · 金锭 ${inv.getItemCount('bar_gold')}`;
    this.blacksmithListEl.innerHTML = '';

    for (const tool of ['hoe', 'watering_can', 'axe', 'pickaxe'] as UpgradeableToolKind[]) {
      const tier = this.world.stats.getToolTier(tool);
      const curInfo = TOOL_TIERS[tier];
      const nextInfo = TOOL_TIERS[tier + 1];
      const baseName = UPGRADEABLE_TOOL_NAMES[tool];

      if (!nextInfo) {
        this.blacksmithListEl.appendChild(
          this.createShopRow(
            UPGRADEABLE_TOOL_SPRITES[tool],
            `${curInfo.prefix}${baseName}（已满级 ★）`,
            curInfo.aoeDesc,
            [{ label: '顶级', disabled: true, onClick: () => {} }]
          )
        );
        continue;
      }

      const barName = getItemDef(nextInfo.barItemId)?.name ?? '金属锭';
      const haveBars = inv.getItemCount(nextInfo.barItemId);
      const canUpgrade = inv.gold >= nextInfo.goldCost && haveBars >= nextInfo.barCount;

      this.blacksmithListEl.appendChild(
        this.createShopRow(
          UPGRADEABLE_TOOL_SPRITES[tool],
          `${curInfo.prefix}${baseName} → ${nextInfo.prefix}${baseName}`,
          `${nextInfo.aoeDesc} | 费用：${nextInfo.goldCost} G + ${barName} ${haveBars}/${nextInfo.barCount}`,
          [
            {
              label: '锻造升级',
              primary: true,
              disabled: !canUpgrade,
              onClick: () => this.world.upgradeTool(tool),
            },
          ]
        )
      );
    }
  }

  /* =========================================================
     QUESTS, BUNDLES / ENCYCLOPEDIA, WORLD MAP & TV
     ========================================================= */

  private renderQuestsModal(): void {
    this.questContentEl.innerHTML = '';
    const q = this.world.quests.currentQuest;
    if (!q) return;

    const npc = getNpcDef(q.npcId);
    const item = getItemDef(q.itemId);
    const have = this.world.inventory.getItemCount(q.itemId);
    const ready = !q.completed && have >= q.quantity;

    const card = document.createElement('div');
    card.className = `bundle-card${q.completed ? ' completed' : ''}`;
    card.innerHTML = `
      <div class="villager-card" style="border:none; background:transparent; padding:0;">
        <img class="villager-portrait" src="${this.world.atlas.getIconDataUrl(npc?.portraitKey ?? 'portrait_emily')}" alt="${npc?.name ?? ''}" />
        <div class="villager-body">
          <div class="shop-item-name">${npc?.name ?? '村民'}的今日求助委托</div>
          <p class="villager-bio">${this.world.quests.getQuestDescription(q)}</p>
          <div class="villager-badges">
            <span class="v-badge">进度：${item?.name ?? ''} ${have} / ${q.quantity}</span>
            <span class="v-badge done">报酬：+${q.goldReward} G & +120 好感</span>
          </div>
        </div>
      </div>
    `;

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '12px';
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';

    if (q.completed) {
      const done = document.createElement('div');
      done.className = 'bundle-reward';
      done.textContent = '今日委托已圆满完成！明天清晨公告栏将张贴新的委托。';
      btnRow.appendChild(done);
    } else {
      if (!q.accepted) {
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'wood-btn';
        acceptBtn.textContent = '接取委托';
        acceptBtn.addEventListener('click', () => this.world.acceptDailyQuest());
        btnRow.appendChild(acceptBtn);
      }
      const deliverBtn = document.createElement('button');
      deliverBtn.type = 'button';
      deliverBtn.className = 'wood-btn primary-btn';
      deliverBtn.textContent = ready ? '立即交付领取赏金！' : '材料尚未集齐';
      deliverBtn.disabled = !ready;
      deliverBtn.addEventListener('click', () => this.world.deliverDailyQuest());
      btnRow.appendChild(deliverBtn);
    }

    card.appendChild(btnRow);
    this.questContentEl.appendChild(card);
  }

  private renderBundlesModal(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-cc-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.ccTab === this.ccTab);
    });

    const stats = this.world.collections.getEncyclopediaStats();
    this.bundlesSubtitleEl.textContent = `收集包已完成 ${this.world.collections.completedBundles.size} / ${COMMUNITY_BUNDLES.length} · 收藏图鉴点亮 ${stats.discovered} / ${stats.total} (${stats.percent}%)`;
    this.bundlesContentEl.innerHTML = '';

    if (this.ccTab === 'bundles') {
      for (const b of COMMUNITY_BUNDLES) {
        const done = this.world.collections.isBundleCompleted(b.id);
        const card = document.createElement('div');
        card.className = `bundle-card${done ? ' completed' : ''}`;

        const header = document.createElement('div');
        header.className = 'bundle-header';
        header.innerHTML = `<strong>${b.name} ${done ? '★ 已完成' : ''}</strong><span class="shop-item-meta">${b.description}</span>`;
        card.appendChild(header);

        const itemsRow = document.createElement('div');
        itemsRow.className = 'bundle-items-row';

        for (const reqId of b.requiredItemIds) {
          const itemDef = getItemDef(reqId);
          if (!itemDef) continue;
          const donated = this.world.collections.hasDonated(b.id, reqId);
          const have = this.world.inventory.getItemCount(reqId);

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `wood-btn gift-pill-btn${donated ? ' primary-btn' : ''}`;
          btn.disabled = donated || have < 1;

          const img = document.createElement('img');
          img.src = this.world.atlas.getIconDataUrl(itemDef.spriteKey);
          img.alt = itemDef.name;
          btn.appendChild(img);

          const span = document.createElement('span');
          span.textContent = donated
            ? `${itemDef.name} ✓`
            : `${itemDef.name} (${have > 0 ? '点击献祭' : '未持有'})`;
          btn.appendChild(span);

          if (!donated) {
            btn.addEventListener('click', () => this.world.donateToBundle(b.id, reqId));
          }
          itemsRow.appendChild(btn);
        }

        card.appendChild(itemsRow);
        const reward = document.createElement('div');
        reward.className = 'bundle-reward';
        reward.textContent = `完成奖励：${b.rewardText}`;
        card.appendChild(reward);
        this.bundlesContentEl.appendChild(card);
      }
      return;
    }

    // Encyclopedia tab
    for (const group of COLLECTION_GROUPS) {
      const title = document.createElement('div');
      title.className = 'shop-section-title';
      const found = group.itemIds.filter((id) => this.world.collections.isDiscovered(id)).length;
      title.textContent = `${group.title} (${found} / ${group.itemIds.length})`;
      this.bundlesContentEl.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'encyc-grid';
      for (const itemId of group.itemIds) {
        const def = getItemDef(itemId);
        if (!def) continue;
        const unlocked = this.world.collections.isDiscovered(itemId);
        const cell = document.createElement('div');
        cell.className = `encyc-card${unlocked ? '' : ' locked'}`;

        const img = document.createElement('img');
        img.src = this.world.atlas.getIconDataUrl(def.spriteKey);
        img.alt = unlocked ? def.name : '未发现';
        cell.appendChild(img);

        const name = document.createElement('div');
        name.textContent = unlocked ? def.name : '???';
        cell.appendChild(name);

        if (unlocked && def.sellPrice) {
          const price = document.createElement('div');
          price.className = 'shop-item-meta';
          price.textContent = `${def.sellPrice} G`;
          cell.appendChild(price);
        }
        grid.appendChild(cell);
      }
      this.bundlesContentEl.appendChild(grid);
    }
  }

  private renderWorldMapModal(): void {
    const fastUnlocked = this.world.collections.unlockedFastTravel;
    this.mapStatusEl.textContent = fastUnlocked
      ? '✨ 矿车快传驿站已激活！点击下方任意地区即可瞬间直达！'
      : '步行路线：农场木门→农舍 · 农场东路→晨露小镇 · 农场东北山路→晨露矿洞（完成工匠收集包解锁一键直达）';

    const nodes: { id: SceneId; title: string; desc: string }[] = [
      {
        id: 'farm',
        title: '🌾 晨露农场',
        desc: `耕作、洒水器、工匠机器、鸡舍畜棚、水塘垂钓${
          this.world.tileMap.greenhouseUnlocked ? ' · 四季温室已开放' : ''
        }`,
      },
      {
        id: 'house',
        title: '🏡 农舍小屋',
        desc: '复古天气电视、厨房灶台烹饪、自由家具装修模式 (F)、温馨床铺休息',
      },
      {
        id: 'town',
        title: '🏘 晨露小镇',
        desc: '皮埃尔杂货铺、社区中心、罗宾木工坊、克林特铁匠铺、公告栏委托与 4 位村民',
      },
      {
        id: 'mine',
        title: '⛏ 晨露矿洞',
        desc: `开采铜/铁/金矿脉与宝石，挑战史莱姆（历史最深第 ${this.world.mine.deepestFloor} 层）`,
      },
    ];

    this.mapGridEl.innerHTML = '';
    for (const n of nodes) {
      const isCur = this.world.currentSceneId === n.id;
      const card = document.createElement('div');
      card.className = `map-node-card${isCur ? ' current' : ''}`;
      card.innerHTML = `
        <div>
          <div class="map-node-title">${n.title}${isCur ? '（当前位置）' : ''}</div>
          <div class="map-node-desc">${n.desc}</div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wood-btn${fastUnlocked && !isCur ? ' primary-btn' : ''}`;
      btn.textContent = isCur ? '正在此处' : fastUnlocked ? '乘矿车直达' : '矿车未解锁';
      btn.disabled = isCur || !fastUnlocked;
      btn.addEventListener('click', () => {
        this.closeModals();
        this.world.fastTravelTo(n.id);
      });

      card.appendChild(btn);
      this.mapGridEl.appendChild(card);
    }
  }

  private openTvModal(payload: TvBroadcastPayload): void {
    this.openStandardModal('tv', this.tvModalEl, () => {
      this.tvContentEl.innerHTML = `
        <div class="tv-screen">
          <div class="tv-weather-headline">明日天气预报：${payload.tomorrowWeatherLabel}</div>
          <div>${payload.tomorrowWeatherDesc}</div>
          ${payload.festivalNote ? `<div style="margin-top:8px; color:#ffd6e0; font-weight:900;">${payload.festivalNote}</div>` : ''}
        </div>
        <div class="help-tip">${payload.farmingTip}</div>
      `;
    });
  }

  /* =========================================================
     NPC DIALOGUE & VILLAGERS PANEL
     ========================================================= */

  private openDialogue(payload: DialoguePayload): void {
    if (this.activeModal === 'summary') return;
    if (this.activeModal !== 'dialogue') this.closeModals();

    this.dialoguePortraitEl.src = this.world.atlas.getIconDataUrl(payload.portraitKey);
    this.dialoguePortraitEl.alt = payload.npcName;
    this.dialogueNameEl.textContent = payload.npcName;
    this.dialogueRoleEl.textContent = payload.npcRole;
    this.dialogueTextEl.textContent = payload.text;
    this.dialogueHeartsEl.innerHTML = renderHeartsHtml(payload.hearts, payload.maxHearts);

    if (payload.heartEventTitle) {
      this.dialogueEventBannerEl.textContent = payload.heartEventTitle;
      this.dialogueEventBannerEl.classList.remove('hidden');
    } else {
      this.dialogueEventBannerEl.classList.add('hidden');
    }

    if (payload.heartEventRewardText) {
      this.dialogueRewardEl.textContent = `🎁 剧情奖励：${payload.heartEventRewardText}`;
      this.dialogueRewardEl.classList.remove('hidden');
    } else {
      this.dialogueRewardEl.classList.add('hidden');
    }

    this.activeDialogueShopKind = payload.shopKind;
    if (payload.shopKind === 'seeds') {
      this.dialogueShopBtnEl.textContent = '逛逛种子铺';
      this.dialogueShopBtnEl.classList.remove('hidden');
    } else if (payload.shopKind === 'furniture') {
      this.dialogueShopBtnEl.textContent = '进入木工坊';
      this.dialogueShopBtnEl.classList.remove('hidden');
    } else if (payload.shopKind === 'blacksmith') {
      this.dialogueShopBtnEl.textContent = '升级农具';
      this.dialogueShopBtnEl.classList.remove('hidden');
    } else {
      this.dialogueShopBtnEl.classList.add('hidden');
    }

    this.dialogueGiftBtnsEl.innerHTML = '';
    const giftables = this.world.inventory.getGiftableInventoryItems().slice(0, 6);
    if (!payload.canGiftToday) {
      const done = document.createElement('span');
      done.className = 'shop-item-meta';
      done.textContent = '今日已赠送过礼物 ✓';
      this.dialogueGiftBtnsEl.appendChild(done);
    } else if (giftables.length === 0) {
      const none = document.createElement('span');
      none.className = 'shop-item-meta';
      none.textContent = '背包暂无可赠送的作物、鱼获、宝石或料理';
      this.dialogueGiftBtnsEl.appendChild(none);
    } else {
      for (const { def, quantity } of giftables) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wood-btn gift-pill-btn';
        const img = document.createElement('img');
        img.src = this.world.atlas.getIconDataUrl(def.spriteKey);
        img.alt = def.name;
        btn.appendChild(img);
        const span = document.createElement('span');
        span.textContent = `${def.name}(${quantity})`;
        btn.appendChild(span);
        btn.addEventListener('click', () => this.world.giftToNpc(payload.npcId, def.id));
        this.dialogueGiftBtnsEl.appendChild(btn);
      }
    }

    this.dialogueModalEl.classList.remove('hidden');
    this.activeModal = 'dialogue';
    this.world.input.setBlocked(true);
  }

  private renderVillagersPanel(): void {
    this.villagersListEl.innerHTML = '';
    for (const id of NPC_IDS) {
      const def = getNpcDef(id);
      const runtime = this.world.npcs.get(id);
      if (!def || !runtime) continue;

      const card = document.createElement('div');
      card.className = 'villager-card';

      const img = document.createElement('img');
      img.className = 'villager-portrait';
      img.src = this.world.atlas.getIconDataUrl(def.portraitKey);
      img.alt = def.name;
      card.appendChild(img);

      const body = document.createElement('div');
      body.className = 'villager-body';

      const top = document.createElement('div');
      top.className = 'villager-top';
      top.innerHTML = `
        <div><span class="villager-name">${def.name}</span><span class="villager-role">${def.role}</span></div>
        <div class="hearts-row">${renderHeartsHtml(this.world.npcs.getHearts(runtime), MAX_HEARTS)}</div>
      `;

      const bio = document.createElement('p');
      bio.className = 'villager-bio';
      bio.textContent = def.bio;

      const lovedNames = runtime.knownLovedIds
        .map((itemId) => getItemDef(itemId)?.name)
        .filter((n): n is string => Boolean(n));

      const badges = document.createElement('div');
      badges.className = 'villager-badges';
      badges.innerHTML = `
        <span class="v-badge${runtime.talkedToday ? ' done' : ''}">${runtime.talkedToday ? '今日已交谈 ✓' : '今日未交谈'}</span>
        <span class="v-badge${runtime.giftedToday ? ' done' : ''}">${runtime.giftedToday ? '今日已送礼 ✓' : '今日可送礼'}</span>
        <span class="v-badge">心级剧情：${runtime.seenHeartEvents.length}/2</span>
        <span class="v-badge">${lovedNames.length > 0 ? `最爱：${lovedNames.join('、')}` : '最爱：待探索'}</span>
      `;

      body.appendChild(top);
      body.appendChild(bio);
      body.appendChild(badges);
      card.appendChild(body);
      this.villagersListEl.appendChild(card);
    }
  }

  /* =========================================================
     COMPANION CATS ADOPTION & CARE PANEL
     ========================================================= */

  private renderPetsModal(): void {
    const pets = this.world.pets;
    const isRainy = this.world.weather.isRainy();
    const activeScene = pets.getActiveScene(isRainy, this.world.time.minutes);
    const locationLabel =
      activeScene === 'house'
        ? '农舍小屋（壁炉旁打盹）'
        : activeScene === 'farm'
          ? (pets.celebratingOnFarm ? '晨露农场（生日庆典）' : '晨露农场（阳光草坪）')
          : '等待领养';

    // Top bar: water bowl status + one-click adopt both cats
    this.petsBowlBarEl.innerHTML = '';
    const bowlInfo = document.createElement('span');
    bowlInfo.innerHTML = `💧 农场猫咪水碗：<strong>${
      pets.bowlFilledToday ? '已装满清水 ✓' : '待添水（用喷壶点击农舍旁水碗）'
    }</strong>`;
    this.petsBowlBarEl.appendChild(bowlInfo);

    if (pets.cats.length < CAT_BREED_IDS.length) {
      const adoptAllBtn = document.createElement('button');
      adoptAllBtn.type = 'button';
      adoptAllBtn.className = 'wood-btn primary-btn';
      adoptAllBtn.textContent =
        pets.cats.length === 0 ? '🐾 两只猫咪一起接回家（免费）' : '🐾 把另一只猫咪也接回家';
      adoptAllBtn.addEventListener('click', () => {
        const draftNames: Partial<Record<CatBreedId, string>> = {};
        for (const id of CAT_BREED_IDS) {
          const inp = document.getElementById(`pet-name-input-${id}`) as HTMLInputElement | null;
          if (inp && inp.value.trim()) draftNames[id] = inp.value.trim();
        }
        this.world.adoptAllCats(draftNames);
      });
      this.petsBowlBarEl.appendChild(adoptAllBtn);
    } else {
      const bothTag = document.createElement('span');
      bothTag.className = 'v-badge done';
      bothTag.textContent = `双猫已团聚 · 当前位置：${locationLabel}`;
      this.petsBowlBarEl.appendChild(bothTag);
    }

    // Two bespoke cat cards
    this.petsListEl.innerHTML = '';
    const inv = this.world.inventory;

    for (const breedId of CAT_BREED_IDS) {
      const def = getCatBreedDef(breedId);
      const runtime = pets.getCat(breedId);

      const card = document.createElement('div');
      card.className = 'villager-card pet-card';

      const img = document.createElement('img');
      img.className = 'villager-portrait pet-portrait';
      img.src = this.world.atlas.getIconDataUrl(`portrait_pet_${breedId}`);
      img.alt = def.name;
      card.appendChild(img);

      const body = document.createElement('div');
      body.className = 'villager-body';

      if (!runtime) {
        // Adoption state
        const top = document.createElement('div');
        top.className = 'villager-top';
        top.innerHTML = `
          <div>
            <span class="villager-name">${def.name}</span>
            <span class="villager-role">${def.personality}</span>
          </div>
          <span class="v-badge">${def.originNote}</span>
        `;

        const bio = document.createElement('p');
        bio.className = 'villager-bio';
        bio.textContent = def.description;

        const adoptRow = document.createElement('div');
        adoptRow.className = 'pet-adopt-row';

        const nameInput = document.createElement('input');
        nameInput.id = `pet-name-input-${breedId}`;
        nameInput.type = 'text';
        nameInput.maxLength = 12;
        nameInput.value = def.defaultPetName;
        nameInput.placeholder = '给小猫咪起个名字…';
        nameInput.className = 'pet-name-input';

        const adoptBtn = document.createElement('button');
        adoptBtn.type = 'button';
        adoptBtn.className = 'wood-btn primary-btn';
        adoptBtn.textContent = '领养回家（免费）';
        adoptBtn.addEventListener('click', () => {
          this.world.adoptCat(breedId, nameInput.value);
        });

        adoptRow.appendChild(nameInput);
        adoptRow.appendChild(adoptBtn);

        body.appendChild(top);
        body.appendChild(bio);
        body.appendChild(adoptRow);
      } else {
        // Adopted care & interaction state
        const hearts = pets.getHearts(runtime);
        const top = document.createElement('div');
        top.className = 'villager-top';
        top.innerHTML = `
          <div>
            <span class="villager-name">${runtime.name}</span>
            <span class="villager-role">${def.name} · ${def.originNote}</span>
          </div>
          <div class="hearts-row" title="羁绊好感 ${runtime.friendship} / ${PET_MAX_FRIENDSHIP}">
            ${renderHeartsHtml(hearts, PET_MAX_HEARTS)}
          </div>
        `;

        const bio = document.createElement('p');
        bio.className = 'villager-bio';
        bio.textContent = `${def.description}（羁绊 ${runtime.friendship}/${PET_MAX_FRIENDSHIP} · 位置：${locationLabel}）`;

        const badges = document.createElement('div');
        badges.className = 'villager-badges';
        badges.innerHTML = `
          <span class="v-badge${runtime.pettedToday ? ' done' : ''}">${runtime.pettedToday ? '今日已撸猫 ✓' : '今日待抚摸'}</span>
          <span class="v-badge${pets.bowlFilledToday ? ' done' : ''}">${pets.bowlFilledToday ? '水碗已添水 ✓' : '水碗空着'}</span>
          <span class="v-badge${runtime.treatGivenToday ? ' done' : ''}">${runtime.treatGivenToday ? '今日已喂零食 ✓' : '今日可喂小鱼/牛奶'}</span>
          <span class="v-badge">${pets.celebratingOnFarm ? '庆生跟随中' : runtime.followPlayer ? '跟随模式中' : '自由漫步中'}</span>
          ${runtime.pendingGiftItemId ? '<span class="v-badge done">🎁 嘴里叼着小礼物！去摸摸它</span>' : ''}
        `;

        // Control buttons: Follow toggle, Call to side, Rename
        const actionsRow = document.createElement('div');
        actionsRow.className = 'pet-actions-row';

        const followBtn = document.createElement('button');
        followBtn.type = 'button';
        followBtn.className = `wood-btn${runtime.followPlayer ? ' primary-btn' : ''}`;
        followBtn.textContent = pets.celebratingOnFarm
          ? (runtime.followPlayer ? '庆生后自由漫步' : '庆生后继续跟随')
          : (runtime.followPlayer ? '切换为自由漫步' : '开启跟随散步');
        followBtn.addEventListener('click', () => this.world.toggleCatFollow(breedId));

        const callBtn = document.createElement('button');
        callBtn.type = 'button';
        callBtn.className = 'wood-btn';
        callBtn.textContent = '呼唤到身边';
        callBtn.addEventListener('click', () => {
          this.closeModals();
          this.world.callCatToPlayer(breedId);
        });

        const renameInput = document.createElement('input');
        renameInput.type = 'text';
        renameInput.maxLength = 12;
        renameInput.value = runtime.name;
        renameInput.className = 'pet-name-input compact';
        renameInput.setAttribute('aria-label', '修改猫咪名字');

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'wood-btn';
        renameBtn.textContent = '改名';
        renameBtn.addEventListener('click', () => {
          this.world.renameCat(breedId, renameInput.value);
        });

        actionsRow.appendChild(followBtn);
        actionsRow.appendChild(callBtn);
        actionsRow.appendChild(renameInput);
        actionsRow.appendChild(renameBtn);

        body.appendChild(top);
        body.appendChild(bio);
        body.appendChild(badges);
        body.appendChild(actionsRow);

        // Quick Favorite Treat feeding row
        const treatRow = document.createElement('div');
        treatRow.className = 'pet-treat-bar';
        const treatLabel = document.createElement('span');
        treatLabel.className = 'dialogue-gift-label';
        treatLabel.textContent = '投喂最爱零食：';
        treatRow.appendChild(treatLabel);

        if (runtime.treatGivenToday) {
          const done = document.createElement('span');
          done.className = 'shop-item-meta';
          done.textContent = '今日已吃饱满足啦 ✓';
          treatRow.appendChild(done);
        } else {
          const availableTreats = def.favoriteTreatIds
            .map((id) => ({ id, def: getItemDef(id), qty: inv.getItemCount(id) }))
            .filter((x) => x.def && x.qty > 0);

          if (availableTreats.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'shop-item-meta';
            empty.textContent = '背包暂无小鱼、烤鱼、鲜牛奶或鸡蛋（水塘钓鱼或牧场收获后可喂食）';
            treatRow.appendChild(empty);
          } else {
            for (const t of availableTreats.slice(0, 5)) {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'wood-btn gift-pill-btn';
              const icon = document.createElement('img');
              icon.src = this.world.atlas.getIconDataUrl(t.def!.spriteKey);
              icon.alt = t.def!.name;
              btn.appendChild(icon);
              const label = document.createElement('span');
              label.textContent = `${t.def!.name}(${t.qty})`;
              btn.appendChild(label);
              btn.addEventListener('click', () => this.world.feedCatTreat(breedId, t.id));
              treatRow.appendChild(btn);
            }
          }
        }
        body.appendChild(treatRow);
      }

      card.appendChild(body);
      this.petsListEl.appendChild(card);
    }
  }

  /* =========================================================
     INSPECTOR, DAY SUMMARY & HELPERS
     ========================================================= */

  private renderInspector(payload: TileInspectPayload | null): void {
    if (!payload) {
      this.inspectorEl.classList.add('hidden');
      return;
    }
    this.inspectorEl.classList.remove('hidden');
    this.inspectorNameEl.textContent = payload.title;
    this.inspectorPillEl.textContent = payload.statusLabel;
    this.inspectorPillEl.className = `water-pill${
      payload.statusKind === 'watered'
        ? ' watered'
        : payload.statusKind === 'ready'
          ? ' ready'
          : ''
    }`;
    this.inspectorFillEl.style.width = `${payload.progressPercent}%`;
    this.inspectorMetaEl.textContent = payload.metaText;
  }

  private openSummaryWithTransition(payload: DaySummaryPayload): void {
    this.world.input.setBlocked(true);
    this.nightOverlayEl.classList.add('active');

    window.setTimeout(() => {
      this.summaryTitleEl.textContent = `第 ${payload.completedDay} 天 · 农场日结单`;
      this.summaryLinesEl.innerHTML = '';

      if (payload.lines.length === 0) {
        const line = document.createElement('div');
        line.className = 'summary-line';
        line.textContent = '今日出货箱暂无寄售物品';
        this.summaryLinesEl.appendChild(line);
      } else {
        for (const item of payload.lines) {
          const line = document.createElement('div');
          line.className = 'summary-line';
          line.innerHTML = `<span>${item.itemName} ×${item.quantity} (${item.unitPrice}G)</span><strong>+${item.subtotal} G</strong>`;
          this.summaryLinesEl.appendChild(line);
        }
      }

      this.summaryTotalEl.textContent = `+${payload.totalGold} G`;

      const notes: string[] = [];
      notes.push(
        `新的一天：${payload.season}第 ${payload.newDay} 天 · 天气：${this.world.weather.getLabel(payload.todayWeather)}`
      );
      if (payload.cropsGrownCount > 0 || payload.cropsReadyCount > 0) {
        notes.push(
          `夜间 ${payload.cropsGrownCount} 株作物成长，明早有 ${payload.cropsReadyCount} 株可采摘！`
        );
      }
      if (payload.rainAutoWatered) {
        notes.push('☂ 今日降水已自动浇灌全部露天耕地！');
      } else if (payload.sprinklerWateredCount > 0) {
        notes.push(`💧 农场洒水器清晨自动浇灌了 ${payload.sprinklerWateredCount} 格耕地！`);
      }
      if (payload.animalProductsCount > 0) {
        notes.push(`🐾 牧场小动物今早新产出了 ${payload.animalProductsCount} 份新鲜蛋奶/羊毛！`);
      }
      if (payload.petBowlDrank) {
        notes.push('🐱 小猫咪们喝光了水碗里的清甜泉水，每只羁绊好感 +24！');
      }
      for (const line of payload.petGiftLines) {
        notes.push(`🎁 ${line}`);
      }
      for (const name of payload.petMaxHeartNames) {
        notes.push(`💖 【${name}】已经与你达成 5 ♥ 满心灵魂羁绊！`);
      }
      if (payload.crowEatenCount > 0) {
        notes.push(`🐦 注意：夜间有 ${payload.crowEatenCount} 株无稻草人守护的作物被乌鸦啄食了！`);
      }
      if (payload.witheredCount > 0) {
        notes.push(`🍂 换季提醒：${payload.witheredCount} 株非当季露天作物已枯萎。`);
      }
      if (payload.festivalToday) {
        notes.push(`🎉 今日是【${payload.festivalToday}】，去小镇广场与村民一起庆祝吧！`);
      }

      this.summaryGrowthEl.textContent = notes.join('\n');
      this.summaryModalEl.classList.remove('hidden');
      this.activeModal = 'summary';
    }, 340);
  }

  private closeSummaryModal(): void {
    this.summaryModalEl.classList.add('hidden');
    this.nightOverlayEl.classList.remove('active');
    this.activeModal = null;
    this.world.input.setBlocked(false);
    this.world.finishSleepModal();
  }

  private createShopRow(
    spriteKey: string,
    title: string,
    meta: string,
    buttons: { label: string; primary?: boolean; disabled?: boolean; onClick: () => void }[]
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'shop-row';

    const left = document.createElement('div');
    left.className = 'shop-row-left';

    const icon = document.createElement('img');
    icon.className = 'shop-icon';
    icon.src = this.world.atlas.getIconDataUrl(spriteKey);
    icon.alt = title;
    left.appendChild(icon);

    const info = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'shop-item-name';
    nameEl.textContent = title;
    const metaEl = document.createElement('div');
    metaEl.className = 'shop-item-meta';
    metaEl.textContent = meta;
    info.appendChild(nameEl);
    info.appendChild(metaEl);
    left.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'shop-row-actions';
    for (const spec of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wood-btn${spec.primary ? ' primary-btn' : ''}`;
      btn.textContent = spec.label;
      btn.disabled = Boolean(spec.disabled);
      btn.addEventListener('click', spec.onClick);
      actions.appendChild(btn);
    }

    row.appendChild(left);
    row.appendChild(actions);
    return row;
  }

  private showToast(message: string): void {
    const el = document.createElement('div');
    el.className = 'toast-item';
    el.textContent = message;
    this.toastContainerEl.appendChild(el);
    while (this.toastContainerEl.children.length > 3) {
      this.toastContainerEl.firstElementChild?.remove();
    }
    window.setTimeout(() => el.remove(), 2700);
  }
}

function renderHeartsHtml(filled: number, max: number): string {
  let out = '';
  for (let i = 0; i < max; i++) {
    out +=
      i < filled
        ? '<span class="heart-filled">♥</span>'
        : '<span class="heart-empty">♡</span>';
  }
  return out;
}

function mustGetEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required HUD element #${id}`);
  return el;
}
