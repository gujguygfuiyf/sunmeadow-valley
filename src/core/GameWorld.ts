import {
  ANIMAL_CATALOG,
  FARM_BUILDINGS,
  type AnimalKind,
  type BuildingKind,
} from '../data/animals';
import { getCraftingRecipe } from '../data/crafting';
import type { GameEvents, SceneId } from '../data/events';
import { getFurnitureDef } from '../data/furniture';
import { getItemDef, type UpgradeableToolKind } from '../data/items';
import { TOOL_TIERS, UPGRADEABLE_TOOL_NAMES } from '../data/mining';
import { getRecipeDef } from '../data/recipes';
import { getBouquetDef, type BouquetId } from '../data/bouquets';
import { CAT_BREED_IDS, getCatBreedDef, type CatBreedId } from '../data/pets';
import { FARM_LAYOUT, TILE_SIZE, TOWN_ENTRY } from '../data/worldConfig';
import type { AudioManager } from '../engine/AudioManager';
import type { EventBus } from '../engine/EventBus';
import type { InputManager } from '../engine/InputManager';
import { SAVE_SCHEMA_VERSION, type GameSaveData, type SaveManager } from '../engine/SaveManager';
import type { SpriteAtlas } from '../engine/SpriteAtlas';
import { CollectionSystem } from '../systems/CollectionSystem';
import { notifyBouquetSelected } from '../systems/BouquetNotifyService';
import { CropSystem } from '../systems/CropSystem';
import { FishingSystem } from '../systems/FishingSystem';
import { HOUSE_FIXTURES, HouseInteriorSystem } from '../systems/HouseInteriorSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { LivestockSystem } from '../systems/LivestockSystem';
import { MachineSystem } from '../systems/MachineSystem';
import { MineSystem } from '../systems/MineSystem';
import { NpcSystem } from '../systems/NpcSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { PetSystem, type CompanionCatRuntime } from '../systems/PetSystem';
import { PlayerStatsSystem } from '../systems/PlayerStatsSystem';
import { PlayerSystem, type FacingDir } from '../systems/PlayerSystem';
import { QuestSystem } from '../systems/QuestSystem';
import { TileMapSystem } from '../systems/TileMapSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { WeatherSystem } from '../systems/WeatherSystem';

export const SCENE_LABELS: Record<SceneId, string> = {
  farm: '晨露农场',
  house: '农舍小屋',
  town: '晨露小镇',
  mine: '晨露矿洞',
};

const BIRTHDAY_GIFT = [
  { itemId: 'food_berry_toast', quantity: 2 },
  { itemId: 'crop_tulip', quantity: 3 },
  { itemId: 'gem_amethyst', quantity: 1 },
] as const;

export interface GameWorldDeps {
  bus: EventBus<GameEvents>;
  atlas: SpriteAtlas;
  audio: AudioManager;
  saveManager: SaveManager;
  input: InputManager;
}

/**
 * Shared persistent world container bridging all 4 playable scenes
 * (FarmScene, HouseInteriorScene, TownScene, MineScene) and the HUD layer.
 */
export class GameWorld {
  readonly bus: EventBus<GameEvents>;
  readonly atlas: SpriteAtlas;
  readonly audio: AudioManager;
  readonly saveManager: SaveManager;
  readonly input: InputManager;

  readonly tileMap = new TileMapSystem();
  readonly crops = new CropSystem();
  readonly inventory = new InventorySystem();
  readonly time = new TimeSystem();
  readonly weather = new WeatherSystem();
  readonly stats = new PlayerStatsSystem();
  readonly player = new PlayerSystem();
  readonly particles = new ParticleSystem();
  readonly house = new HouseInteriorSystem();
  readonly machines = new MachineSystem();
  readonly fishing = new FishingSystem();
  readonly livestock = new LivestockSystem();
  readonly pets = new PetSystem();
  readonly mine = new MineSystem();
  readonly quests = new QuestSystem();
  readonly collections = new CollectionSystem();
  readonly npcs = new NpcSystem();

  currentSceneId: SceneId = 'farm';
  sleepingTransition = false;
  activeDialogueNpcId: string | null = null;
  activeChestUid: string | null = null;

  decorateMode = false;
  selectedFurnitureId: string | null = null;
  birthdayGiftClaimed = false;
  birthdayLetterRead = false;
  birthdayCandlesLit = true;
  indoorBirthdayGathering = false;
  selectedBouquetId: BouquetId | null = null;
  bouquetNote = '';

  private sceneSwitcher:
    | ((target: SceneId, spawnTile?: { x: number; y: number; facing?: FacingDir }) => void)
    | null = null;

  constructor(deps: GameWorldDeps) {
    this.bus = deps.bus;
    this.atlas = deps.atlas;
    this.audio = deps.audio;
    this.saveManager = deps.saveManager;
    this.input = deps.input;
  }

  bindSceneSwitcher(
    fn: (target: SceneId, spawnTile?: { x: number; y: number; facing?: FacingDir }) => void
  ): void {
    this.sceneSwitcher = fn;
  }

  travelTo(target: SceneId, spawnTile?: { x: number; y: number; facing?: FacingDir }): void {
    const leavingIndoorCelebration = this.currentSceneId === 'house' && target === 'farm' && this.indoorBirthdayGathering;
    if (target !== 'farm') {
      this.endBirthdayCelebration();
      this.indoorBirthdayGathering = false;
    }
    if (this.decorateMode && target !== 'house') {
      this.setDecorateMode(false);
    }
    if (this.fishing.isActive()) {
      this.fishing.cancel();
      this.bus.emit('fishing:stateChanged', { active: false });
    }
    this.currentSceneId = target;
    this.sceneSwitcher?.(target, spawnTile);
    if (leavingIndoorCelebration) {
      this.indoorBirthdayGathering = false;
      this.pets.celebratingOnFarm = true;
      this.placeCatsForCurrentSchedule();
      this.particles.spawnHeartBurst(this.player.x, this.player.y - 6);
      this.particles.spawnFloatingText(this.player.x, this.player.y - 16, '♥ 12.03 依依生日快乐 ♥', '#ffa6c9');
      this.bus.emit('pet:changed', undefined);
    }
    this.bus.emit('scene:changed', { sceneId: target, label: SCENE_LABELS[target] });
    this.bus.emit('inspector:changed', null);
    this.bus.emit('context:changed', { prompt: null });
    this.saveGameState();
  }

