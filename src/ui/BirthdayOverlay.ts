import type { GameWorld } from '../core/GameWorld';

const LETTER_STORAGE_KEY = 'sunmeadow_yiyi_1203_letter_v1';

const DEFAULT_LETTER_BODY = `亲爱的依依：

十二月的风带着初冬的微凉，却也吹来了我一整年里最期待的一天——12 月 3 日，属于你的生日。

在这座小小的晨露谷里，我偷偷为你种满了四季常开的花，点亮了木屋温暖的壁炉，还把两只最乖巧的小猫咪接到了院子里陪你晒太阳、摇尾巴。

谢谢你来到我的身边，把原本平淡的每一天都变成了闪闪发光的礼物。新的一岁，愿你眼里永远盛满星辰，身边永远被偏爱包围；清晨有热气腾腾的早餐，夜晚有安稳香甜的好梦，心里许下的每一个愿望都不必声张便能如约实现。

12.03 生日快乐，依依——不止今天，往后的每一个春夏秋冬，我都想牵着你的手一起走过。`;

const DEFAULT_LETTER_SIGN = '—— 永远偏爱你、陪在你身边的我 ♥';

const DEFAULT_PS_NOTE =
  '🕯️ 附注：推开农舍小屋的木门，餐桌上还为你点着三根草莓蛋糕蜡烛，走近吹灭它们，两只小猫咪和漫天花瓣雨会一起出现哦。';

/**
 * Native Stardew-style wooden-framed porch mailbox letter dialog for Yiyi's 12.03 birthday surprise.
 * Replaces any standalone overlay so the celebration lives organically inside the farm & cabin!
 */
export class BirthdayOverlay {
  private readonly world: GameWorld;
  private readonly onCloseCallback: () => void;

  private readonly modalEl = mustGet('modal-letter');
  private readonly postmarkEl = mustGet('letter-postmark');
  private readonly leftStampImg = mustGet('letter-cat-left-img') as HTMLImageElement;
  private readonly rightStampImg = mustGet('letter-cat-right-img') as HTMLImageElement;
  private readonly letterPaperEl = mustGet('letter-paper');
  private readonly letterContentEl = mustGet('letter-content');
  private readonly letterSignEl = mustGet('letter-sign');
  private readonly statusNoteEl = mustGet('letter-status-note');
  private readonly giftBtn = mustGet('btn-letter-claim-gift') as HTMLButtonElement;

  private readonly editorBoxEl = mustGet('letter-editor-box');
  private readonly editorTextarea = mustGet('letter-editor-textarea') as HTMLTextAreaElement;
  private readonly editorSignInput = mustGet('letter-editor-sign-input') as HTMLInputElement;

  private active = false;
  private letterBody = DEFAULT_LETTER_BODY;
  private letterSign = DEFAULT_LETTER_SIGN;
  private typewriterTimer: number | null = null;

  constructor(world: GameWorld, onCloseCallback: () => void) {
    this.world = world;
    this.onCloseCallback = onCloseCallback;

    this.loadSavedLetter();
    this.bindEvents();
    this.world.bus.on('pet:changed', () => {
      if (this.active) this.syncStamps();
    });
  }

  isOpen(): boolean {
    return this.active;
  }

  open(): void {
    this.active = true;
    this.editorBoxEl.classList.add('hidden');
    this.statusNoteEl.textContent = DEFAULT_PS_NOTE;
    this.syncStamps();
    this.syncGiftButton();
    this.updatePostmark();
    this.modalEl.classList.remove('hidden');
    this.startTypewriter();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.modalEl.classList.add('hidden');
    this.stopTypewriter();
  }

  private bindEvents(): void {
    mustGet('btn-close-letter').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.onCloseCallback();
    });

    mustGet('btn-letter-done').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.onCloseCallback();
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.onCloseCallback();
      }
    });

    // Clicking the letter paper finishes typewriter immediately for faster readers
    this.letterPaperEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, textarea, input, .letter-editor-box')) return;
      if (this.typewriterTimer !== null) {
        this.finishTypewriterImmediately();
      }
    });

    mustGet('btn-letter-edit-toggle').addEventListener('click', () => {
      this.world.audio.play('ui');
      this.finishTypewriterImmediately();
      this.editorTextarea.value = this.letterBody;
      this.editorSignInput.value = this.letterSign;
      this.editorBoxEl.classList.toggle('hidden');
    });

    mustGet('btn-letter-reset').addEventListener('click', () => {
      this.editorTextarea.value = DEFAULT_LETTER_BODY;
      this.editorSignInput.value = DEFAULT_LETTER_SIGN;
    });

    mustGet('btn-letter-save').addEventListener('click', () => {
      this.letterBody = this.editorTextarea.value.trim() || DEFAULT_LETTER_BODY;
      this.letterSign = this.editorSignInput.value.trim() || DEFAULT_LETTER_SIGN;
      this.saveLetterToStorage();
      this.editorBoxEl.classList.add('hidden');
      this.world.audio.play('bundle');
      this.startTypewriter();
    });

    this.giftBtn.addEventListener('click', () => {
      this.handleClaimGift();
    });
  }

  private syncStamps(): void {
    this.leftStampImg.src = this.world.atlas.getIconDataUrl('portrait_pet_cat_maine_silver');
    this.rightStampImg.src = this.world.atlas.getIconDataUrl('portrait_pet_cat_bicolor_tabby');
  }

  private syncGiftButton(): void {
    this.giftBtn.disabled = this.world.birthdayGiftClaimed;
    this.giftBtn.textContent = this.world.birthdayGiftClaimed
      ? '🎁 随信礼盒已收下'
      : '🐾 收下随信附赠的 12.03 双猫礼盒';
  }

  private updatePostmark(): void {
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() === 3) {
      this.postmarkEl.textContent = '邮戳：12 月 3 日 · 今天就是依依的生日！';
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
    this.postmarkEl.textContent =
      days === 0
        ? `邮戳：12 月 3 日 · 距离依依生日仅剩 ${hours} 小时`
        : `邮戳：12 月 3 日 · 距离依依生日还有 ${days} 天 ${hours} 小时`;
  }

  private handleClaimGift(): void {
    const result = this.world.claimBirthdayGift();
    this.syncGiftButton();

    if (result === 'bag-full') {
      this.statusNoteEl.textContent =
        '背包放不下整份随信礼盒，请先给草莓吐司、郁金香和紫水晶腾出空位再来领取！';
      return;
    }
    if (result === 'save-failed') {
      this.statusNoteEl.textContent = '暂时无法保存领取记录，礼盒先为你留着，稍后再试吧。';
      return;
    }
    if (result === 'already-claimed') {
      this.statusNoteEl.textContent = '随信附赠的 12.03 礼盒已经收进背包啦。';
      return;
    }

    this.world.audio.play('bundle');
    this.world.audio.play('meow');
    this.syncStamps();
    this.statusNoteEl.textContent =
      '🎁 已收下随信礼盒！两只小猫咪已达成 5 ♥ 满心羁绊，草莓吐司 ×2、郁金香 ×3 和紫水晶 ×1 已放进背包；进农舍小屋还能吹灭生日蛋糕蜡烛哦！';
  }

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
    }, 26);
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
      // Ignore storage errors
    }
  }

  private saveLetterToStorage(): void {
    try {
      window.localStorage?.setItem(
        LETTER_STORAGE_KEY,
        JSON.stringify({ body: this.letterBody, sign: this.letterSign })
      );
    } catch {
      // Ignore storage errors
    }
  }
}

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing letter modal element #${id}`);
  return el;
}
