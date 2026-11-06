'use client';

export interface OfflineCartItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents?: number;
  discountCents?: number;
}

export interface OfflineQueuedSale {
  idempotencyKey: string;
  items: OfflineCartItem[];
  paymentMethod: 'cash';
  tenderAmountCents?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  offlineCreatedAt: string;
  totalCents: number;
}

const PRODUCTS_KEY = 'vbl_pos_cached_products';
const QUEUE_KEY = 'vbl_pos_queued_sales';

export const offlineStore = {
  // 1. Cache Products
  cacheProducts(products: unknown[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch {
      /* ignore storage quota */
    }
  },

  getCachedProducts(): unknown[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 2. Queue Offline Cash Sales
  queueSale(sale: Omit<OfflineQueuedSale, 'idempotencyKey' | 'offlineCreatedAt'>): OfflineQueuedSale {
    if (typeof window === 'undefined') {
      throw new Error('Window storage unavailable');
    }

    const queued: OfflineQueuedSale = {
      ...sale,
      idempotencyKey: `off_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      offlineCreatedAt: new Date().toISOString(),
    };

    try {
      const current = this.getQueuedSales();
      current.push(queued);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }

    return queued;
  },

  getQueuedSales(): OfflineQueuedSale[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  clearQueue() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(QUEUE_KEY);
  },

  removeSale(idempotencyKey: string) {
    if (typeof window === 'undefined') return;
    const current = this.getQueuedSales().filter((s) => s.idempotencyKey !== idempotencyKey);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
  },

  // 3. Sync all queued sales when connection returns
  async syncPendingSales(): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueuedSales();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: item.items,
            paymentMethod: 'cash',
            tenderAmountCents: item.tenderAmountCents,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
            notes: item.notes,
            idempotencyKey: item.idempotencyKey,
            isOfflineSync: true,
            offlineCreatedAt: item.offlineCreatedAt,
          }),
        });

        if (res.ok) {
          this.removeSale(item.idempotencyKey);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  },
};
