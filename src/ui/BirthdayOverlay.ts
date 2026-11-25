import type { GameWorld } from '../core/GameWorld';

const LETTER_STORAGE_KEY = 'sunmeadow_yiyi_1203_letter_v1';

const DEFAULT_LETTER_BODY = `亲爱的依依：

十二月的风带着初冬的微凉，却也吹来了我一整年里最期待的一天——12 月 3 日，属于你的生日。

在这座小小的晨露谷里，我偷偷为你种满了四季常开的花，点亮了木屋温暖的壁炉，还把两只最乖巧的小猫咪接到了院子里陪你晒太阳、摇尾巴。

谢谢你来到我的身边，把原本平淡的每一天都变成了闪闪发光的礼物。新的一岁，愿你眼里永远盛满星辰，身边永远被偏爱包围；清晨有热气腾腾的早餐，夜晚有安稳香甜的好梦，心里许下的每一个愿望都不必声张便能如约实现。

12.03 生日快乐，依依——不止今天，往后的每一个春夏秋冬，我都想牵着你的手一起走过。`;

const DEFAULT_LETTER_SIGN = '—— 永远偏爱你、陪在你身边的我 ♥';

interface StarDot {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  color: string;
}

interface FloatingPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  color: string;
}

interface SkyLantern {
  x: number;
  y: number;
  vy: number;
  swayPhase: number;
  scale: number;
}

interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
}

const HEART_PALETTES = [
  ['#ff6b9d', '#ff9ebb', '#ffd6e4'],
  ['#ffb86c', '#ffd98e', '#fff3cc'],
  ['#e07be0', '#f5a9f5', '#ffe0ff'],
  ['#ff5e7e', '#ff94ac', '#fff0f4'],
];

/**
 * Self-contained controller for Yiyi's 12.03 Romantic Birthday Blessing Interface:
 * - Starry twilight canvas with drifting sakura/rose petals, sky lanterns & heart-curve fireworks
 * - Live countdown to December 3 (switches to birthday celebration headline on Dec 3!)
 * - Interactive 3-candle strawberry cake wish + music-box "Happy Birthday" melody
 * - Two bespoke real-life cat guardians + 5-heart gift bundle
 * - Typewriter vellum love letter with localStorage customization
 */
export class BirthdayOverlay {
  private readonly world: GameWorld;
  private readonly onCloseCallback: () => void;

  private readonly overlayEl = mustGet('modal-birthday');
  private readonly canvas = mustGet('birthday-fx-canvas') as HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private readonly countdownEl = mustGet('bday-countdown-badge');
  private readonly wishStatusEl = mustGet('bday-wish-status');
  private readonly cakeArtEl = mustGet('bday-cake-art');
  private readonly wishBtnEl = mustGet('btn-bday-wish') as HTMLButtonElement;

  private readonly leftCatImg = mustGet('bday-cat-left-img') as HTMLImageElement;
  private readonly leftCatName = mustGet('bday-cat-left-name');
  private readonly rightCatImg = mustGet('bday-cat-right-img') as HTMLImageElement;
  private readonly rightCatName = mustGet('bday-cat-right-name');

  private readonly letterPaperEl = mustGet('bday-letter-paper');
  private readonly letterContentEl = mustGet('bday-letter-content');
  private readonly letterSignEl = mustGet('bday-letter-sign');
  private readonly editorBoxEl = mustGet('bday-editor-box');
  private readonly editorTextarea = mustGet('bday-editor-textarea') as HTMLTextAreaElement;
  private readonly editorSignInput = mustGet('bday-editor-sign-input') as HTMLInputElement;

  private active = false;
  private candlesBlown = false;
  private readonly giftBtn = mustGet('btn-bday-cats-gift') as HTMLButtonElement;
  private rafId: number | null = null;
  private lastFrameTs = 0;

  private letterBody = DEFAULT_LETTER_BODY;
  private letterSign = DEFAULT_LETTER_SIGN;
  private typewriterTimer: number | null = null;
  private salvoTimers: number[] = [];