  /** Minecart Fast Travel (unlocked by Artisan Bundle, or direct teleport from World Map). */
  fastTravelTo(target: SceneId): void {
    if (!this.collections.unlockedFastTravel) {
      this.toast('完成社区中心【工匠牧场收集包】后即可解锁矿车一键直达！');
      return;
    }
    this.audio.play('ui');
    if (target === 'farm') {
      this.travelTo('farm', { x: 6.5, y: 7.4, facing: 'down' });
    } else if (target === 'house') {
      this.travelTo('house', {
        x: HOUSE_FIXTURES.entrySpawn.x,
        y: HOUSE_FIXTURES.entrySpawn.y,
        facing: 'up',
      });
    } else if (target === 'town') {
      this.travelTo('town', { x: 13.5, y: 10.5, facing: 'down' });
    } else if (target === 'mine') {
      this.enterMineFloor(1);
    }
    this.toast(`乘坐矿车迅速抵达【${SCENE_LABELS[target]}】！`);
  }

  enterMineFloor(floor: number): void {
    this.mine.generateFloor(floor);
    this.travelTo('mine', {
      x: this.mine.exitLadderTile.x + 0.5,
      y: this.mine.exitLadderTile.y + 1.4,
      facing: 'down',
    });
    this.emitMineSync();
  }

  /* =========================================================
     STAMINA, EATING & TIME TICK
     ========================================================= */

  tryConsumeEnergy(cost: number): boolean {
    if (this.stats.consumeEnergy(cost)) {
      this.emitStatsSync();
      return true;
    }
    this.toast('体力不足啦！请吃些作物/料理补充体力，或回农舍睡觉休息');
    return false;
  }

  eatFromSlot(slotIndex: number): boolean {
    const slot = this.inventory.slots[slotIndex];
    if (!slot) return false;
    const def = getItemDef(slot.itemId);
    if (!def || (!def.energyRestore && !def.healthRestore)) {
      this.toast('这个物品不能直接食用哦');
      return false;
    }
    this.inventory.removeFromSlot(slotIndex, 1);
    if (def.energyRestore) this.stats.restoreEnergy(def.energyRestore);
    if (def.healthRestore) this.stats.restoreHp(def.healthRestore);
    this.audio.play('harvest');
    this.particles.spawnFloatingText(
      this.player.x,
      this.player.y - 12,
      `+${def.energyRestore ?? 0}体力`,
      '#9bf26b'
    );
    this.emitStatsSync();
    this.bus.emit('inventory:changed', undefined);
    this.toast(`享用了【${def.name}】，体力与生命已恢复！`);
    this.saveGameState();
    return true;
  }

  advanceClock(dt: number): void {
    if (this.sleepingTransition) return;
    if (this.time.update(dt)) {
      this.machines.advanceMinutes(1);
      this.emitTimeSync();
    }
  }

  /* =========================================================
     FISHING MINI-GAME
     ========================================================= */

  startFishing(): void {
    if (this.fishing.isActive()) return;
    if (!this.tryConsumeEnergy(5)) return;
    this.fishing.startCast(this.time.seasonId, this.weather.today);
    this.audio.play('cast');
    this.bus.emit('fishing:stateChanged', { active: true });
    this.toast('甩竿入水……等待鱼儿咬钩！');
  }

  updateFishing(dt: number): void {
    if (!this.fishing.isActive()) return;
    const { justBit, outcome } = this.fishing.update(dt, this.input.isReelHeld());
    if (justBit) {
      this.audio.play('bite');
      this.toast('鱼儿咬钩啦！按住【空格】或【鼠标左键】让绿条跟住小鱼！');
    }
    if (outcome.status === 'caught' && outcome.fish) {
      const fish = outcome.fish;
      this.audio.play('catch');
      this.inventory.addItem(fish.itemId, 1);
      this.collections.recordDiscovery(fish.itemId);
      this.particles.spawnHarvestSparkle(this.player.x, this.player.y);
      this.particles.spawnFloatingText(this.player.x, this.player.y - 14, `钓到 ${fish.name}!`, '#7ee8ff');
      this.bus.emit('inventory:changed', undefined);
      this.bus.emit('bundles:changed', undefined);
      this.bus.emit('fishing:stateChanged', { active: false });
      this.toast(`太棒了！成功钓起【${fish.name}】！`);
      this.saveGameState();
    } else if (outcome.status === 'escaped') {
      this.audio.play('hurt');
      this.bus.emit('fishing:stateChanged', { active: false });
      this.toast('鱼儿挣脱鱼钩游走了，再试一次吧！');
    }
  }

  /* =========================================================
     CRAFTING, COOKING, BLACKSMITH, SHOPS & LIVESTOCK
     ========================================================= */

  craftItem(recipeId: string): void {
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return;
    if (!this.inventory.hasIngredients(recipe.ingredients)) {
      this.toast('制作材料不足！可砍树、敲石头或去矿洞采集更多原料');
      return;
    }
    if (!this.inventory.canAddItem(recipe.outputItemId, recipe.outputQuantity)) {
      this.toast('背包已满，请先整理或存入储物箱');
      return;
    }
    this.inventory.consumeIngredients(recipe.ingredients);
    this.inventory.addItem(recipe.outputItemId, recipe.outputQuantity);
    this.audio.play('craft');
    this.bus.emit('inventory:changed', undefined);
    this.toast(`制作成功：【${recipe.name}】已放入背包！`);
    this.saveGameState();
  }

  cookRecipe(recipeId: string): void {
    const recipe = getRecipeDef(recipeId);
    if (!recipe) return;
    if (!this.stats.hasRecipe(recipe.id)) {
      this.toast(recipe.unlockHint ?? '尚未解锁该料理食谱');
      return;
    }
    if (!this.inventory.hasIngredients(recipe.ingredients)) {
      this.toast('烹饪食材不足！');
      return;
    }
    if (!this.inventory.canAddItem(recipe.outputItemId, 1)) {
      this.toast('背包已满，无法装盘');
      return;
    }
    this.inventory.consumeIngredients(recipe.ingredients);
    this.inventory.addItem(recipe.outputItemId, 1);
    this.collections.recordDiscovery(recipe.outputItemId);
    this.audio.play('craft');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('bundles:changed', undefined);
    this.toast(`香气四溢！烹饪完成【${recipe.name}】！`);
    this.saveGameState();
  }

