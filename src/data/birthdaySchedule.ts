/**
 * Controls when Yiyi's 12.03 Birthday Easter Eggs appear in-world:
 * - Porch mailbox unread 12.03 love letter & gift claim
 * - Indoor candlelit strawberry birthday cake table, Happy Birthday melody & heart fireworks
 * - Outdoor dual-cat 12.03 petal-shower parade
 *
 * Unlocks automatically at 00:00 on December 3 (Beijing Time / UTC+8), remaining visible
 * throughout December (Dec 3 - Dec 31).
 *
 * Supports a hidden URL preview parameter (`?preview=1203`) so the gift creator can verify
 * the birthday experience anytime before December 3 while keeping normal visits spoiler-free.
 */
export const BIRTHDAY_MONTH = 12;
export const BIRTHDAY_DAY = 3;

export function isBirthdaySeasonActive(now: Date = new Date()): boolean {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const preview = params.get('preview') ?? params.get('birthday');
      if (preview === '1203') return true;
      if (preview === 'off' || preview === 'normal') return false;
    } catch {
      // Ignore malformed query strings
    }
  }

  // Compute Beijing Time (UTC+8) deterministically regardless of host OS timezone
  const beijing = new Date(now.getTime() + 8 * 60 * 60_000);
  const month = beijing.getUTCMonth() + 1;
  const day = beijing.getUTCDate();
  return month === BIRTHDAY_MONTH && day >= BIRTHDAY_DAY;
}