  private stars: StarDot[] = [];
  private petals: FloatingPetal[] = [];
  private lanterns: SkyLantern[] = [];
  private sparks: FireworkSpark[] = [];

  constructor(world: GameWorld, onCloseCallback: () => void) {
    this.world = world;
    this.onCloseCallback = onCloseCallback;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize birthday FX canvas');
    this.ctx = ctx;

    this.loadSavedLetter();
    this.bindEvents();
    this.world.bus.on('pet:changed', () => {
      if (this.active) this.syncCatPortraits();
    });
  }

  isOpen(): boolean {
    return this.active;
  }

  open(): void {
    this.active = true;
    this.candlesBlown = false;
    this.cakeArtEl.classList.remove('candles-blown');
    this.wishBtnEl.textContent = '🕯️ 闭上眼许个愿 · 吹灭生日蜡烛';
    this.wishStatusEl.textContent = '点击下方按钮闭眼许愿，吹灭 12·03 星愿蜡烛 ✨';
    this.editorBoxEl.classList.add('hidden');

    this.syncCatPortraits();
    this.syncGiftButton();
    this.updateCountdownText();
    this.overlayEl.classList.remove('hidden');

    this.resizeCanvas();
    this.seedSkyScene();
    this.startTypewriter();

    // Gentle opening dual heart fireworks!
    this.scheduleSalvo([
      { delay: 220, rx: 0.22, ry: 0.26 },
      { delay: 580, rx: 0.78, ry: 0.24 },
    ]);

    this.lastFrameTs = performance.now();
    const tick = (now: number): void => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - this.lastFrameTs) / 1000);
      this.lastFrameTs = now;
      this.updateAndRenderSky(dt, now * 0.001);
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.overlayEl.classList.add('hidden');
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stopTypewriter();
    this.clearSalvoTimers();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      if (this.active) this.resizeCanvas();
    });

    mustGet('btn-close-birthday').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.onCloseCallback();
    });

    // Click starry sky to launch custom heart fireworks!
    this.canvas.addEventListener('click', (e) => {
      if (!this.active) return;
      const rect = this.canvas.getBoundingClientRect();
      this.launchHeartFirework(e.clientX - rect.left, e.clientY - rect.top, 1.05);
      this.world.audio.play('firework');
    });

    // Make a wish & blow out candles -> Music Box Happy Birthday + Heart Fireworks!
    this.wishBtnEl.addEventListener('click', () => {
      if (!this.candlesBlown) {
        this.candlesBlown = true;
        this.cakeArtEl.classList.add('candles-blown');
        this.wishStatusEl.textContent =
          '✨ 12·03 生日愿望已寄往星河，依依许下的每一个心愿都会如约成真！✨';
        this.wishBtnEl.textContent = '🎵 再听一遍八音盒生日歌 & 重燃星愿烛光';
        this.world.audio.playBirthdayMelody();
        this.launchGrandFinaleSalvo();
      } else {
        this.candlesBlown = false;
        this.cakeArtEl.classList.remove('candles-blown');
        this.wishStatusEl.textContent = '🕯️ 星愿烛光已重新点亮，八音盒再次为依依奏响～';
        this.wishBtnEl.textContent = '🕯️ 闭上眼许个愿 · 吹灭生日蜡烛';
        this.world.audio.playBirthdayMelody();
        this.scheduleSalvo([
          { delay: 80, rx: 0.25, ry: 0.28 },
          { delay: 380, rx: 0.75, ry: 0.28 },
          { delay: 680, rx: 0.5, ry: 0.18 },
        ]);
      }
    });

    // Two adorable cat guardians
    mustGet('bday-cat-left').addEventListener('click', () => {
      const maine = this.world.pets.getCat('cat_maine_silver');
      const name = maine?.name ?? '灰绒';
      this.world.audio.play('meow');
      this.launchHeartFirework(window.innerWidth * 0.24, window.innerHeight * 0.32, 0.85);
      this.wishStatusEl.textContent = `🐾 ${name}歪着长耳朵蹭了蹭依依：“喵呜～祝最爱的依依 12.03 生日快乐！”`;
    });

    mustGet('bday-cat-right').addEventListener('click', () => {
      const bicolor = this.world.pets.getCat('cat_bicolor_tabby');
      const name = bicolor?.name ?? '奶盖';
      this.world.audio.play('meow');
      this.launchHeartFirework(window.innerWidth * 0.76, window.innerHeight * 0.32, 0.85);
      this.wishStatusEl.textContent = `🐾 ${name}吐着粉嫩小舌头贴贴依依：“喵嗷～小鱼干和好运全都送给依依！”`;
    });

    // Clicking the letter paper reveals full text immediately if still typing
    this.letterPaperEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, textarea, input, .bday-editor-box')) return;
      if (this.typewriterTimer !== null) {
        this.finishTypewriterImmediately();
      }
    });

    // Customize love letter toggle & save
    mustGet('btn-bday-edit-toggle').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.finishTypewriterImmediately();
      this.editorTextarea.value = this.letterBody;
      this.editorSignInput.value = this.letterSign;
      this.editorBoxEl.classList.toggle('hidden');
    });

    mustGet('btn-bday-reset-letter').addEventListener('click', () => {
      this.editorTextarea.value = DEFAULT_LETTER_BODY;
      this.editorSignInput.value = DEFAULT_LETTER_SIGN;
    });

    mustGet('btn-bday-save-letter').addEventListener('click', () => {
      const nextBody = this.editorTextarea.value.trim() || DEFAULT_LETTER_BODY;
      const nextSign = this.editorSignInput.value.trim() || DEFAULT_LETTER_SIGN;
      this.letterBody = nextBody;
      this.letterSign = nextSign;
      this.saveLetterToStorage();
      this.editorBoxEl.classList.add('hidden');
      this.world.audio.play('bundle');
      this.startTypewriter();
    });

    // Footer surprise buttons
    mustGet('btn-bday-fireworks').addEventListener('click', () => {
      this.launchGrandFinaleSalvo();
    });

    this.giftBtn.addEventListener('click', () => {
      this.grantCatsAndBirthdayGift();
    });

    mustGet('btn-bday-enter-farm').addEventListener('click', () => {
      this.enterRomanticFarmCelebration();
    });
  }

  private syncCatPortraits(): void {
    this.leftCatImg.src = this.world.atlas.getIconDataUrl('portrait_pet_cat_maine_silver');
    this.rightCatImg.src = this.world.atlas.getIconDataUrl('portrait_pet_cat_bicolor_tabby');

    const maine = this.world.pets.getCat('cat_maine_silver');
    const bicolor = this.world.pets.getCat('cat_bicolor_tabby');
    this.leftCatName.textContent = `${maine?.name ?? '灰绒'} · 聪明毛守护`;
    this.rightCatName.textContent = `${bicolor?.name ?? '奶盖'} · 吐舌萌贴贴`;
  }

  private updateCountdownText(): void {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() === 3) {
      this.countdownEl.textContent = '✨ 今天就是 12 月 3 日 · 祝最爱的依依生日快乐！✨';
      return;
    }

    let targetYear = now.getFullYear();
    let target = new Date(targetYear, 11, 3, 0, 0, 0, 0);
    if (now.getTime() > target.getTime()) {
      targetYear += 1;
      target = new Date(targetYear, 11, 3, 0, 0, 0, 0);
    }

    const diffMs = Math.max(0, target.getTime() - now.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    if (days === 0) {
      this.countdownEl.textContent = `🌟 距离依依 12月3日 生日仅剩 ${hours} 小时 ${mins} 分钟！`;
    } else {
      this.countdownEl.textContent = `🌟 距离依依 12月3日 生日还有 ${days} 天 ${hours} 小时`;
    }
  }

  private syncGiftButton(): void {
    this.giftBtn.disabled = this.world.birthdayGiftClaimed;
    this.giftBtn.textContent = this.world.birthdayGiftClaimed
      ? '🎁 生日礼盒已领取'
      : '🐾 收下双猫满心祝福与礼盒';
  }

  private grantCatsAndBirthdayGift(): void {
    const result = this.world.claimBirthdayGift();
    this.syncGiftButton();
    if (result === 'bag-full') {
      this.wishStatusEl.textContent = '背包放不下整份生日礼物。给吐司、郁金香和紫水晶腾些位置，再来领取吧！';
      return;
    }
    if (result === 'save-failed') {
      this.wishStatusEl.textContent = '暂时无法保存领取进度。礼盒为你留着，稍后可以再试。';
      return;
    }
    if (result === 'already-claimed') {
      this.wishStatusEl.textContent = '这份生日礼盒已经领过啦。';
      return;
    }

    this.world.audio.play('bundle');
    this.world.audio.play('meow');
    this.launchGrandFinaleSalvo();
    this.wishStatusEl.textContent =
      '🎁 两只小猫咪已达成 5 ♥ 满心羁绊。草莓吐司 ×2、郁金香 ×3 和紫水晶 ×1 已放进背包！';
  }

  private enterRomanticFarmCelebration(): void {
    this.onCloseCallback();
    this.world.startBirthdayCelebration();
    this.world.particles.spawnHeartBurst(this.world.player.x, this.world.player.y - 6);
    this.world.particles.spawnFloatingText(
      this.world.player.x,
      this.world.player.y - 18,
      '♥ 依依 12.03 生日快乐 ♥',
      '#ffa6c9'
    );
    this.world.audio.play('meow');
    this.world.toast('🌸 已开启农场漫天花瓣雨庆典！两只满心小猫咪正一左一右陪在你身边～');
  }

  /* =========================================================
     TYPEWRITER LOVE LETTER & STORAGE
     ========================================================= */

  private startTypewriter(): void {
    this.stopTypewriter();
    this.letterContentEl.textContent = '';
    this.letterSignEl.textContent = '';

    const chars = Array.from(this.letterBody);
    let idx = 0;
    this.typewriterTimer = window.setInterval(() => {
      idx += 2;
      if (idx >= chars.length) {
        this.finishTypewriterImmediately();
        return;
      }
      this.letterContentEl.textContent = chars.slice(0, idx).join('');
    }, 28);
  }

  private finishTypewriterImmediately(): void {
    this.stopTypewriter();
    this.letterContentEl.textContent = this.letterBody;
    this.letterSignEl.textContent = this.letterSign;
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer !== null) {
      window.clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private loadSavedLetter(): void {
    try {
      const raw = window.localStorage?.getItem(LETTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { body?: string; sign?: string };
      if (parsed.body?.trim()) this.letterBody = parsed.body;
      if (parsed.sign?.trim()) this.letterSign = parsed.sign;
    } catch {
      // Ignore storage access errors
    }
  }

  private saveLetterToStorage(): void {
    try {
      window.localStorage?.setItem(
        LETTER_STORAGE_KEY,
        JSON.stringify({ body: this.letterBody, sign: this.letterSign })
      );
    } catch {
      // Ignore storage access errors
    }
  }

  /* =========================================================
     STARRY SKY, SAKURA PETALS, LANTERNS & HEART FIREWORKS
     ========================================================= */

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private seedSkyScene(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const starColors = ['#fff8e7', '#ffd6e6', '#d8e8ff', '#ffe8b8'];

    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.7 + Math.random() * 1.7,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 2.4,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const petalColors = [
      'rgba(255, 182, 206, 0.76)',
      'rgba(255, 212, 226, 0.72)',
      'rgba(255, 198, 178, 0.68)',
    ];
    this.petals = Array.from({ length: 28 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: -14 - Math.random() * 18,
      vy: 20 + Math.random() * 26,
      size: 4 + Math.random() * 4.5,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 2.2,
      color: petalColors[Math.floor(Math.random() * petalColors.length)],
    }));

    this.lanterns = Array.from({ length: 10 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 9 + Math.random() * 11,
      swayPhase: Math.random() * Math.PI * 2,
      scale: 0.65 + Math.random() * 0.55,
    }));

    this.sparks = [];
  }

  private launchGrandFinaleSalvo(): void {
    this.clearSalvoTimers();
    const bursts = [
      { delay: 0, rx: 0.16, ry: 0.24 },
      { delay: 220, rx: 0.84, ry: 0.24 },
      { delay: 460, rx: 0.3, ry: 0.16 },
      { delay: 700, rx: 0.7, ry: 0.16 },
      { delay: 960, rx: 0.12, ry: 0.48 },
      { delay: 1200, rx: 0.88, ry: 0.48 },
      { delay: 1480, rx: 0.5, ry: 0.14 },
    ];
    this.scheduleSalvo(bursts);
  }

  private scheduleSalvo(bursts: { delay: number; rx: number; ry: number }[]): void {
    for (const b of bursts) {
      const id = window.setTimeout(() => {
        if (!this.active) return;
        this.launchHeartFirework(window.innerWidth * b.rx, window.innerHeight * b.ry, 1.0);
        this.world.audio.play('firework');
      }, b.delay);
      this.salvoTimers.push(id);
    }
  }

  private clearSalvoTimers(): void {
    for (const id of this.salvoTimers) window.clearTimeout(id);
    this.salvoTimers = [];
  }

  /**
   * Spawns a parametric heart-curve firework burst + inner stardust shimmer!
   */
  private launchHeartFirework(cx: number, cy: number, scale = 1): void {
    const palette = HEART_PALETTES[Math.floor(Math.random() * HEART_PALETTES.length)];
    const count = 56;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      // Classic parametric heart curve
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      );
      const jitter = 0.92 + Math.random() * 0.16;
      const speed = 5.4 * scale * jitter;
      this.sparks.push({
        x: cx,
        y: cy,
        vx: hx * speed,
        vy: hy * speed,
        alpha: 1,
        decay: 0.48 + Math.random() * 0.24,
        size: 2.2 + Math.random() * 1.8,
        color: palette[i % palette.length],
      });
    }

    // Inner golden stardust core
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (18 + Math.random() * 48) * scale;
      this.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        alpha: 1,
        decay: 0.7 + Math.random() * 0.35,
        size: 1.6 + Math.random() * 1.4,
        color: '#fff6d6',
      });
    }
  }

  private updateAndRenderSky(dt: number, timeSec: number): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Twinkling stars
    for (const s of this.stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(timeSec * s.speed + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. Warm floating sky lanterns
    for (const l of this.lanterns) {
      l.y -= l.vy * dt;
      const lx = l.x + Math.sin(timeSec * 0.9 + l.swayPhase) * 16;
      if (l.y < -30) {
        l.y = h + 24;
        l.x = Math.random() * w;
      }

      ctx.save();
      ctx.translate(lx, l.y);
      ctx.scale(l.scale, l.scale);
      const grad = ctx.createRadialGradient(0, 2, 1, 0, 2, 18);
      grad.addColorStop(0, 'rgba(255, 232, 168, 0.55)');
      grad.addColorStop(1, 'rgba(255, 150, 90, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 2, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffbe73';
      ctx.fillRect(-5, -7, 10, 13);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-3, -3, 6, 7);
      ctx.restore();
    }

    // 3. Drifting sakura / rose petals
    for (const p of this.petals) {
      p.x += (p.vx + Math.sin(timeSec * 1.5 + p.rot) * 10) * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;

      if (p.y > h + 16) {
        p.y = -12;
        p.x = Math.random() * w;
      }
      if (p.x < -16) {
        p.x = w + 12;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Heart firework sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.965;
      sp.vy = sp.vy * 0.965 + 22 * dt; // soft romantic float + slight gravity
      sp.alpha -= sp.decay * dt;

      if (sp.alpha <= 0.02) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing birthday element #${id}`);
  return el;
}
