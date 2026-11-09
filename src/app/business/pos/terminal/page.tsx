'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  ArrowLeft, Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, CheckCircle2, X,
  Printer, MessageSquare, Loader2, Barcode, Wifi, WifiOff, UserRound, Percent, Mail, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { offlineStore, type OfflineQueuedSale } from '@/lib/pos/offline-store';
import { posFetch, newIdempotencyKey, zar, getOperator, setOperator, METHOD_LABELS, type TillOperatorSession } from '@/lib/pos/client';
import { loadPosContext, PosAccessBanner, type PosContext } from '@/components/pos/pos-header';
import { CameraScanner } from '@/components/pos/camera-scanner';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category_id?: string | null;
  selling_price_cents: number | string;
  tax_rate_percent: number | string;
  stock_quantity: number | string;
  min_stock_threshold: number | string;
  barcode?: string | null;
  sku?: string | null;
  image_url?: string | null;
  unit: string;
  is_active: boolean;
}

interface CartLine {
  key: string;
  productId?: string;
  custom?: { name: string; unitPriceCents: number };
  name: string;
  unitPriceCents: number;
  taxRatePercent: number;
  quantity: number;
  discountCents: number;
  unit: string;
}

interface ReceiptLine { name: string; quantity: number; unitPriceCents: number; discountCents: number; totalCents: number }
interface Receipt {
  receiptNumber: string;
  date: string;
  lines: ReceiptLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  vatCents: number;
  method: string;
  reference?: string | null;
  tenderCents?: number;
  changeCents?: number;
  offline: boolean;
  cashier?: string;
}

const UNIT_STEP: Record<string, number> = { kg: 0.1, l: 0.1, g: 50, ml: 50 };

