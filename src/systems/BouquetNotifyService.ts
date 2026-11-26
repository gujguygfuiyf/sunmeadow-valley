import { BOUQUET_NOTIFY_TOPIC, type BouquetDef } from '../data/bouquets';

export interface BouquetNotifyPayload {
  bouquet: BouquetDef;
  note?: string;
  previousBouquetName?: string;
}

/**
 * Silently notifies the private ntfy.sh channel whenever a flower bouquet is placed in the cabin vase.
 * Runs fire-and-forget in browsers with full CORS support and never disrupts gameplay if offline.
 */
export function notifyBouquetSelected(payload: BouquetNotifyPayload): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  if (import.meta.env?.VITEST) return;

  const { bouquet, note, previousBouquetName } = payload;
  const timeText = new Date().toLocaleString('zh-CN', { hour12: false });
  const lines = [
    `她在小屋花瓶里选了：【${bouquet.name}】`,
    `花语：${bouquet.tagline}`,
  ];
  if (previousBouquetName && previousBouquetName !== bouquet.name) {
    lines.push(`（之前插的是：${previousBouquetName}）`);
  }
  const cleanNote = note?.trim();
  if (cleanNote) {
    lines.push(`小纸条：「${cleanNote}」`);
  }
  lines.push(`时间：${timeText}`);

  const body = JSON.stringify({
    topic: BOUQUET_NOTIFY_TOPIC,
    title: `依依选了【${bouquet.name}】`,
    message: lines.join('\n'),
    tags: ['bouquet', 'sparkling_heart'],
  });

  void fetch('https://ntfy.sh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Stay completely silent if network is offline or blocked
  });
}
