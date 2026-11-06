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
  businessId?: string;
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

const DEFAULT_PRODUCTS_PREFIX = 'vbl_pos_cached_products';
const DEFAULT_QUEUE_PREFIX = 'vbl_pos_queued_sales';

function getProductsKey(businessId?: string): string {
  return businessId ? `${DEFAULT_PRODUCTS_PREFIX}_${businessId}` : DEFAULT_PRODUCTS_PREFIX;
}

function getQueueKey(businessId?: string): string {
  return businessId ? `${DEFAULT_QUEUE_PREFIX}_${businessId}` : DEFAULT_QUEUE_PREFIX;
}

export const offlineStore = {
  // 1. Cache Products per Merchant
  cacheProducts(products: unknown[], businessId?: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getProductsKey(businessId), JSON.stringify(products));
    } catch {
      /* ignore storage quota */
    }
  },

  getCachedProducts(businessId?: string): unknown[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(getProductsKey(businessId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 2. Queue Offline Cash Sales per Merchant
  queueSale(
    sale: Omit<OfflineQueuedSale, 'idempotencyKey' | 'offlineCreatedAt'>,
    businessId?: string
  ): OfflineQueuedSale {
    if (typeof window === 'undefined') {
      throw new Error('Window storage unavailable');
    }

    const targetBizId = businessId || sale.businessId;
    const queued: OfflineQueuedSale = {
      ...sale,
      businessId: targetBizId,
      idempotencyKey: `off_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      offlineCreatedAt: new Date().toISOString(),
    };

    try {
      const current = this.getQueuedSales(targetBizId);
      current.push(queued);
      localStorage.setItem(getQueueKey(targetBizId), JSON.stringify(current));
    } catch {
      /* ignore */
    }

    return queued;
  },

  getQueuedSales(businessId?: string): OfflineQueuedSale[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(getQueueKey(businessId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  clearQueue(businessId?: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getQueueKey(businessId));
  },

  removeSale(idempotencyKey: string, businessId?: string) {
    if (typeof window === 'undefined') return;
    const current = this.getQueuedSales(businessId).filter((s) => s.idempotencyKey !== idempotencyKey);
    localStorage.setItem(getQueueKey(businessId), JSON.stringify(current));
  },

  // 3. Sync all queued sales when connection returns
  async syncPendingSales(businessId?: string): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueuedSales(businessId);
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (item.businessId) {
          headers['x-business-id'] = item.businessId;
        }

        const res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers,
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
          this.removeSale(item.idempotencyKey, businessId || item.businessId);
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