export default function PosTerminalPage() {
  const { toast } = useToast();
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState<OfflineQueuedSale[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [operator, setOperatorState] = useState<TillOperatorSession | null>(null);

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [method, setMethod] = useState('cash');
  const [tenderRand, setTenderRand] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [processing, setProcessing] = useState(false);
  const saleKey = useRef<string>('');
  const [qr, setQr] = useState<{ saleId: string; url: string; image: string; receiptNumber: string } | null>(null);

  // Receipt
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  // Modals
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [discountLine, setDiscountLine] = useState<CartLine | null>(null);
  const [discountRand, setDiscountRand] = useState('');

  const settings = ctx?.settings ?? {};
  const vatRegistered = Boolean(settings.vat_registered);
  const allowOffline = settings.allow_offline_sales !== false;
  const allowCustom = settings.allow_custom_items !== false;
  const businessId = ctx?.businessId ?? '';
  const enabledMethods = (ctx?.paymentMethods ?? []).filter((m) => m.enabled);

  const refreshQueue = useCallback((bid: string) => {
    setPending(offlineStore.getQueuedSales(bid).length);
    setRejected(offlineStore.getRejectedSales(bid));
    setLastSync(offlineStore.lastSyncedAt(bid));
  }, []);

  const loadData = useCallback(async () => {
    const c = await loadPosContext();
    setCtx(c);
    if (!c) {
      setLoading(false);
      return;
    }
    setOperatorState(getOperator(c.businessId));
    try {
      const [p, cat] = await Promise.all([fetch('/api/pos/products'), fetch('/api/pos/categories')]);
      if (p.ok) {
        const list = ((await p.json()).products || []) as Product[];
        setProducts(list.filter((x) => x.is_active !== false));
        offlineStore.cacheProducts(c.businessId, list);
      } else {
        setProducts(offlineStore.getCachedProducts(c.businessId) as Product[]);
      }
      if (cat.ok) setCategories((await cat.json()).categories || []);
    } catch {
      setProducts(offlineStore.getCachedProducts(c.businessId) as Product[]);
    } finally {
      refreshQueue(c.businessId);
      setLoading(false);
    }
  }, [refreshQueue]);

  const sync = useCallback(async () => {
    if (!businessId || syncing) return;
    setSyncing(true);
    const r = await offlineStore.syncPendingSales(businessId);
    refreshQueue(businessId);
    setSyncing(false);
    if (r.synced) toast({ title: `${r.synced} offline sale${r.synced === 1 ? '' : 's'} synced` });
    if (r.rejected) toast({ title: `${r.rejected} offline sale${r.rejected === 1 ? '' : 's'} need attention`, variant: 'destructive' });
  }, [businessId, syncing, refreshQueue, toast]);

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [loadData]);

  // Sync whenever the connection comes back (and once on load).
  useEffect(() => {
    if (isOnline && businessId && offlineStore.getQueuedSales(businessId).length > 0) sync();
  }, [isOnline, businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Waiting for a QR payment: poll the sale until the PayFast ITN completes it.
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => {
      const r = await posFetch(`/api/pos/sales?id=${qr.saleId}`);
      const sale = r.data.sale as Record<string, unknown> | undefined;
      if (sale?.payment_status === 'completed') {
        clearInterval(t);
        showServerReceipt(r.data as never, undefined);
        setQr(null);
        setCart([]);
        setCheckoutOpen(false);
      } else if (sale && ['failed', 'cancelled'].includes(String(sale.payment_status))) {
        clearInterval(t);
        setQr(null);
        toast({ title: 'The online payment did not go through', variant: 'destructive' });
      }
    }, 3000);
    return () => clearInterval(t);
  }, [qr]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q);
    });
  }, [products, selectedCategory, search]);

  const inCart = (productId: string) => cart.filter((l) => l.productId === productId).reduce((a, l) => a + l.quantity, 0);

  const addProduct = (p: Product) => {
    const step = UNIT_STEP[p.unit] && UNIT_STEP[p.unit] < 1 ? UNIT_STEP[p.unit] : 1;
    const stock = Number(p.stock_quantity);
    if (inCart(p.id) + step > stock + 1e-9) {
      toast({ title: `Only ${stock} ${p.unit} of ${p.name} in stock`, variant: 'destructive' });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: Math.round((l.quantity + step) * 100) / 100 } : l));
      return [...prev, {
        key: `${p.id}_${Date.now()}`, productId: p.id, name: p.name, unitPriceCents: Number(p.selling_price_cents),
        taxRatePercent: Number(p.tax_rate_percent ?? 15), quantity: step, discountCents: 0, unit: p.unit,
      }];
    });
  };

  const changeQty = (line: CartLine, dir: 1 | -1) => {
    const step = UNIT_STEP[line.unit] && UNIT_STEP[line.unit] < 1 ? UNIT_STEP[line.unit] : 1;
    const next = Math.round((line.quantity + dir * step) * 100) / 100;
    if (dir > 0 && line.productId) {
      const p = products.find((x) => x.id === line.productId);
      if (p && next > Number(p.stock_quantity) + 1e-9) {
        toast({ title: `Only ${p.stock_quantity} in stock`, variant: 'destructive' });
        return;
      }
    }
    setCart((prev) => (next <= 0 ? prev.filter((l) => l.key !== line.key) : prev.map((l) => (l.key === line.key ? { ...l, quantity: next, discountCents: Math.min(l.discountCents, Math.round(l.unitPriceCents * next)) } : l))));
  };

  const lineGross = (l: CartLine) => Math.floor((l.unitPriceCents * Math.round(l.quantity * 100) + 50) / 100);
  const subtotal = cart.reduce((a, l) => a + lineGross(l), 0);
  const discount = cart.reduce((a, l) => a + l.discountCents, 0);
  const total = subtotal - discount;
  const vatEstimate = vatRegistered
    ? cart.reduce((a, l) => {
        const net = lineGross(l) - l.discountCents;
        const r = Math.round(l.taxRatePercent * 100);
        return a + Math.floor((net * r * 2 + (10000 + r)) / (2 * (10000 + r)));
      }, 0)
    : 0;
  const tenderCents = tenderRand ? Math.round(parseFloat(tenderRand) * 100) : total;
  const change = Math.max(0, tenderCents - total);

  const openCheckout = () => {
    saleKey.current = newIdempotencyKey('sale');
    setTenderRand((total / 100).toFixed(2));
    setExternalRef('');
    setMethod(enabledMethods.some((m) => m.method === 'cash') ? 'cash' : enabledMethods[0]?.method ?? 'cash');
    setCheckoutOpen(true);
  };

  function showServerReceipt(data: { sale: Record<string, unknown>; items: Record<string, unknown>[]; payment?: Record<string, unknown> | null }, cashierName?: string) {
    const s = data.sale;
    setReceipt({
      receiptNumber: String(s.receipt_number),
      date: new Date(String(s.completed_at ?? s.created_at)).toLocaleString('en-ZA'),
      lines: data.items.map((i) => ({
        name: String(i.product_name), quantity: Number(i.quantity), unitPriceCents: Number(i.unit_price_cents),
        discountCents: Number(i.discount_cents), totalCents: Number(i.total_cents),
      })),
      subtotalCents: Number(s.subtotal_cents),
      discountCents: Number(s.discount_cents),
      totalCents: Number(s.total_cents),
      vatCents: Number(s.tax_cents),
      method: String(s.payment_method),
      reference: (s.payment_reference as string) ?? null,
      tenderCents: data.payment?.tender_amount_cents ? Number(data.payment.tender_amount_cents) : undefined,
      changeCents: data.payment?.change_amount_cents ? Number(data.payment.change_amount_cents) : undefined,
      offline: false,
      cashier: cashierName,
    });
  }

  const queueOffline = () => {
    const sale: OfflineQueuedSale = {
      idempotencyKey: saleKey.current,
      businessId,
      items: cart.map((l) => ({ productId: l.productId, custom: l.custom, name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents, discountCents: l.discountCents || undefined })),
      tenderAmountCents: tenderCents,
      totalCents: total,
      offlineCreatedAt: new Date().toISOString(),
      operatorToken: operator?.token,
    };
    offlineStore.queueSale(sale);
    setReceipt({
      receiptNumber: `OFFLINE-${saleKey.current.slice(-6).toUpperCase()}`,
      date: new Date().toLocaleString('en-ZA'),
      lines: cart.map((l) => ({ name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents, discountCents: l.discountCents, totalCents: lineGross(l) - l.discountCents })),
      subtotalCents: subtotal, discountCents: discount, totalCents: total, vatCents: vatEstimate,
      method: 'cash', tenderCents, changeCents: change, offline: true, cashier: operator?.displayName,
    });
    refreshQueue(businessId);
    setCart([]);
    setCheckoutOpen(false);
    toast({ title: 'Saved offline', description: 'This cash sale will sync when you are back online.' });
  };

  const handlePay = async () => {
    if (cart.length === 0 || processing) return;
    if (method === 'cash' && tenderCents < total) {
      toast({ title: 'Cash tendered is less than the total', variant: 'destructive' });
      return;
    }
    if (!navigator.onLine) {
      if (method === 'cash' && allowOffline) return queueOffline();
      toast({ title: 'No connection', description: 'Only cash sales can be taken offline.', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const r = await posFetch('/api/pos/checkout', {
        method: 'POST',
        json: {
          items: cart.map((l) => (l.custom ? { custom: l.custom, quantity: l.quantity, discountCents: l.discountCents || undefined } : { productId: l.productId, quantity: l.quantity, discountCents: l.discountCents || undefined })),
          paymentMethod: method,
          tenderAmountCents: method === 'cash' ? tenderCents : undefined,
          externalReference: method === 'card_external' ? externalRef : undefined,
          idempotencyKey: saleKey.current,
          customerPhone: customerPhone || undefined,
        },
      });
      if (!r.ok) {
        const code = r.data.code;
        if (code === 'OPERATOR_EXPIRED') setOperatorState(null);
        toast({ title: 'Sale not completed', description: String(r.data.error || 'Please try again.'), variant: 'destructive' });
        if (code === 'INSUFFICIENT_STOCK' || code === 'PRODUCT_NOT_FOUND' || code === 'PRODUCT_INACTIVE') loadData();
        return;
      }
      const sale = r.data.sale as Record<string, unknown>;
      const payResp = r.data.paymentResponse as Record<string, unknown> | undefined;
      if (sale.payment_status === 'pending' && payResp?.paymentActionUrl) {
        const url = String(payResp.paymentActionUrl);
        setQr({ saleId: String(sale.id), url, image: await QRCode.toDataURL(url, { margin: 1, width: 260 }), receiptNumber: String(sale.receipt_number) });
        return;
      }
      showServerReceipt(r.data as never, operator?.displayName);
      if ((r.data.stockConflicts as unknown[] | undefined)?.length) toast({ title: 'Sold more than the stock count — flagged for review' });
      setCart([]);
      setCheckoutOpen(false);
      loadData();
    } catch {
      // The request may or may not have reached the server. Retrying with the
      // same key is safe either way; for cash, keep the sale on the device.
      if (method === 'cash' && allowOffline) queueOffline();
      else toast({ title: 'Connection lost', description: 'Check the connection and press Complete again — you will not be charged twice.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const submitPin = async () => {
    setPinBusy(true);
    const r = await posFetch('/api/pos/staff', { method: 'POST', json: { action: 'verify_pin', pin } });
    setPinBusy(false);
    setPin('');
    if (!r.ok) {
      toast({ title: String(r.data.error || 'Incorrect PIN'), variant: 'destructive' });
      return;
    }
    const staff = r.data.staff as { userId: string; displayName: string; role: string };
    const op = { token: String(r.data.operatorToken), userId: staff.userId, displayName: staff.displayName, role: staff.role, businessId };
    setOperator(op);
    setOperatorState(op);
    setPinOpen(false);
    toast({ title: `${staff.displayName} is now on the till` });
  };

  const endOperator = () => {
    setOperator(null);
    setOperatorState(null);
  };

  const addCustom = () => {
    const cents = Math.round(parseFloat(customPrice) * 100);
    if (!customName.trim() || !Number.isFinite(cents) || cents <= 0) {
      toast({ title: 'Enter a name and a price', variant: 'destructive' });
      return;
    }
    setCart((prev) => [...prev, { key: `custom_${Date.now()}`, custom: { name: customName.trim(), unitPriceCents: cents }, name: customName.trim(), unitPriceCents: cents, taxRatePercent: Number(settings.tax_rate_percent ?? 15), quantity: 1, discountCents: 0, unit: 'item' }]);
    setCustomName('');
    setCustomPrice('');
    setCustomOpen(false);
  };

  const findBarcode = (e: React.FormEvent | null, scanned?: string) => {
    e?.preventDefault();
    const code = (scanned ?? barcode).trim();
    const match = products.find((p) => p.barcode === code || p.sku === code);
    if (!match) {
      if (scanned) setBarcode(scanned);
      toast({ title: `No product with barcode ${code}`, description: 'Add it under Products, with this barcode.', variant: 'destructive' });
      return;
    }
    addProduct(match);
    setBarcode('');
    setScanOpen(false);
  };

  const applyDiscount = () => {
    if (!discountLine) return;
    const cents = Math.round(parseFloat(discountRand || '0') * 100);
    const max = lineGross(discountLine);
    if (!Number.isFinite(cents) || cents < 0 || cents > max) {
      toast({ title: `Discount must be between R0 and ${zar(max)}`, variant: 'destructive' });
      return;
    }
    setCart((prev) => prev.map((l) => (l.key === discountLine.key ? { ...l, discountCents: cents } : l)));
    setDiscountLine(null);
  };

  const receiptText = (r: Receipt) => {
    const lines = [
      `*${ctx?.businessName ?? 'Receipt'}*`,
      settings.receipt_header ? String(settings.receipt_header) : '',
      `Receipt ${r.receiptNumber}${r.offline ? ' (offline — will sync)' : ''}`,
      r.date,
      '',
      ...r.lines.map((l) => `${l.quantity} x ${l.name}  ${zar(l.totalCents)}${l.discountCents ? ` (incl. ${zar(l.discountCents)} off)` : ''}`),
      '',
      `Total: ${zar(r.totalCents)}`,
      vatRegistered && r.vatCents ? `Incl. VAT: ${zar(r.vatCents)} (VAT no. ${settings.vat_number})` : '',
      `Paid: ${METHOD_LABELS[r.method] ?? r.method}${r.reference ? ` (${r.reference})` : ''}`,
      r.changeCents ? `Change: ${zar(r.changeCents)}` : '',
      settings.receipt_footer ? String(settings.receipt_footer) : '',
    ];
    return lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');
  };

  const printReceipt = (r: Receipt) => {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.receiptNumber)}</title>
      <style>body{font:12px/1.4 ui-monospace,monospace;margin:12px;max-width:72mm}h1{font-size:14px;margin:0}.r{display:flex;justify-content:space-between;gap:8px}hr{border:0;border-top:1px dashed #000}</style></head><body>
      <h1>${esc(ctx?.businessName ?? '')}</h1>
      ${vatRegistered ? `<div>TAX INVOICE · VAT no. ${esc(String(settings.vat_number ?? ''))}</div>` : ''}
      ${settings.address ? `<div>${esc(String(settings.address))}</div>` : ''}${settings.phone ? `<div>${esc(String(settings.phone))}</div>` : ''}
      <div>${esc(String(settings.receipt_header ?? ''))}</div><hr>
      <div>Receipt ${esc(r.receiptNumber)}${r.offline ? ' (offline)' : ''}</div><div>${esc(r.date)}</div>${r.cashier ? `<div>Served by ${esc(r.cashier)}</div>` : ''}<hr>
      ${r.lines.map((l) => `<div class="r"><span>${l.quantity} x ${esc(l.name)}</span><span>${zar(l.totalCents)}</span></div>${l.discountCents ? `<div class="r"><span>&nbsp; discount</span><span>-${zar(l.discountCents)}</span></div>` : ''}`).join('')}
      <hr><div class="r"><b>TOTAL</b><b>${zar(r.totalCents)}</b></div>
      ${vatRegistered ? `<div class="r"><span>Incl. VAT</span><span>${zar(r.vatCents)}</span></div>` : ''}
      <div class="r"><span>Paid by</span><span>${esc(METHOD_LABELS[r.method] ?? r.method)}</span></div>
      ${r.reference ? `<div class="r"><span>Ref</span><span>${esc(r.reference)}</span></div>` : ''}
      ${r.tenderCents ? `<div class="r"><span>Tendered</span><span>${zar(r.tenderCents)}</span></div>` : ''}
      ${r.changeCents ? `<div class="r"><span>Change</span><span>${zar(r.changeCents)}</span></div>` : ''}
      <hr><div>${esc(String(settings.receipt_footer ?? ''))}</div><div>Powered by VerifiedBizLink POS</div>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  if (!loading && !ctx) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-bold text-slate-800">You do not have access to a till.</p>
        <Button asChild variant="outline"><Link href="/business/pos">Back</Link></Button>
      </div>
    );
  }

  const readOnly = ctx?.access.mode === 'read_only';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-slate-100 lg:overflow-hidden">
      {/* Catalogue */}
      <section className="flex-1 flex flex-col min-w-0 lg:h-full border-r border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon" className="rounded-xl shrink-0">
              <Link href="/business/pos" aria-label="Back to POS"><ArrowLeft className="h-5 w-5 text-slate-700" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 truncate">{ctx?.businessName || 'Till'}</h1>
              <div className="flex flex-wrap items-center gap-x-2 text-xs">
                {isOnline
                  ? <span className="flex items-center gap-1 text-emerald-700 font-bold"><Wifi className="h-3 w-3" /> Online</span>
                  : <span className="flex items-center gap-1 text-amber-700 font-bold"><WifiOff className="h-3 w-3" /> Offline — cash only</span>}
                {pending > 0 && (
                  <button onClick={sync} disabled={!isOnline || syncing} className="flex items-center gap-1 font-bold text-amber-800 underline-offset-2 hover:underline">
                    {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} {pending} waiting to sync
                  </button>
                )}
                {lastSync && <span className="text-slate-500">Last synced {new Date(lastSync).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {operator ? (
              <Button variant="outline" size="sm" onClick={endOperator} className="rounded-xl text-xs font-bold" title="End PIN session">
                <UserRound className="h-4 w-4 mr-1" /> {operator.displayName} <X className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setPinOpen(true)} className="rounded-xl text-xs font-bold">
                <UserRound className="h-4 w-4 mr-1" /> Cashier PIN
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setScanOpen(true)} className="rounded-xl text-xs font-bold" aria-label="Barcode lookup">
              <Barcode className="h-4 w-4" />
            </Button>
            {allowCustom && (
              <Button variant="outline" size="sm" onClick={() => setCustomOpen(true)} className="rounded-xl border-amber-300 bg-amber-50 text-xs font-bold text-amber-950">
                <Plus className="h-3.5 w-3.5 mr-1" /> Custom
              </Button>
            )}
          </div>
        </div>

        {(readOnly || rejected.length > 0) && (
          <div className="space-y-2 p-3">
            <PosAccessBanner access={ctx?.access} canPay={ctx?.capabilities.includes('billing.manage')} />
            {rejected.map((r) => (
              <div key={r.idempotencyKey} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950">
                <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Offline sale of {zar(r.totalCents)} at {new Date(r.offlineCreatedAt).toLocaleString('en-ZA')} could not be recorded: {r.lastError}</span>
                <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={() => { offlineStore.dismissRejected(businessId, r.idempotencyKey); refreshQueue(businessId); }}>Dismiss</Button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, barcode or SKU" className="pl-10 h-11 rounded-xl bg-slate-50 text-sm" aria-label="Search products" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-3.5 text-slate-400" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[{ id: 'all', name: `All (${products.length})` }, ...categories].map((c) => (
              <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={cn('rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap', selectedCategory === c.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ShoppingBag className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No products found</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">{search ? 'Try another search.' : 'Add products under Products, or use a custom item.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filtered.map((p) => {
                const stock = Number(p.stock_quantity);
                const out = stock <= 0;
                const low = !out && stock <= Number(p.min_stock_threshold);
                return (
                  <button key={p.id} onClick={() => addProduct(p)} disabled={out || readOnly} className={cn('flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-2.5 text-left shadow-xs transition active:scale-95 min-h-[7.5rem]', out ? 'opacity-50 border-slate-200' : 'border-slate-200 hover:border-amber-400')}>
                    <div className="relative aspect-video w-full rounded-xl bg-slate-100 overflow-hidden mb-2">
                      {p.image_url ? (
                         
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 text-amber-700 font-black text-sm">{p.name.slice(0, 2).toUpperCase()}</div>
                      )}
                      {out && <span className="absolute top-1 right-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">Out</span>}
                      {low && <span className="absolute top-1 right-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">Low: {stock}</span>}
                    </div>
                    <span className="text-xs font-black text-slate-900 line-clamp-2 leading-tight">{p.name}</span>
                    <span className="mt-1 flex items-baseline justify-between">
                      <span className="text-sm font-black text-slate-950">{zar(p.selling_price_cents)}</span>
                      <span className="text-[10px] text-slate-500 font-bold">/{p.unit}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Basket */}
      <aside className="w-full lg:w-96 flex flex-col lg:h-full bg-white border-l border-slate-200 shrink-0">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><ShoppingBag className="h-5 w-5 text-amber-500" /> Current sale</h2>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-bold text-rose-600 hover:underline">Clear</button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 min-h-[8rem]">
          {cart.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500">Tap products to add them.</p>
          ) : cart.map((l) => (
            <div key={l.key} className="py-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{l.name}</p>
                <p className="text-xs text-slate-500">{zar(l.unitPriceCents)} / {l.unit}{l.discountCents ? <span className="text-emerald-700"> · −{zar(l.discountCents)}</span> : null}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => changeQty(l, -1)} className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center" aria-label={`Fewer ${l.name}`}><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-10 text-center text-xs font-black">{l.quantity}</span>
                <button onClick={() => changeQty(l, 1)} className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center" aria-label={`More ${l.name}`}><Plus className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setDiscountLine(l); setDiscountRand(l.discountCents ? (l.discountCents / 100).toFixed(2) : ''); }} className="h-9 w-9 rounded-lg text-slate-400 hover:text-emerald-700 flex items-center justify-center" aria-label={`Discount ${l.name}`}><Percent className="h-3.5 w-3.5" /></button>
                <button onClick={() => setCart((prev) => prev.filter((x) => x.key !== l.key))} className="h-9 w-9 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center" aria-label={`Remove ${l.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <span className="w-20 text-right text-xs font-black">{zar(lineGross(l) - l.discountCents)}</span>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-slate-800">{zar(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discounts</span><span>−{zar(discount)}</span></div>}
            {vatRegistered && <div className="flex justify-between"><span>Incl. VAT</span><span>{zar(vatEstimate)}</span></div>}
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2"><span>Total</span><span className="text-xl text-amber-700">{zar(total)}</span></div>
          </div>
          <Button size="lg" onClick={openCheckout} disabled={cart.length === 0 || readOnly} className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base">
            <CreditCard className="h-5 w-5 mr-2" /> Charge {zar(total)}
          </Button>
        </div>
      </aside>

      {/* Checkout */}
      <Dialog open={checkoutOpen} onOpenChange={(o) => { if (!processing && !qr) setCheckoutOpen(o); }}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Collect {zar(total)}</DialogTitle>
            <DialogDescription className="text-xs">Prices and fees are confirmed by the server when you complete the sale.</DialogDescription>
          </DialogHeader>

          {qr ? (
            <div className="space-y-3 text-center">
              { }
              <img src={qr.image} alt="Payment QR code" className="mx-auto h-56 w-56" />
              <p className="text-xs text-slate-600">Ask the customer to scan and pay. The sale completes when the payment is confirmed — not before.</p>
              <a href={qr.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700 underline">Open payment page</a>
              <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Waiting for payment on {qr.receiptNumber}…</p>
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => { setQr(null); setCheckoutOpen(false); }}>Stop waiting</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 my-2" role="radiogroup" aria-label="Payment method">
                {enabledMethods.map((m) => {
                  const Icon = m.method === 'cash' ? Banknote : m.method === 'qr_online' ? QrCode : CreditCard;
                  return (
                    <button key={m.method} role="radio" aria-checked={method === m.method} onClick={() => setMethod(m.method)} className={cn('flex flex-col items-center justify-center p-3 rounded-2xl border text-center min-h-[4.5rem]', method === m.method ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 font-black' : 'border-slate-200 text-slate-600')}>
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{m.label}{m.status === 'sandbox' ? ' (test)' : ''}</span>
                    </button>
                  );
                })}
              </div>

              {method === 'cash' && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-xs font-bold text-slate-700" htmlFor="tender">Cash received (R)</label>
                  <Input id="tender" type="number" inputMode="decimal" step="0.10" value={tenderRand} onChange={(e) => setTenderRand(e.target.value)} className="h-12 rounded-xl text-lg font-black bg-white" />
                  <div className="flex gap-2">
                    {[20, 50, 100, 200].map((n) => (
                      <button key={n} onClick={() => setTenderRand(String(n))} className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold">R{n}</button>
                    ))}
                    <button onClick={() => setTenderRand((total / 100).toFixed(2))} className="flex-1 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold">Exact</button>
                  </div>
                  <div className="flex justify-between rounded-xl bg-white p-3 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Change</span>
                    <span className="text-base font-black text-emerald-700">{zar(change)}</span>
                  </div>
                </div>
              )}

              {method === 'card_external' && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
                  <p className="text-slate-700">Charge <b>{zar(total)}</b> on your own card machine first. Only press Complete once the machine shows <b>Approved</b>.</p>
                  <label className="font-bold text-slate-700" htmlFor="ref">Machine reference (optional)</label>
                  <Input id="ref" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="e.g. last digits on the slip" className="rounded-xl bg-white" maxLength={64} />
                </div>
              )}

              {method === 'qr_online' && (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">A QR code will appear for the customer to pay. The sale is only recorded as paid once the payment provider confirms it.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" disabled={processing} onClick={() => setCheckoutOpen(false)} className="rounded-xl text-xs">Cancel</Button>
                <Button onClick={handlePay} disabled={processing} className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-6 h-12">
                  {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Recording…</> : 'Complete sale'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) setReceipt(null); }}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6">
          {receipt && (
            <>
              <DialogHeader className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-2"><CheckCircle2 className="h-8 w-8" /></div>
                <DialogTitle className="text-xl font-black">{receipt.offline ? 'Saved offline' : 'Sale complete'}</DialogTitle>
                <DialogDescription className="text-xs">
                  {receipt.offline ? 'This cash sale is stored on this device and will sync automatically.' : `Receipt ${receipt.receiptNumber}`}
                  {receipt.changeCents ? <span className="block mt-1 text-base font-black text-emerald-700">Give change: {zar(receipt.changeCents)}</span> : null}
                </DialogDescription>
              </DialogHeader>
              <pre className="my-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800">{receiptText(receipt).replace(/\*/g, '')}</pre>
              <div className="flex gap-2">
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Customer WhatsApp no. (optional)" className="rounded-xl text-xs" inputMode="tel" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 font-bold text-xs">
                  <a href={`https://wa.me/${customerPhone.replace(/\D/g, '').replace(/^0/, '27')}?text=${encodeURIComponent(receiptText(receipt))}`} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-4 w-4 mr-1" /> WhatsApp</a>
                </Button>
                <Button asChild variant="outline" className="rounded-xl font-bold text-xs">
                  <a href={`mailto:?subject=${encodeURIComponent(`Receipt ${receipt.receiptNumber}`)}&body=${encodeURIComponent(receiptText(receipt).replace(/\*/g, ''))}`}><Mail className="h-4 w-4 mr-1" /> Email</a>
                </Button>
                <Button variant="outline" onClick={() => printReceipt(receipt)} className="rounded-xl font-bold text-xs"><Printer className="h-4 w-4 mr-1" /> Print / PDF</Button>
              </div>
              <Button onClick={() => { setReceipt(null); setCustomerPhone(''); }} className="w-full mt-2 h-12 rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300">Next sale</Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom item */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Custom item</DialogTitle><DialogDescription className="text-xs">For something not in your product list.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Description" className="rounded-xl" maxLength={120} aria-label="Description" />
            <Input type="number" inputMode="decimal" step="0.50" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="Price (R)" className="rounded-xl" aria-label="Price in rand" />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCustomOpen(false)} className="rounded-xl text-xs">Cancel</Button><Button onClick={addCustom} className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">Add</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Barcode lookup</DialogTitle><DialogDescription className="text-xs">Scan with the camera or a USB/Bluetooth scanner, or type the number.</DialogDescription></DialogHeader>
          {scanOpen && <CameraScanner onCode={(code) => findBarcode(null, code)} />}
          <form onSubmit={findBarcode} className="space-y-3">
            <Input autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="6001001234567" className="rounded-xl font-mono" inputMode="numeric" aria-label="Barcode" />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setScanOpen(false)} className="rounded-xl text-xs">Cancel</Button><Button type="submit" className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">Find & add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN */}
      <Dialog open={pinOpen} onOpenChange={(o) => { setPinOpen(o); setPin(''); }}>
        <DialogContent className="max-w-xs rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Cashier PIN</DialogTitle><DialogDescription className="text-xs">Sales are recorded against whoever signs in here.</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitPin(); }} className="space-y-3">
            <Input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="h-14 rounded-xl text-center text-2xl font-black tracking-[0.5em]" aria-label="PIN" />
            <Button type="submit" disabled={pin.length < 4 || pinBusy} className="w-full h-12 rounded-xl bg-amber-400 text-slate-950 font-black">{pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in to till'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Line discount */}
      <Dialog open={!!discountLine} onOpenChange={(o) => { if (!o) setDiscountLine(null); }}>
        <DialogContent className="max-w-xs rounded-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-lg font-black">Discount</DialogTitle><DialogDescription className="text-xs">{discountLine?.name}. Large discounts may need a manager.</DialogDescription></DialogHeader>
          <Input type="number" inputMode="decimal" step="0.50" value={discountRand} onChange={(e) => setDiscountRand(e.target.value)} placeholder="Amount off (R)" className="rounded-xl" aria-label="Discount in rand" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDiscountLine(null)} className="rounded-xl text-xs">Cancel</Button><Button onClick={applyDiscount} className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs">Apply</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
