'use client';

/**
 * Offline cash sales.
 *
 * When the till has no connection, a CASH sale is stored on the device with
 * its idempotency key and the time it happened. When the connection returns,
 * each is sent to the same checkout as any other sale; the server prices it
 * from the catalogue, takes stock (recording any shortfall for review rather
 * than refusing a sale whose cash is already in the drawer), and treats a
 * repeat of the same key as the same sale — so syncing twice is harmless.
 *
 * Only network failures and server errors keep a sale queued. A sale the
 * server refuses outright (e.g. a product deleted meanwhile) is moved to a
 * "needs attention" list instead of being retried forever or silently lost.
 */

export interface OfflineLine {
  productId?: string;
  custom?: { name: string; unitPriceCents: number };
  name: string;
  quantity: number;
  /** Price shown on the till when the sale was made, for the receipt and mismatch check. */
  unitPriceCents: number;
  discountCents?: number;
}

export interface OfflineQueuedSale {
  idempotencyKey: string;
  businessId: string;
  items: OfflineLine[];
  tenderAmountCents?: number;
  totalCents: number;
  offlineCreatedAt: string;
  operatorToken?: string;
  lastError?: string;
  attempts?: number;
}

const PRODUCTS = 'vbl_pos_products_v2';
const QUEUE = 'vbl_pos_queue_v2';
const REJECTED = 'vbl_pos_rejected_v2';
const LAST_SYNC = 'vbl_pos_last_sync_v2';

const k = (base: string, businessId: string) => `${base}_${businessId}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export const offlineStore = {
  cacheProducts(businessId: string, products: unknown[]) {
    write(k(PRODUCTS, businessId), { at: new Date().toISOString(), products });
  },

  getCachedProducts(businessId: string): unknown[] {
    return read<{ products: unknown[] }>(k(PRODUCTS, businessId), { products: [] }).products;
  },

  queueSale(sale: OfflineQueuedSale) {
    const q = this.getQueuedSales(sale.businessId);
    if (!q.some((s) => s.idempotencyKey === sale.idempotencyKey)) q.push(sale);
    write(k(QUEUE, sale.businessId), q);
  },

  getQueuedSales(businessId: string): OfflineQueuedSale[] {
    return read<OfflineQueuedSale[]>(k(QUEUE, businessId), []);
  },

  getRejectedSales(businessId: string): OfflineQueuedSale[] {
    return read<OfflineQueuedSale[]>(k(REJECTED, businessId), []);
  },

  dismissRejected(businessId: string, idempotencyKey: string) {
    write(k(REJECTED, businessId), this.getRejectedSales(businessId).filter((s) => s.idempotencyKey !== idempotencyKey));
  },

  lastSyncedAt(businessId: string): string | null {
    return read<string | null>(k(LAST_SYNC, businessId), null);
  },

  async syncPendingSales(businessId: string): Promise<{ synced: number; failed: number; rejected: number }> {
    const queue = this.getQueuedSales(businessId);
    let synced = 0;
    let failed = 0;
    let rejected = 0;
    const remaining: OfflineQueuedSale[] = [];
    const newlyRejected: OfflineQueuedSale[] = [];

    for (const item of queue) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-business-id': businessId };
        if (item.operatorToken) headers['x-pos-operator'] = item.operatorToken;
        const res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: item.items.map((l) => (l.custom ? { custom: l.custom, quantity: l.quantity, discountCents: l.discountCents } : { productId: l.productId, quantity: l.quantity, discountCents: l.discountCents })),
            paymentMethod: 'cash',
            tenderAmountCents: item.tenderAmountCents,
            idempotencyKey: item.idempotencyKey,
            offline: { createdAt: item.offlineCreatedAt, clientTotalCents: item.totalCents },
          }),
        });
        if (res.ok) {
          synced++;
          continue;
        }
        const data = await res.json().catch(() => ({}));
        // An expired PIN session is not the sale's fault: retry under the device's own sign-in.
        if (res.status === 401 && data.code === 'OPERATOR_EXPIRED') {
          remaining.push({ ...item, operatorToken: undefined, lastError: 'PIN session expired — will sync as the signed-in user', attempts: (item.attempts ?? 0) + 1 });
          failed++;
        } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 402 && res.status !== 408 && res.status !== 429) {
          newlyRejected.push({ ...item, lastError: String(data.error || `HTTP ${res.status}`) });
          rejected++;
        } else {
          remaining.push({ ...item, lastError: String(data.error || `HTTP ${res.status}`), attempts: (item.attempts ?? 0) + 1 });
          failed++;
        }
      } catch (err) {
        remaining.push({ ...item, lastError: err instanceof Error ? err.message : 'Network error', attempts: (item.attempts ?? 0) + 1 });
        failed++;
      }
    }

    write(k(QUEUE, businessId), remaining);
    if (newlyRejected.length) write(k(REJECTED, businessId), [...this.getRejectedSales(businessId), ...newlyRejected]);
    if (synced > 0 || (queue.length > 0 && failed === 0)) write(k(LAST_SYNC, businessId), new Date().toISOString());
    return { synced, failed, rejected };
  },
};