  upgradeTool(tool: UpgradeableToolKind): void {
    const currentTier = this.stats.getToolTier(tool);
    const nextTier = TOOL_TIERS[currentTier + 1];
    if (!nextTier) {
      this.toast('该农具已升级至顶级黄金品质！');
      return;
    }
    if (this.inventory.gold < nextTier.goldCost) {
      this.toast(`金币不足，升级需要 ${nextTier.goldCost} G`);
      return;
    }
    if (this.inventory.getItemCount(nextTier.barItemId) < nextTier.barCount) {
      const barName = getItemDef(nextTier.barItemId)?.name ?? '金属锭';
      this.toast(`材料不足，需要 ${barName} ×${nextTier.barCount}（可用熔炉熔炼矿石）`);
      return;
    }

    this.inventory.gold -= nextTier.goldCost;
    this.inventory.removeItem(nextTier.barItemId, nextTier.barCount);
    this.stats.upgradeTool(tool);
    if (tool === 'watering_can') {
      this.inventory.setMaxWaterLevel(this.stats.getWateringCanCapacity());
      this.inventory.refillWater();
    }

    this.audio.play('upgrade');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: -nextTier.goldCost });
    this.toast(
      `锻造成功！你的${UPGRADEABLE_TOOL_NAMES[tool]}已升级为【${nextTier.prefix}${UPGRADEABLE_TOOL_NAMES[tool]}】！`
    );
    this.saveGameState();
  }

  buildFarmBuilding(kind: BuildingKind): void {
    const def = FARM_BUILDINGS[kind];
    if (this.livestock.hasBuilding(kind)) {
      this.toast(`农场已经建造了【${def.name}】！`);
      return;
    }
    if (this.inventory.gold < def.goldCost) {
      this.toast(`金币不足，建造需要 ${def.goldCost} G`);
      return;
    }
    if (
      this.inventory.getItemCount('res_wood') < def.woodCost ||
      this.inventory.getItemCount('res_stone') < def.stoneCost
    ) {
      this.toast(`建材不足，需要木材 ×${def.woodCost}、石头 ×${def.stoneCost}`);
      return;
    }

    this.inventory.gold -= def.goldCost;
    this.inventory.removeItem('res_wood', def.woodCost);
    this.inventory.removeItem('res_stone', def.stoneCost);
    this.livestock.build(kind);
    this.tileMap.setBuildingBuilt(kind, true);

    this.audio.play('upgrade');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: -def.goldCost });
    this.bus.emit('livestock:changed', undefined);
    this.toast(`罗宾已火速在农场东南牧场建好了【${def.name}】！现在可以领养动物啦！`);
    this.saveGameState();
  }

  adoptAnimal(kind: AnimalKind): void {
    const def = ANIMAL_CATALOG[kind];
    const check = this.livestock.canAdopt(kind);
    if (!check.ok) {
      this.toast(check.reason ?? '暂时无法领养');
      return;
    }
    if (this.inventory.gold < def.price) {
      this.toast(`金币不足，领养${def.name}需要 ${def.price} G`);
      return;
    }
    this.inventory.gold -= def.price;
    const animal = this.livestock.adopt(kind);
    this.audio.play('pet');
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: -def.price });
    this.bus.emit('livestock:changed', undefined);
    this.toast(`领养成功！可爱的${def.name}【${animal?.name ?? ''}】已住进农场牧场！`);
    this.saveGameState();
  }

  /* =========================================================
     COMPANION CATS (ADOPT, PET, TREAT, WATER BOWL, FOLLOW)
     ========================================================= */

  claimBirthdayGift(): 'claimed' | 'already-claimed' | 'bag-full' | 'save-failed' {
    if (this.birthdayGiftClaimed) return 'already-claimed';
    const slots = this.inventory.slotsWithItemsAdded(BIRTHDAY_GIFT);
    if (!slots) return 'bag-full';

    // Write the entire reward and receipt together before announcing or applying it.
    const save = this.createSaveData();
    const cats = new PetSystem();
    cats.load(save.pets);
    cats.welcomeBirthdayCats();
    for (const cat of cats.cats) cat.pettedToday = true;
    save.pets = cats.serialize();
    save.inventory = slots;
    save.discoveredItems = [...new Set([...this.collections.discoveredItems, ...BIRTHDAY_GIFT.map((item) => item.itemId)])];
    save.birthdayGiftClaimed = true;
    if (!this.saveManager.save(save)) return 'save-failed';

    this.birthdayGiftClaimed = true;
    this.inventory.slots.splice(0, this.inventory.slots.length, ...slots);
    for (const { itemId } of BIRTHDAY_GIFT) this.collections.recordDiscovery(itemId);
    this.pets.load(save.pets);
    this.placeCatsForCurrentSchedule();
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('bundles:changed', undefined);
    this.bus.emit('pet:changed', undefined);
    return 'claimed';
  }

  startBirthdayCelebration(): void {
    if (this.currentSceneId !== 'farm') {
      this.travelTo('farm', { ...FARM_LAYOUT.spawnTile, facing: 'down' });
    }
    this.pets.welcomeBirthdayCats();
    this.pets.celebratingOnFarm = true;
    this.placeCatsForCurrentSchedule();
    this.bus.emit('pet:changed', undefined);
    this.saveGameState();
  }

  /** Opens the porch mailbox letter addressed to Yiyi (12.03) inside the native wooden letter dialog. */
  openPorchMailbox(): void {
    const firstRead = !this.birthdayLetterRead;
    this.birthdayLetterRead = true;
    this.audio.play('ui');
    if (firstRead) {
      this.saveGameState();
    }
    this.bus.emit('ui:openMailboxLetter', undefined);
  }

  openFlowerStand(): void {
    this.audio.play('ui');
    this.bus.emit('ui:openFlowerStand', undefined);
  }

  /** Places the chosen classic bouquet into the cabin ceramic vase and silently notifies the private channel. */
  chooseCabinBouquet(bouquetId: BouquetId, note?: string): boolean {
    const bouquet = getBouquetDef(bouquetId);
    if (!bouquet) return false;

    const prevName = getBouquetDef(this.selectedBouquetId)?.name;
    this.selectedBouquetId = bouquet.id;
    this.bouquetNote = (note ?? '').trim().slice(0, 60);

    notifyBouquetSelected({
      bouquet,
      note: this.bouquetNote,
      previousBouquetName: prevName,
    });

    const wx = (HOUSE_FIXTURES.flowerStand.x + 1) * TILE_SIZE;
    const wy = HOUSE_FIXTURES.flowerStand.y * TILE_SIZE;
    this.audio.play('harvest');
    this.particles.spawnHarvestSparkle(wx, wy);
    this.particles.spawnHeartBurst(wx, wy - 2);
    this.particles.spawnFloatingText(wx, wy - 12, `💐 ${bouquet.name}`, bouquet.accentColor);

    this.bus.emit('bouquet:changed', undefined);
    this.saveGameState();
    this.toast(`💐 已将【${bouquet.name}】插进小屋花瓶里，满屋都是淡淡花香～`);
    return true;
  }

  /**
   * Interacts with the cozy candlelit strawberry cake inside the farmhouse:
   * blows out candles into wish sparks, plays the music-box Happy Birthday song,
   * gathers both real-cat companions around the table, and launches in-world pixel heart fireworks!
   */
  interactWithBirthdayCake(): void {
    const cakeX = (HOUSE_FIXTURES.birthdayTable.x + 1) * TILE_SIZE;
    const cakeY = HOUSE_FIXTURES.birthdayTable.y * TILE_SIZE;

    if (this.birthdayCandlesLit) {
      this.birthdayCandlesLit = false;
      this.pets.welcomeBirthdayCats();
      this.indoorBirthdayGathering = true;

      // Seat both cats affectionately around the birthday cake table inside the cabin
      const maine = this.pets.getCat('cat_maine_silver');
      const bicolor = this.pets.getCat('cat_bicolor_tabby');
      if (maine) {
        maine.x = (HOUSE_FIXTURES.birthdayTable.x - 0.6) * TILE_SIZE;
        maine.y = (HOUSE_FIXTURES.birthdayTable.y + 1.05) * TILE_SIZE;
        maine.targetX = maine.x;
        maine.targetY = maine.y;
        maine.facing = 'right';
        maine.state = 'idle';
        maine.stateTimer = 4.5;
        this.particles.spawnHeartBurst(maine.x, maine.y);
        this.particles.spawnFloatingText(maine.x, maine.y - 16, `${maine.name}：喵呜～生日快乐！`, '#ffd4e5');
      }
      if (bicolor) {
        bicolor.x = (HOUSE_FIXTURES.birthdayTable.x + 2.4) * TILE_SIZE;
        bicolor.y = (HOUSE_FIXTURES.birthdayTable.y + 1.05) * TILE_SIZE;
        bicolor.targetX = bicolor.x;
        bicolor.targetY = bicolor.y;
        bicolor.facing = 'left';
        bicolor.state = 'idle';
        bicolor.stateTimer = 4.5;
        this.particles.spawnHeartBurst(bicolor.x, bicolor.y);
        this.particles.spawnFloatingText(bicolor.x, bicolor.y - 16, `${bicolor.name}：吐舌贴贴 ♥`, '#ffe59c');
      }

      this.audio.playBirthdayMelody();
      this.audio.play('firework');
      this.audio.play('meow');
      this.particles.spawnPixelHeartFirework(cakeX, cakeY - 12);
      this.particles.spawnPixelHeartFirework(cakeX - 38, cakeY - 22);
      this.particles.spawnPixelHeartFirework(cakeX + 32, cakeY - 20);
      this.particles.spawnFloatingText(cakeX, cakeY - 18, '♥ 12.03 依依生日快乐 ♥', '#ffb0cf');

      this.bus.emit('pet:changed', undefined);
      this.saveGameState();
      this.toast('🕯️ 烛光化作星愿！愿依依 12.03 生日快乐——两只小猫咪围在身旁，走出门还有漫天花瓣雨在等你 🌸');
    } else {
      this.birthdayCandlesLit = true;
      this.audio.playBirthdayMelody();
      this.audio.play('firework');
      this.particles.spawnPixelHeartFirework(cakeX, cakeY - 14);
      this.particles.spawnHeartBurst(cakeX, cakeY - 4);
      this.toast('🕯️ 重新点亮了 12.03 草莓蛋糕烛光，八音盒再次为你奏响～');
    }
  }

  private endBirthdayCelebration(): void {
    if (!this.pets.celebratingOnFarm) return;
    this.pets.celebratingOnFarm = false;
    this.placeCatsForCurrentSchedule();
  }

  private placeCatsForCurrentSchedule(): void {
    if (this.pets.celebratingOnFarm && this.currentSceneId === 'farm') {
      for (const cat of this.pets.cats) {
        this.pets.summonNear(cat.breedId, this.player.x, this.player.y);
      }
      return;
    }
    const scene = this.pets.getActiveScene(this.weather.isRainy(), this.time.minutes);
    if (scene) this.pets.placeForScene(scene);
  }

  adoptCat(breedId: CatBreedId, customName?: string): boolean {
    const cat = this.pets.adopt(breedId, customName);
    if (!cat) {
      this.toast('这只小猫咪已经住在农场里啦！');
      return false;
    }
    const def = getCatBreedDef(breedId);
    this.placeCatsForCurrentSchedule();
    if (this.weather.isRainy()) {
      this.pets.bowlFilledToday = true;
    }
    this.audio.play('meow');
    this.particles.spawnHeartBurst(cat.x, cat.y);
    this.bus.emit('pet:changed', undefined);
    this.toast(`欢迎【${cat.name}】（${def.name}）来到晨露农场！记得常抚摸它并给水碗添水哦～`);
    this.saveGameState();
    return true;
  }

  adoptAllCats(names?: Partial<Record<CatBreedId, string>>): void {
    let adopted = 0;
    for (const breedId of CAT_BREED_IDS) {
      if (!this.pets.hasBreed(breedId)) {
        const cat = this.pets.adopt(breedId, names?.[breedId]);
        if (cat) adopted += 1;
      }
    }
    if (adopted === 0) {
      this.toast('两只小猫咪都已经安家在晨露农场啦！');
      return;
    }
    this.placeCatsForCurrentSchedule();
    if (this.weather.isRainy()) {
      this.pets.bowlFilledToday = true;
    }
    this.audio.play('meow');
    this.bus.emit('pet:changed', undefined);
    this.toast('太温馨啦！两只小猫咪都已入住晨露农场，快去水碗旁看看它们吧！');
    this.saveGameState();
  }

  renameCat(breedId: CatBreedId, newName: string): boolean {
    if (!this.pets.rename(breedId, newName)) {
      this.toast('猫咪名字不能为空哦');
      return false;
    }
    const cat = this.pets.getCat(breedId);
    this.audio.play('ui');
    this.bus.emit('pet:changed', undefined);
    this.toast(`已将小猫咪改名为【${cat?.name ?? ''}】！`);
    this.saveGameState();
    return true;
  }

  toggleCatFollow(breedId: CatBreedId): void {
    const cat = this.pets.getCat(breedId);
    if (!cat) return;
    const following = this.pets.toggleFollow(breedId);
    this.audio.play('meow');
    this.bus.emit('pet:changed', undefined);
    this.toast(
      this.pets.celebratingOnFarm
        ? `庆生结束后，【${cat.name}】会${following ? '继续跟随你' : '恢复自由漫步'}。`
        : following
        ? `【${cat.name}】开启跟随模式，迈着小碎步跟在你身后啦！`
        : `【${cat.name}】切换为自由漫步模式，在院子里晒太阳打盹啦！`
    );
    this.saveGameState();
  }

  callCatToPlayer(breedId: CatBreedId): void {
    const cat = this.pets.getCat(breedId);
    if (!cat) return;
    if (!this.pets.isInScene(this.currentSceneId, this.weather.isRainy(), this.time.minutes)) {
      const where = this.pets.getActiveScene(this.weather.isRainy(), this.time.minutes);
      this.toast(
        where === 'house'
          ? `现在下雨或天色已晚，【${cat.name}】正在农舍小屋壁炉旁等你哦！`
          : `【${cat.name}】正在晨露农场阳光下玩耍，回农场就能呼唤它！`
      );
      return;
    }
    this.pets.summonNear(breedId, this.player.x, this.player.y);
    this.audio.play('meow');
    this.particles.spawnHeartBurst(cat.x, cat.y);
    this.particles.spawnFloatingText(cat.x, cat.y - 12, getCatBreedDef(breedId).soundText, '#ffd4e5');
    this.toast(`你呼唤了一声，【${cat.name}】立刻屁颠屁颠跑到了身边！`);
  }

  interactWithCat(cat: CompanionCatRuntime): void {
    // If already petted today & holding a favorite treat item, offer it directly!
    const held = this.inventory.getSelectedItemDef();
    if (
      cat.pettedToday &&
      !cat.pendingGiftItemId &&
      !cat.treatGivenToday &&
      held &&
      this.pets.isFavoriteTreat(cat.breedId, held.id)
    ) {
      this.feedCatTreat(cat.breedId, held.id);
      return;
    }

    const res = this.pets.petInteract(cat);
    this.audio.play('meow');
    this.particles.spawnHeartBurst(cat.x, cat.y);

    if (res.claimedGiftItemId) {
      if (this.inventory.canAddItem(res.claimedGiftItemId, 1)) {
        this.inventory.addItem(res.claimedGiftItemId, 1);
        this.collections.recordDiscovery(res.claimedGiftItemId);
        const itemName = getItemDef(res.claimedGiftItemId)?.name ?? '小礼物';
        this.audio.play('harvest');
        this.particles.spawnHarvestSparkle(cat.x, cat.y);
        this.particles.spawnFloatingText(cat.x, cat.y - 14, `🎁 +1 ${itemName}`, '#ffe570');
        this.bus.emit('inventory:changed', undefined);
        this.bus.emit('bundles:changed', undefined);
        this.toast(`【${cat.name}】蹭了蹭你，把清晨叼回来的【${itemName}】送给了你！`);
      } else {
        cat.pendingGiftItemId = res.claimedGiftItemId;
        this.toast(`【${cat.name}】嘴里叼着礼物想送你，但背包满啦，先腾个空位吧！`);
      }
    } else if (res.pettedNow) {
      const hearts = this.pets.getHearts(cat);
      this.particles.spawnFloatingText(cat.x, cat.y - 14, `♥ ${res.soundText}`, '#ff9bb8');
      if (res.reachedNewHeart) {
        this.audio.play('bundle');
        this.toast(`★ 好感升级！【${cat.name}】对你的羁绊达到 ${hearts} 颗心啦！`);
      } else {
        this.toast(`温柔撸了撸【${cat.name}】（${res.soundText}），好感度 +${res.gainedPoints}！`);
      }
    } else {
      this.particles.spawnFloatingText(cat.x, cat.y - 14, res.soundText, '#fff4cc');
    }

    this.bus.emit('pet:changed', undefined);
    this.saveGameState();
  }

  feedCatTreat(breedId: CatBreedId, itemId: string): boolean {
    const cat = this.pets.getCat(breedId);
    if (!cat) return false;
    if (this.inventory.getItemCount(itemId) < 1) {
      this.toast('背包里没有这项小零食啦！');
      return false;
    }

    const res = this.pets.giveTreat(breedId, itemId);
    if (!res.ok) {
      this.toast(res.reason ?? '暂时无法喂食');
      return false;
    }

    this.inventory.removeItem(itemId, 1);
    const itemName = getItemDef(itemId)?.name ?? '零食';
    this.audio.play('meow');
    this.particles.spawnHeartBurst(cat.x, cat.y);
    this.particles.spawnFloatingText(cat.x, cat.y - 14, `♥ 好感 +${res.gainedPoints}`, '#ff8db3');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('pet:changed', undefined);

    if (res.reachedNewHeart) {
      this.audio.play('bundle');
      this.toast(
        `★ 投喂【${itemName}】大成功！【${cat.name}】开心地转圈圈，羁绊升至 ${this.pets.getHearts(cat)} 颗心！`
      );
    } else {
      this.toast(`给【${cat.name}】喂了【${itemName}】，它大口吃光，好感 +${res.gainedPoints}！`);
    }
    this.saveGameState();
    return true;
  }

  waterPetBowl(): boolean {
    if (!this.pets.hasAnyCat()) {
      this.audio.play('ui');
      this.bus.emit('ui:openPets', undefined);
      this.toast('这是空着的猫咪水碗！先挑一只或两只小猫咪领养回家吧～');
      return false;
    }
    if (this.pets.bowlFilledToday) {
      this.toast('猫咪水碗已经是满满的清甜泉水啦！');
      return false;
    }
    if (this.inventory.waterLevel <= 0) {
      this.toast('喷壶没水啦！先去水塘装满水再来给猫咪水碗添水吧');
      return false;
    }

    this.inventory.consumeWater(1);
    this.pets.fillWaterBowl();
    const wx = (FARM_LAYOUT.petBowl.x + 0.5) * TILE_SIZE;
    const wy = (FARM_LAYOUT.petBowl.y + 0.5) * TILE_SIZE;
    this.audio.play('water');
    this.particles.spawnWaterSplash(wx, wy);
    this.particles.spawnFloatingText(wx, wy - 8, '💧 水碗已添满!', '#8ee2ff');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('pet:changed', undefined);
    this.toast('已为猫咪水碗倒满清水！明天清晨小猫咪们喝完会大幅提升好感度～');
    this.saveGameState();
    return true;
  }

  buySeed(itemId: string, quantity = 1): void {
    const result = this.inventory.buyItem(itemId, quantity);
    if (!result.ok) {
      this.toast(result.reason ?? '购买失败');
      return;
    }
    const def = getItemDef(itemId);
    this.audio.play('coin');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: -result.cost });
    this.toast(`购买了 ${def?.name ?? '种子'} ×${quantity}`);
    this.saveGameState();
  }

  sellCropDirect(itemId: string, quantity = 1): void {
    const result = this.inventory.sellItemDirect(itemId, quantity);
    if (!result.ok) return;
    const def = getItemDef(itemId);
    this.collections.recordDiscovery(itemId);
    this.audio.play('coin');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: result.earned });
    this.bus.emit('bundles:changed', undefined);
    this.toast(`出售 ${def?.name ?? '物品'} ×${quantity}，获得 +${result.earned} G`);
    this.saveGameState();
  }

  buyFurniture(furnitureId: string): void {
    const def = getFurnitureDef(furnitureId);
    if (!def) return;
    if (this.inventory.gold < def.price) {
      this.toast('金币不足，先多种点作物赚钱吧！');
      return;
    }
    this.inventory.gold -= def.price;
    this.house.addOwnedFurniture(furnitureId, 1);
    this.audio.play('coin');
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: -def.price });
    this.bus.emit('house:decorateChanged', {
      active: this.decorateMode,
      selectedFurnitureId: this.selectedFurnitureId ?? furnitureId,
    });
    this.toast(`已购入【${def.name}】！回农舍小屋按 F 即可摆放`);
    this.saveGameState();
  }

  /* =========================================================
     QUESTS, BUNDLES, TV & HOUSE DECORATION
     ========================================================= */

  acceptDailyQuest(): void {
    if (this.quests.acceptCurrent()) {
      this.audio.play('ui');
      this.bus.emit('quests:changed', undefined);
      this.toast('已接取小镇公告栏委托！收集齐全后可随时交付领奖');
      this.saveGameState();
    }
  }

  deliverDailyQuest(): void {
    const q = this.quests.currentQuest;
    if (!q || q.completed) return;
    if (this.inventory.getItemCount(q.itemId) < q.quantity) {
      const name = getItemDef(q.itemId)?.name ?? '委托物品';
      this.toast(`背包中【${name}】数量不足（需要 ×${q.quantity}）`);
      return;
    }
    this.inventory.removeItem(q.itemId, q.quantity);
    const reward = this.quests.completeCurrent();
    if (!reward) return;

    this.inventory.gold += reward.goldReward;
    this.npcs.addBonusFriendship(reward.npcId, reward.friendshipBonus);
    this.audio.play('bundle');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: reward.goldReward });
    this.bus.emit('npc:changed', undefined);
    this.bus.emit('quests:changed', undefined);
    this.toast(`委托达成！获得 +${reward.goldReward} G 与大幅好感度奖励！`);
    this.saveGameState();
  }

  donateToBundle(bundleId: string, itemId: string): void {
    if (this.inventory.getItemCount(itemId) < 1) {
      const name = getItemDef(itemId)?.name ?? '该物品';
      this.toast(`背包中暂时没有【${name}】可以献祭`);
      return;
    }

    const res = this.collections.donate(bundleId, itemId);
    if (!res.ok) {
      this.toast(res.reason ?? '献祭失败');
      return;
    }

    this.inventory.removeItem(itemId, 1);
    this.audio.play(res.bundleCompleted ? 'bundle' : 'harvest');

    if (res.bundleCompleted) {
      if (res.rewardKind === 'unlock_greenhouse') {
        this.tileMap.setGreenhouseUnlocked(true);
      } else if (res.rewardKind === 'gift_sprinklers') {
        this.inventory.addItem('mach_quality_sprinkler', 2);
        this.inventory.gold += 500;
        this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: 500 });
      } else if (res.rewardKind === 'unlock_mine_elevator') {
        this.inventory.gold += 400;
        this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: 400 });
      }
      this.toast(`★ 收集包完成！【${res.bundleCompleted.name}】奖励：${res.bundleCompleted.rewardText}`);
    } else {
      this.toast(`成功向社区中心献祭【${getItemDef(itemId)?.name ?? ''}】！`);
    }

    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('bundles:changed', undefined);
    this.saveGameState();
  }

  openTvBroadcast(): void {
    this.audio.play('ui');
    const tomorrowFest = this.time.getTomorrowFestival();
    this.bus.emit('tv:open', {
      tomorrowWeatherLabel: this.weather.getLabel(this.weather.tomorrow),
      tomorrowWeatherDesc: this.weather.getForecastDescription(this.time.seasonId),
      farmingTip: this.weather.getDailyTip(this.time.day),
      festivalNote: tomorrowFest
        ? `🎉 节日预告：明天就是一年一度的【${tomorrowFest}】，记得去晨露小镇广场参加庆典！`
        : null,
    });
  }

  openChest(machineUid: string): void {
    this.activeChestUid = machineUid;
    this.audio.play('ui');
    this.bus.emit('chest:open', { machineUid });
  }

  setDecorateMode(active: boolean): void {
    if (this.currentSceneId !== 'house') active = false;
    this.decorateMode = active;
    if (active) {
      const ownedList = this.house.getOwnedFurnitureList();
      if (!this.selectedFurnitureId || this.house.getOwnedCount(this.selectedFurnitureId) <= 0) {
        this.selectedFurnitureId = ownedList[0]?.furnitureId ?? null;
      }
    }
    this.bus.emit('house:decorateChanged', {
      active: this.decorateMode,
      selectedFurnitureId: this.selectedFurnitureId,
    });
  }

  selectFurnitureToPlace(furnitureId: string | null): void {
    this.selectedFurnitureId = furnitureId;
    this.bus.emit('house:decorateChanged', {
      active: this.decorateMode,
      selectedFurnitureId: this.selectedFurnitureId,
    });
  }

  /* =========================================================
     NPC DIALOGUE, HEART EVENTS & GIFTS
     ========================================================= */

  talkToNpc(npcId: string): void {
    const isFestivalDay = this.time.getTodayFestival() !== null;
    const res = this.npcs.talk(npcId, {
      seasonId: this.time.seasonId,
      isFestivalDay,
    });
    if (!res) return;

    this.activeDialogueNpcId = npcId;
    this.audio.play(res.triggeredHeartEvent ? 'bundle' : 'ui');

    if (res.gainedPoints > 0) {
      const npc = this.npcs.get(npcId);
      if (npc) {
        this.particles.spawnFloatingText(npc.x, npc.y - 16, `好感 +${res.gainedPoints}`, '#ff9bb8');
      }
    }

    // Grant Heart Event reward!
    if (res.triggeredHeartEvent) {
      const ev = res.triggeredHeartEvent;
      if (ev.rewardType === 'recipe' && ev.rewardId) {
        this.stats.unlockRecipe(ev.rewardId);
      } else if (ev.rewardType === 'furniture' && ev.rewardId) {
        this.house.addOwnedFurniture(ev.rewardId, 1);
      } else if (ev.rewardType === 'gold' && ev.rewardGold) {
        this.inventory.gold += ev.rewardGold;
        this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: ev.rewardGold });
      }
      this.toast(`触发心级剧情：${ev.rewardText}`);
    }

    this.bus.emit('npc:changed', undefined);
    this.bus.emit('dialogue:open', res.dialogue);
    this.saveGameState();
  }

  giftToNpc(npcId: string, itemId: string): void {
    const itemDef = getItemDef(itemId);
    if (!itemDef) return;
    if (this.inventory.getItemCount(itemId) <= 0) {
      this.toast('背包里没有该物品可赠送');
      return;
    }

    const res = this.npcs.receiveGift(npcId, itemId);
    if (!res.ok) {
      if (res.dialogue) this.bus.emit('dialogue:open', res.dialogue);
      return;
    }

    this.inventory.removeItem(itemId, 1);
    const npc = this.npcs.get(npcId);
    if (npc) {
      this.particles.spawnHeartBurst(npc.x, npc.y);
      this.particles.spawnFloatingText(
        npc.x,
        npc.y - 18,
        res.reaction === 'loved' ? `♥ 最爱! +${res.pointsAdded}` : `♥ 好感 +${res.pointsAdded}`,
        res.reaction === 'loved' ? '#ff6b8b' : '#ffd87d'
      );
    }

    this.audio.play('harvest');
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('npc:changed', undefined);
    if (res.dialogue) this.bus.emit('dialogue:open', res.dialogue);
    this.saveGameState();
  }

  closeDialogue(): void {
    this.activeDialogueNpcId = null;
  }

  /* =========================================================
     OVERNIGHT DAY TRANSITION
     ========================================================= */

  triggerSleep(): void {
    if (this.sleepingTransition) return;
    this.endBirthdayCelebration();
    this.indoorBirthdayGathering = false;
    this.sleepingTransition = true;
    this.setDecorateMode(false);
    this.activeDialogueNpcId = null;
    this.activeChestUid = null;
    if (this.fishing.isActive()) {
      this.fishing.cancel();
      this.bus.emit('fishing:stateChanged', { active: false });
    }
    this.audio.play('sleep');

    const completedDay = this.time.day;
    const { seasonChanged, newSeason } = this.time.advanceToNextMorning();

    const growth = this.crops.advanceDay((x, y) => this.tileMap.isWatered(x, y), {
      newSeason,
      seasonChanged,
      isProtectedByScarecrow: (x, y) => this.machines.isProtectedByScarecrow(x, y),
      isGreenhouseTile: (x, y) => this.tileMap.isGreenhouseSoilTile(x, y),
    });

    this.tileMap.dryAllSoil();
    if (seasonChanged) {
      this.tileMap.respawnSeasonalDebris();
    }

    const newWeather = this.weather.advanceDay(newSeason);
    this.audio.setSeason(newSeason);

    // Rainy/stormy mornings auto-water all outdoor tilled plots!
    let rainAutoWatered = false;
    if (this.weather.isRainy()) {
      this.tileMap.waterAllTilled(false);
      rainAutoWatered = true;
    }

    // Morning sprinklers water adjacent tilled plots (including greenhouse!)
    const sprinklerWateredCount = this.machines.runMorningSprinklers((x, y) =>
      this.tileMap.waterTile(x, y)
    );

    // Complete overnight artisan machines, animal production & companion cats
    this.machines.advanceOvernight();
    const animalProductsCount = this.livestock.advanceDay();
    const petReport = this.pets.advanceDay(this.weather.isRainy());
    const petGiftLines = petReport.broughtGifts.map((g) => {
      const itemName = getItemDef(g.itemId)?.name ?? '神秘礼物';
      return `${g.catName}清晨叼回了一件【${itemName}】，去摸摸它领取吧！`;
    });

    // Restore full stamina & HP, refresh daily NPC & Notice Board quest flags
    this.stats.restOvernight();
    this.npcs.resetDailyFlags();
    this.quests.rollDailyQuest(this.time.day, newSeason);

    const settled = this.inventory.settleShippingBin();

    // Wake up inside cozy farmhouse beside the bed
    this.currentSceneId = 'house';
    this.sceneSwitcher?.('house', {
      x: HOUSE_FIXTURES.bedWakeSpawn.x,
      y: HOUSE_FIXTURES.bedWakeSpawn.y,
      facing: 'right',
    });

    this.saveGameState();
    this.emitAllHudSync();

    this.bus.emit('day:summary', {
      completedDay,
      newDay: this.time.day,
      season: this.time.season,
      seasonId: newSeason,
      todayWeather: newWeather,
      lines: settled.lines,
      totalGold: settled.totalGold,
      cropsGrownCount: growth.grownCount,
      cropsReadyCount: growth.readyCount,
      crowEatenCount: growth.crowEatenCount,
      witheredCount: growth.witheredCount,
      sprinklerWateredCount,
      rainAutoWatered,
      animalProductsCount,
      petBowlDrank: petReport.drankFromBowl,
      petGiftLines,
      petMaxHeartNames: petReport.maxHeartNames,
      festivalToday: this.time.getTodayFestival(),
    });
  }

  finishSleepModal(): void {
    this.sleepingTransition = false;
    const fest = this.time.getTodayFestival();
    if (fest) {
      this.toast(`🎉 今天是【${fest}】！快去晨露小镇广场参加庆典吧！`);
    } else if (this.weather.isRainy()) {
      this.toast(`早安！今天是${this.weather.getLabel()}，全农场耕地已自动湿润！`);
    } else {
      this.toast(`早安！今天是${this.time.season}第 ${this.time.day} 天`);
    }
  }

  /* =========================================================
     RESET, SAVE & LOAD (SCHEMA V3)
     ========================================================= */

  resetFarm(): void {
    this.saveManager.clear();
    this.birthdayGiftClaimed = false;
    this.birthdayLetterRead = false;
    this.birthdayCandlesLit = true;
    this.indoorBirthdayGathering = false;
    this.selectedBouquetId = null;
    this.bouquetNote = '';
    this.tileMap.resetToDefault();
    this.crops.clear();
    this.inventory.resetToStarter();
    this.time.reset();
    this.weather.reset();
    this.stats.reset();
    this.house.resetToStarter();
    this.machines.clear();
    this.livestock.reset();
    this.pets.reset();
    this.mine.deepestFloor = 1;
    this.quests.rollDailyQuest(1, 'spring');
    this.collections.reset();
    this.npcs.resetAll();
    this.setDecorateMode(false);
    this.audio.setSeason('spring');

    this.travelTo('farm', {
      x: FARM_LAYOUT.spawnTile.x,
      y: FARM_LAYOUT.spawnTile.y,
      facing: 'down',
    });
    this.emitAllHudSync();
    this.saveGameState();
    this.toast('已重置为全新的晨露谷存档！');
  }

  saveGameState(): void {
    this.saveManager.save(this.createSaveData());
  }

  private createSaveData(): GameSaveData {
    const inv = this.inventory.serialize();
    const houseData = this.house.serialize();
    const statsData = this.stats.serialize();
    const liveData = this.livestock.serialize();
    const colData = this.collections.serialize();

    return {
      version: SAVE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      currentSceneId: this.currentSceneId === 'mine' ? 'farm' : this.currentSceneId,
      day: this.time.day,
      season: this.time.seasonId,
      timeMinutes: this.time.minutes,
      gold: inv.gold,
      waterLevel: inv.waterLevel,
      selectedSlot: inv.selectedSlot,
      playerX: this.player.x,
      playerY: this.player.y,
      soilTiles: this.tileMap.serializeSoil(),
      crops: this.crops.serialize(),
      inventory: inv.slots,
      shippingBin: inv.shippingBin,
      placedFurniture: houseData.placed,
      ownedFurniture: houseData.owned,
      npcs: this.npcs.serialize(),
      todayWeather: this.weather.today,
      tomorrowWeather: this.weather.tomorrow,
      energy: statsData.energy,
      hp: statsData.hp,
      toolTiers: statsData.toolTiers,
      unlockedRecipes: statsData.unlockedRecipes,
      farmNodes: this.tileMap.serializeWildNodes(),
      machines: this.machines.serialize(),
      builtBuildings: liveData.built,
      animals: liveData.animals,
      deepestMineFloor: this.mine.deepestFloor,
      dailyQuest: this.quests.serialize(),
      bundleDonated: colData.bundleDonated,
      bundleCompleted: colData.bundleCompleted,
      discoveredItems: colData.discoveredItems,
      unlockedGreenhouse: colData.unlockedGreenhouse,
      unlockedFastTravel: colData.unlockedFastTravel,
      unlockedMineElevator: colData.unlockedMineElevator,
      pets: this.pets.serialize(),
      birthdayGiftClaimed: this.birthdayGiftClaimed,
      birthdayLetterRead: this.birthdayLetterRead,
      selectedBouquetId: this.selectedBouquetId,
      bouquetNote: this.bouquetNote,
    };
  }

  loadGameState(): boolean {
    const saved = this.saveManager.load();
    if (!saved) return false;
    this.birthdayGiftClaimed = saved.birthdayGiftClaimed === true;
    this.birthdayLetterRead = saved.birthdayLetterRead === true;
    this.indoorBirthdayGathering = false;
    this.selectedBouquetId = getBouquetDef(saved.selectedBouquetId)?.id ?? null;
    this.bouquetNote = typeof saved.bouquetNote === 'string' ? saved.bouquetNote.slice(0, 60) : '';

    this.time.load(saved.day, saved.season, saved.timeMinutes);
    this.audio.setSeason(this.time.seasonId);
    this.weather.load(saved.todayWeather, saved.tomorrowWeather);
    this.stats.load({
      energy: saved.energy,
      hp: saved.hp,
      toolTiers: saved.toolTiers,
      unlockedRecipes: saved.unlockedRecipes,
    });

    this.collections.load({
      bundleDonated: saved.bundleDonated,
      bundleCompleted: saved.bundleCompleted,
      discoveredItems: saved.discoveredItems,
      unlockedGreenhouse: saved.unlockedGreenhouse,
      unlockedFastTravel: saved.unlockedFastTravel,
      unlockedMineElevator: saved.unlockedMineElevator,
    });

    this.tileMap.setGreenhouseUnlocked(this.collections.unlockedGreenhouse);
    this.tileMap.loadWildNodes(saved.farmNodes);
    this.tileMap.loadSoil(saved.soilTiles);

    this.livestock.load(saved.builtBuildings, saved.animals);
    for (const b of this.livestock.builtBuildings) {
      this.tileMap.setBuildingBuilt(b, true);
    }
    this.pets.load(saved.pets);

    this.crops.load(saved.crops);
    this.machines.load(saved.machines);
    this.inventory.setMaxWaterLevel(this.stats.getWateringCanCapacity());
    this.inventory.load({
      slots: saved.inventory,
      gold: saved.gold,
      waterLevel: saved.waterLevel,
      selectedSlot: saved.selectedSlot,
      shippingBin: saved.shippingBin,
    });
    this.house.load(saved.placedFurniture, saved.ownedFurniture);
    this.npcs.load(saved.npcs);
    this.quests.load(saved.dailyQuest);
    if (typeof saved.deepestMineFloor === 'number') {
      this.mine.deepestFloor = Math.max(1, Math.floor(saved.deepestMineFloor));
    }

    const targetScene: SceneId =
      saved.currentSceneId === 'house' || saved.currentSceneId === 'town'
        ? saved.currentSceneId
        : 'farm';
    this.currentSceneId = targetScene;

    if (targetScene === 'town') {
      if (Number.isFinite(saved.playerX) && Number.isFinite(saved.playerY)) {
        // TownScene.enter validates the restored footprint against the live town grid.
        this.player.x = saved.playerX;
        this.player.y = saved.playerY;
      } else {
        this.player.setPositionTile(TOWN_ENTRY.x, TOWN_ENTRY.y, TOWN_ENTRY.facing);
      }
    } else if (Number.isFinite(saved.playerX) && Number.isFinite(saved.playerY)) {
      const tx = Math.floor(saved.playerX / TILE_SIZE);
      const ty = Math.floor(saved.playerY / TILE_SIZE);
      if (targetScene === 'farm' && !this.tileMap.isSolid(tx, ty)) {
        this.player.x = saved.playerX;
        this.player.y = saved.playerY;
      } else if (targetScene === 'house' && !this.house.isSolid(tx, ty)) {
        this.player.x = saved.playerX;
        this.player.y = saved.playerY;
      } else {
        this.player.resetToSpawn();
      }
    }

    if (targetScene !== 'farm') this.pets.celebratingOnFarm = false;
    this.placeCatsForCurrentSchedule();
    return true;
  }

  /* =========================================================
     EVENT SYNC HELPERS
     ========================================================= */

  emitTimeSync(): void {
    this.bus.emit('time:changed', {
      day: this.time.day,
      season: this.time.season,
      seasonId: this.time.seasonId,
      minutes: this.time.minutes,
      festivalName: this.time.getTodayFestival(),
    });
  }

  emitStatsSync(): void {
    this.bus.emit('stats:changed', {
      energy: this.stats.energy,
      maxEnergy: this.stats.maxEnergy,
      hp: this.stats.hp,
      maxHp: this.stats.maxHp,
    });
  }

  emitMineSync(): void {
    this.bus.emit('mine:changed', {
      floor: this.mine.floor,
      deepestFloor: this.mine.deepestFloor,
      slimesRemaining: this.mine.slimes.length,
    });
  }

  emitAllHudSync(): void {
    this.bus.emit('inventory:changed', undefined);
    this.bus.emit('gold:changed', { gold: this.inventory.gold, delta: 0 });
    this.emitStatsSync();
    this.emitTimeSync();
    this.bus.emit('weather:changed', {
      today: this.weather.today,
      tomorrow: this.weather.tomorrow,
      label: this.weather.getLabel(),
    });
    this.bus.emit('scene:changed', {
      sceneId: this.currentSceneId,
      label: SCENE_LABELS[this.currentSceneId],
    });
    this.bus.emit('npc:changed', undefined);
    this.bus.emit('quests:changed', undefined);
    this.bus.emit('bundles:changed', undefined);
    this.bus.emit('livestock:changed', undefined);
    this.bus.emit('pet:changed', undefined);
    this.bus.emit('bouquet:changed', undefined);
  }

  toast(message: string): void {
    this.bus.emit('toast:show', { message });
  }
}
