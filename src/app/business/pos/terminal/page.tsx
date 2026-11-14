'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  ArrowLeft, Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, CheckCircle2, X,
  Loader2, Barcode, Wifi, WifiOff, UserRound, RefreshCw,
  SmartphoneNfc, PauseCircle, PlayCircle, ShieldAlert, Building2, KeyRound, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { offlineStore, type OfflineQueuedSale } from '@/lib/pos/offline-store';
import { posFetch, newIdempotencyKey, zar, getOperator, setOperator, calcGrossMargin, type TillOperatorSession } from '@/lib/pos/client';
import { loadPosContext, type PosContext } from '@/components/pos/pos-header';
import { CameraScanner } from '@/components/pos/camera-scanner';
import { useBarcodeScanner } from '@/components/pos/barcode-listener';
import { PosThermalReceipt, type ThermalReceiptData } from '@/components/pos/pos-thermal-receipt';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category_id?: string | null;
  cost_price_cents: number | string;
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
  costPriceCents: number;
  taxRatePercent: number;
  quantity: number;
  discountCents: number;
  unit: string;
}

interface ParkedCart {
  id: string;
  refName: string;
  createdAt: string;
  lines: CartLine[];
  customer?: { name: string; phone: string; vatNumber?: string };
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
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Parked Carts / Hold & Recall (F4)
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [parkModalOpen, setParkModalOpen] = useState(false);
  const [parkRefName, setParkRefName] = useState('');

  // Customer & Loyalty / B2B Attachment (F5)
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVatNumber, setCustomerVatNumber] = useState('');
  const [attachedCustomer, setAttachedCustomer] = useState<{ name: string; phone: string; vatNumber?: string; loyaltyPoints?: number } | null>(null);

  // Checkout & Split Tender (F12)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [method, setMethod] = useState<'cash' | 'card_tap' | 'card_external' | 'qr_online' | 'split'>('cash');
  const [tenderRand, setTenderRand] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [isSplitTender, setIsSplitTender] = useState(false);
  const [splitCashRand, setSplitCashRand] = useState('');
  const [splitCardRand, setSplitCardRand] = useState('');
  const [processing, setProcessing] = useState(false);
  const saleKey = useRef<string>('');
  const openCheckoutRef = useRef<() => void>(() => {});
  const showServerReceiptRef = useRef<(data: { sale: Record<string, unknown>; items: Record<string, unknown>[]; payment?: Record<string, unknown> | null }, cashierName?: string) => void>(() => {});
  const [qr, setQr] = useState<{ saleId: string; url: string; image: string; receiptNumber: string } | null>(null);

  // SoftPOS Tap Simulation
  const [tapSimulating, setTapSimulating] = useState(false);
  const [tapSuccess, setTapSuccess] = useState(false);

  // Manager PIN Override for Below-Cost Sales (Margin Guard)
  const [managerPinModalOpen, setManagerPinModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [marginOverridden, setMarginOverridden] = useState(false);

  // Receipt Modal
  const [receipt, setReceipt] = useState<ThermalReceiptData | null>(null);

  // Modals
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [discountLine, setDiscountLine] = useState<CartLine | null>(null);
  const [discountRand, setDiscountRand] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const settings = useMemo(() => ctx?.settings ?? {}, [ctx?.settings]);
  const vatRegistered = Boolean(settings.vat_registered);
  const allowOffline = settings.allow_offline_sales !== false;
  const allowCustom = settings.allow_custom_items !== false;
  const businessId = ctx?.businessId ?? '';

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
      // Load parked carts from storage
      try {
        const storedCarts = localStorage.getItem(`vbl_parked_${c.businessId}`);
        if (storedCarts) setParkedCarts(JSON.parse(storedCarts));
      } catch {}
      setLoading(false);
    }
  }, [refreshQueue]);

  const sync = useCallback(async () => {
    if (!businessId || syncing) return;
    setSyncing(true);
    const r = await offlineStore.syncPendingSales(businessId);
    refreshQueue(businessId);
    setSyncing(false);
    if (r.synced) toast({ title: `Synced ${r.synced} offline sale${r.synced === 1 ? '' : 's'}` });
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

  // Sync whenever connection comes back
  useEffect(() => {
    if (isOnline && businessId && offlineStore.getQueuedSales(businessId).length > 0) sync();
  }, [isOnline, businessId, sync]);

  // Show Server Receipt helper
  const showServerReceipt = (data: { sale: Record<string, unknown>; items: Record<string, unknown>[]; payment?: Record<string, unknown> | null }, cashierName?: string) => {
    const s = data.sale;
    setReceipt({
      receiptNumber: String(s.receipt_number),
      date: new Date(String(s.completed_at ?? s.created_at)).toLocaleString('en-ZA'),
      businessName: ctx?.businessName || 'VerifiedBizLink Retail',
      businessPhone: String(settings.phone || ''),
      businessEmail: String(settings.email || ''),
      businessAddress: String(settings.address || ''),
      vatNumber: String(settings.vat_number || ''),
      vatRegistered: Boolean(settings.vat_registered),
      customerName: attachedCustomer?.name || (s.customer_name as string) || undefined,
      customerVatNumber: attachedCustomer?.vatNumber || undefined,
      customerPhone: attachedCustomer?.phone || (s.customer_phone as string) || undefined,
      cashierName: cashierName || operator?.displayName || 'Cashier',
      lines: data.items.map((i) => ({
        name: String(i.product_name),
        quantity: Number(i.quantity),
        unitPriceCents: Number(i.unit_price_cents),
        discountCents: Number(i.discount_cents),
        totalCents: Number(i.total_cents),
      })),
      subtotalCents: Number(s.subtotal_cents),
      discountCents: Number(s.discount_cents),
      totalCents: Number(s.total_cents),
      vatCents: Number(s.tax_cents),
      paymentMethod: String(s.payment_method),
      tenderCents: data.payment?.tender_amount_cents ? Number(data.payment.tender_amount_cents) : undefined,
      changeCents: data.payment?.change_amount_cents ? Number(data.payment.change_amount_cents) : undefined,
      offline: false,
    });
  };

  // QR Payment Polling
  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => {
      const r = await posFetch(`/api/pos/sales?id=${qr.saleId}`);
      const sale = r.data.sale as Record<string, unknown> | undefined;
      if (sale?.payment_status === 'completed') {
        clearInterval(t);
        showServerReceiptRef.current(r.data as never, operator?.displayName);
        setQr(null);
        setCart([]);
        setCheckoutOpen(false);
      } else if (sale && ['failed', 'cancelled'].includes(String(sale.payment_status))) {
        clearInterval(t);
        setQr(null);
        toast({ title: 'The PayShap/QR payment failed or expired', variant: 'destructive' });
      }
    }, 3000);
    return () => clearInterval(t);
  }, [qr, operator, toast]);

  // Global Barcode Scanner Listener (<30ms between keystrokes + Enter)
  useBarcodeScanner({
    onScan: (scannedCode) => {
      const match = products.find(
        (p) => p.barcode === scannedCode || p.sku === scannedCode
      );
      if (match) {
        addProduct(match);
        toast({ title: `Scanned: ${match.name}`, description: zar(Number(match.selling_price_cents)) });
      } else {
        toast({
          title: `Barcode not found: ${scannedCode}`,
          description: 'Product is not in the active catalog.',
          variant: 'destructive',
        });
      }
    },
    enabled: !checkoutOpen && !pinOpen && !customOpen,
  });

  // Global Keyboard Shortcuts (F1-F12)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // F4: Park / Hold Carts
      if (e.key === 'F4') {
        e.preventDefault();
        setParkModalOpen((v) => !v);
        return;
      }
      // F5: Customer Attachment
      if (e.key === 'F5') {
        e.preventDefault();
        setCustomerModalOpen((v) => !v);
        return;
      }
      // F9: Quick Cash Tender
      if (e.key === 'F9' && cart.length > 0 && !checkoutOpen) {
        e.preventDefault();
        setMethod('cash');
        openCheckoutRef.current();
        return;
      }
      // F12: Open Checkout Modal
      if (e.key === 'F12' && cart.length > 0 && !checkoutOpen) {
        e.preventDefault();
        openCheckoutRef.current();
        return;
      }
      // Escape: Close open modals
      if (e.key === 'Escape') {
        if (checkoutOpen) setCheckoutOpen(false);
        if (parkModalOpen) setParkModalOpen(false);
        if (customerModalOpen) setCustomerModalOpen(false);
        if (customOpen) setCustomOpen(false);
        if (pinOpen) setPinOpen(false);
        if (receipt) setReceipt(null);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, checkoutOpen, parkModalOpen, customerModalOpen, customOpen, pinOpen, receipt]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      );
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
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: Math.round((l.quantity + step) * 100) / 100 } : l
        );
      }
      return [
        ...prev,
        {
          key: `${p.id}_${Date.now()}`,
          productId: p.id,
          name: p.name,
          unitPriceCents: Number(p.selling_price_cents),
          costPriceCents: Number(p.cost_price_cents || 0),
          taxRatePercent: Number(p.tax_rate_percent ?? 15),
          quantity: step,
          discountCents: 0,
          unit: p.unit,
        },
      ];
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
    setCart((prev) =>
      next <= 0
        ? prev.filter((l) => l.key !== line.key)
        : prev.map((l) =>
            l.key === line.key
              ? {
                  ...l,
                  quantity: next,
                  discountCents: Math.min(l.discountCents, Math.round(l.unitPriceCents * next)),
                }
              : l
          )
    );
  };

  const lineGross = (l: CartLine) => Math.floor((l.unitPriceCents * Math.round(l.quantity * 100) + 50) / 100);
  const subtotal = cart.reduce((a, l) => a + lineGross(l), 0);
  const discount = cart.reduce((a, l) => a + l.discountCents, 0);
  const total = Math.max(0, subtotal - discount);
  const vatEstimate = vatRegistered
    ? Math.round(total - total / 1.15)
    : 0;

  // Margin Guard check: does any cart item sell below its cost price?
  const hasBelowCostItem = useMemo(() => {
    return cart.some((l) => {
      const effectiveUnitPrice = l.unitPriceCents - Math.round(l.discountCents / l.quantity);
      return l.costPriceCents > 0 && effectiveUnitPrice < l.costPriceCents;
    });
  }, [cart]);

  const tenderCents = tenderRand ? Math.round(parseFloat(tenderRand) * 100) : total;
  const change = Math.max(0, tenderCents - total);

  // Parked Carts Logic
  const handleParkCart = () => {
    if (cart.length === 0) return;
    const newPark: ParkedCart = {
      id: `park_${Date.now()}`,
      refName: parkRefName.trim() || `Order #${parkedCarts.length + 1} (${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })})`,
      createdAt: new Date().toLocaleTimeString('en-ZA'),
      lines: cart,
      customer: attachedCustomer || undefined,
    };
    const updated = [newPark, ...parkedCarts];
    setParkedCarts(updated);
    try {
      localStorage.setItem(`vbl_parked_${businessId}`, JSON.stringify(updated));
    } catch {}
    setCart([]);
    setAttachedCustomer(null);
    setParkRefName('');
    setParkModalOpen(false);
    toast({ title: 'Bill Parked on Hold', description: `Saved as "${newPark.refName}"` });
  };

  const handleRecallCart = (parked: ParkedCart) => {
    if (cart.length > 0) {
      toast({ title: 'Current cart is not empty', description: 'Park or clear current cart first.', variant: 'destructive' });
      return;
    }
    setCart(parked.lines);
    if (parked.customer) setAttachedCustomer(parked.customer);
    const updated = parkedCarts.filter((p) => p.id !== parked.id);
    setParkedCarts(updated);
    try {
      localStorage.setItem(`vbl_parked_${businessId}`, JSON.stringify(updated));
    } catch {}
    setParkModalOpen(false);
    toast({ title: `Recalled: ${parked.refName}` });
  };

  const openCheckout = () => {
    if (hasBelowCostItem && !marginOverridden && operator?.role !== 'manager' && operator?.role !== 'owner') {
      setManagerPinModalOpen(true);
      return;
    }
    saleKey.current = newIdempotencyKey('sale');
    setTenderRand((total / 100).toFixed(2));
    setSplitCashRand('');
    setSplitCardRand('');
    setIsSplitTender(false);
    setExternalRef('');
    setTapSimulating(false);
    setTapSuccess(false);
    setCheckoutOpen(true);
  };

  useEffect(() => {
    openCheckoutRef.current = openCheckout;
    showServerReceiptRef.current = showServerReceipt;
  });

  const queueOffline = () => {
    const sale: OfflineQueuedSale = {
      idempotencyKey: saleKey.current,
      businessId,
      items: cart.map((l) => ({
        productId: l.productId,
        custom: l.custom,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        discountCents: l.discountCents || undefined,
      })),
      tenderAmountCents: tenderCents,
      totalCents: total,
      offlineCreatedAt: new Date().toISOString(),
      operatorToken: operator?.token,
    };
    offlineStore.queueSale(sale);
    setReceipt({
      receiptNumber: `VBL-OFF-${saleKey.current.slice(-6).toUpperCase()}`,
      date: new Date().toLocaleString('en-ZA'),
      businessName: ctx?.businessName || 'VerifiedBizLink Retail',
      lines: cart.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        discountCents: l.discountCents,
        totalCents: lineGross(l) - l.discountCents,
      })),
      subtotalCents: subtotal,
      discountCents: discount,
      totalCents: total,
      vatCents: vatEstimate,
      paymentMethod: 'cash (Offline)',
      tenderCents,
      changeCents: change,
      offline: true,
      cashierName: operator?.displayName || 'Cashier',
    });
    refreshQueue(businessId);
    setCart([]);
    setAttachedCustomer(null);
    setCheckoutOpen(false);
    toast({ title: 'Saved Offline', description: 'This cash sale will sync automatically when online.' });
  };

  const handlePay = async () => {
    if (cart.length === 0 || processing) return;

    if (method === 'cash' && tenderCents < total) {
      toast({ title: 'Cash tendered is less than the total due', variant: 'destructive' });
      return;
    }

    if (!navigator.onLine) {
      if (method === 'cash' && allowOffline) return queueOffline();
      toast({ title: 'No connection', description: 'Only cash sales can be taken offline.', variant: 'destructive' });
      return;
    }

    // SoftPOS Tap Animation Simulation
    if (method === 'card_tap' && !tapSuccess) {
      setTapSimulating(true);
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setTapSimulating(false);
      setTapSuccess(true);
    }

    setProcessing(true);
    try {
      const checkoutNotes = [
        attachedCustomer?.vatNumber ? `Customer VAT: ${attachedCustomer.vatNumber}` : '',
        isSplitTender ? `Split: Cash R${splitCashRand} + Card R${splitCardRand}` : '',
      ].filter(Boolean).join(' | ');

      const r = await posFetch('/api/pos/checkout', {
        method: 'POST',
        json: {
          items: cart.map((l) =>
            l.custom
              ? { custom: l.custom, quantity: l.quantity, discountCents: l.discountCents || undefined }
              : { productId: l.productId, quantity: l.quantity, discountCents: l.discountCents || undefined }
          ),
          paymentMethod: isSplitTender ? 'card_tap' : method,
          tenderAmountCents: method === 'cash' ? tenderCents : undefined,
          externalReference: method === 'card_external' ? externalRef : undefined,
          idempotencyKey: saleKey.current,
          customerName: attachedCustomer?.name || undefined,
          customerPhone: attachedCustomer?.phone || customerPhone || undefined,
          notes: checkoutNotes || undefined,
        },
      });

      if (!r.ok) {
        const code = r.data.code;
        if (code === 'OPERATOR_EXPIRED') setOperatorState(null);
        toast({ title: 'Sale not completed', description: String(r.data.error || 'Please try again.'), variant: 'destructive' });
        return;
      }

      const sale = r.data.sale as Record<string, unknown>;
      const payResp = r.data.paymentResponse as Record<string, unknown> | undefined;

      // PayShap / Dynamic QR Flow
      if (sale.payment_status === 'pending' && payResp?.paymentActionUrl) {
        const url = String(payResp.paymentActionUrl);
        setQr({
          saleId: String(sale.id),
          url,
          image: await QRCode.toDataURL(url, { margin: 1, width: 260 }),
          receiptNumber: String(sale.receipt_number),
        });
        return;
      }

      showServerReceipt(r.data as never, operator?.displayName);
      setCart([]);
      setAttachedCustomer(null);
      setMarginOverridden(false);
      setCheckoutOpen(false);
      loadData();
    } catch {
      if (method === 'cash' && allowOffline) queueOffline();
      else toast({ title: 'Connection interrupted', description: 'Please check terminal connection.', variant: 'destructive' });
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
    toast({ title: `${staff.displayName} is now on till duty` });
  };

  const handleManagerPinOverride = async () => {
    setPinBusy(true);
    const r = await posFetch('/api/pos/staff', { method: 'POST', json: { action: 'verify_pin', pin: managerPin } });
    setPinBusy(false);
    setManagerPin('');
    if (!r.ok || (r.data.staff as { role?: string } | undefined)?.role === 'cashier') {
      toast({ title: 'Manager authorization required', description: 'Only a manager or owner PIN can authorize below-cost discounts.', variant: 'destructive' });
      return;
    }
    setMarginOverridden(true);
    setManagerPinModalOpen(false);
    toast({ title: 'Margin Guard Overridden by Manager' });
    openCheckout();
  };

  const addCustom = () => {
    const cents = Math.round(parseFloat(customPrice) * 100);
    if (!customName.trim() || !Number.isFinite(cents) || cents <= 0) {
      toast({ title: 'Enter valid custom name and price', variant: 'destructive' });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        key: `custom_${Date.now()}`,
        custom: { name: customName.trim(), unitPriceCents: cents },
        name: customName.trim(),
        unitPriceCents: cents,
        costPriceCents: 0,
        taxRatePercent: Number(settings.tax_rate_percent ?? 15),
        quantity: 1,
        discountCents: 0,
        unit: 'item',
      },
    ]);
    setCustomName('');
    setCustomPrice('');
    setCustomOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-mono">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mr-2" />
        <span>Loading Digital Till Terminal...</span>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans", isFullScreen && "fixed inset-0 z-50 overflow-hidden")}>
      {/* Top High-Density Terminal Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
            <Link href="/business/pos" aria-label="Exit to Command Hub">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-white tracking-wider uppercase font-mono">
              {ctx?.businessName || 'Till Terminal'}
            </span>
            <Badge variant="outline" className="hidden sm:inline-flex bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono">
              Till #1
            </Badge>
          </div>
        </div>

        {/* Center: Operator Status & Quick-Switch */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPinOpen(true)}
            className="h-8 bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs text-white rounded-xl flex items-center gap-1.5"
          >
            <UserRound className="h-3.5 w-3.5 text-amber-400" />
            <span className="truncate max-w-[110px] font-bold">{operator?.displayName || 'Tap to Log In'}</span>
            <kbd className="hidden md:inline bg-slate-900 px-1 py-0.2 rounded text-[9px] font-mono text-slate-400">PIN</kbd>
          </Button>

          {/* Parked Carts Counter (F4) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setParkModalOpen(true)}
            className={cn(
              "h-8 border-slate-700 text-xs rounded-xl flex items-center gap-1.5 font-bold transition-colors",
              parkedCarts.length > 0 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-300"
            )}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            <span>Hold ({parkedCarts.length})</span>
            <kbd className="hidden lg:inline bg-slate-900 px-1 rounded text-[9px] font-mono text-slate-400">F4</kbd>
          </Button>

          {/* Customer / B2B Loyalty (F5) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCustomerModalOpen(true)}
            className={cn(
              "h-8 border-slate-700 text-xs rounded-xl flex items-center gap-1.5 font-bold",
              attachedCustomer ? "bg-indigo-950/60 text-indigo-300 border-indigo-700" : "bg-slate-800 text-slate-300"
            )}
          >
            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            <span className="truncate max-w-[100px]">{attachedCustomer?.name || 'Customer'}</span>
            <kbd className="hidden lg:inline bg-slate-900 px-1 rounded text-[9px] font-mono text-slate-400">F5</kbd>
          </Button>
        </div>

        {/* Right: Network & Full-Screen Toggle */}
        <div className="flex items-center gap-2">
          {(pending > 0 || rejected.length > 0) && (
            <button
              onClick={sync}
              disabled={!isOnline || syncing}
              title={lastSync ? `Last synced: ${new Date(lastSync).toLocaleTimeString()}` : 'Sync queued offline sales'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-500/30"
            >
              <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
              {pending > 0 && <span>{pending} queued</span>}
              {rejected.length > 0 && <span className="text-rose-400">({rejected.length} failed)</span>}
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1"><Wifi className="h-3 w-3" /> Online</span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1"><WifiOff className="h-3 w-3" /> Offline (Cash Only)</span>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="h-8 w-8 text-slate-400 hover:text-white"
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Terminal Grid Split: 65% Catalog / 35% Active Cart */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ================= LEFT PANEL: CATALOG & BARCODE ENGINE (7 or 8 COLS) ================= */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
          {/* Catalog Top Search & Category Filter Strip */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search item, SKU, or scan barcode directly (F1)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-mono font-medium"
                />
              </div>

              {allowCustom && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomOpen(true)}
                  className="h-9 text-xs font-bold shrink-0 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 text-amber-500" /> Custom Item
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setScanOpen(true)}
                className="h-9 text-xs font-bold shrink-0 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              >
                <Barcode className="h-3.5 w-3.5 mr-1 text-blue-500" /> Camera
              </Button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors",
                  selectedCategory === 'all'
                    ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                )}
              >
                All Items ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors font-sans",
                    selectedCategory === c.id
                      ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Tiles Grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
                <ShoppingBag className="h-10 w-10 mb-2 stroke-1" />
                <p className="text-sm font-bold">No products match your search</p>
                <p className="text-xs">Try searching by barcode digits or add a Custom Item.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filtered.map((p) => {
                  const stock = Number(p.stock_quantity);
                  const minThresh = Number(p.min_stock_threshold || 5);
                  const isOut = stock <= 0;
                  const isLow = stock > 0 && stock <= minThresh;
                  const sell = Number(p.selling_price_cents);
                  const cost = Number(p.cost_price_cents || 0);
                  const marginPct = calcGrossMargin(sell, cost);

                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={isOut}
                      className={cn(
                        "p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 select-none",
                        "bg-white dark:bg-slate-900 hover:border-amber-400 hover:shadow-sm active:scale-[0.98]",
                        isOut
                          ? "opacity-50 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                          : "border-slate-200/90 dark:border-slate-800"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className={cn(
                            "text-[9px] font-mono px-1 rounded font-bold uppercase",
                            isOut
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : isLow
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {isOut ? 'Out of Stock' : `${stock} ${p.unit}`}
                          </span>
                          {marginPct > 0 && (
                            <span className="text-[9px] font-mono text-slate-400">
                              {marginPct.toFixed(0)}% mg
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          {p.sku || p.barcode || '—'}
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between">
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          {zar(sell)}
                        </span>
                        {inCart(p.id) > 0 && (
                          <Badge className="bg-amber-500 text-slate-950 font-black font-mono text-[10px] px-1.5 py-0">
                            {inCart(p.id)} in cart
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL: ACTIVE CART & MULTI-TENDER CHECKOUT (4 or 5 COLS) ================= */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-white dark:bg-slate-900 h-full overflow-hidden">
          {/* Cart Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Order</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              {cart.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleParkCart}
                    className="h-7 px-2 text-[11px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                  >
                    <PauseCircle className="h-3 w-3 mr-1" /> Hold (F4)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCart([])}
                    className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Attached Customer Banner */}
          {attachedCustomer && (
            <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300 font-bold truncate">
                <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{attachedCustomer.name}</span>
                {attachedCustomer.vatNumber && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">VAT: {attachedCustomer.vatNumber}</span>
                )}
              </div>
              <button onClick={() => setAttachedCustomer(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
                <ShoppingBag className="h-10 w-10 mb-2 stroke-1 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold">Cart is empty</p>
                <p className="text-[11px]">Tap items or scan barcode to add to bill.</p>
              </div>
            ) : (
              cart.map((line) => {
                const totalLineGross = lineGross(line) - line.discountCents;
                const effectiveUnitPrice = line.unitPriceCents - Math.round(line.discountCents / line.quantity);
                const isBelowCost = line.costPriceCents > 0 && effectiveUnitPrice < line.costPriceCents;

                return (
                  <div key={line.key} className="py-2 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {line.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {zar(line.unitPriceCents)} each
                          {line.discountCents > 0 && (
                            <span className="text-amber-600 font-bold ml-1.5">
                              (Discount: -{zar(line.discountCents)})
                            </span>
                          )}
                        </p>
                        {isBelowCost && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1 rounded">
                            <ShieldAlert className="h-2.5 w-2.5" /> Below Cost ({zar(line.costPriceCents)})
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {zar(totalLineGross)}
                        </p>
                      </div>
                    </div>

                    {/* Steppers & Line Discount Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          onClick={() => changeQty(line, -1)}
                          className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => changeQty(line, 1)}
                          className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setDiscountLine(line);
                            setDiscountRand((line.discountCents / 100).toFixed(2));
                          }}
                          className="text-[10px] font-mono text-slate-500 hover:text-amber-600 underline"
                        >
                          Line Disc
                        </button>
                        <button
                          onClick={() => setCart((prev) => prev.filter((l) => l.key !== line.key))}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Financial Summary & Checkout Button */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-2">
            <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal (Excl. VAT):</span>
                <span>{zar(subtotal - vatEstimate)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Discounts Applied:</span>
                  <span>-{zar(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>15% SARS VAT Component:</span>
                <span>{zar(vatEstimate)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-950 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <span>GRAND TOTAL:</span>
                <span className="text-xl text-amber-600 dark:text-amber-400">{zar(total)}</span>
              </div>
            </div>

            {/* Primary Charge CTA (F12) */}
            <Button
              disabled={cart.length === 0}
              onClick={openCheckout}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-xl shadow-md flex items-center justify-between px-5 transition-all hover:scale-[1.01]"
            >
              <span>CHARGE (F12)</span>
              <span className="font-mono font-black">{zar(total)}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ================= MULTI-TENDER & SPLIT PAYMENT MODAL (F12) ================= */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span>Checkout &amp; Tender Settlement</span>
              <span className="font-mono text-xl text-amber-500">{zar(total)}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select payment method or split tender across Cash and SoftPOS Card Tap.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tender Method Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('cash');
                  setIsSplitTender(false);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all",
                  method === 'cash' && !isSplitTender
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <Banknote className="h-5 w-5 text-emerald-600" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('card_tap');
                  setIsSplitTender(false);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all",
                  method === 'card_tap' && !isSplitTender
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <SmartphoneNfc className="h-5 w-5 text-indigo-600" />
                <span>Tap to Pay</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('qr_online');
                  setIsSplitTender(false);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all",
                  method === 'qr_online' && !isSplitTender
                    ? "bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950 dark:text-amber-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <QrCode className="h-5 w-5 text-amber-600" />
                <span>PayShap / QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSplitTender(true);
                  setSplitCashRand((total / 200).toFixed(2));
                  setSplitCardRand((total / 200).toFixed(2));
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all",
                  isSplitTender
                    ? "bg-purple-50 border-purple-500 text-purple-950 dark:bg-purple-950 dark:text-purple-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                )}
              >
                <CreditCard className="h-5 w-5 text-purple-600" />
                <span>Split Tender</span>
              </button>
            </div>

            {/* Split Tender Form */}
            {isSplitTender ? (
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                <p className="text-xs font-bold text-purple-950 dark:text-purple-300">
                  Split Payment Breakdown
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Cash Portion (ZAR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={splitCashRand}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value || '0');
                        setSplitCashRand(e.target.value);
                        setSplitCardRand(Math.max(0, (total / 100) - val).toFixed(2));
                      }}
                      className="font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Card / Tap Portion (ZAR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={splitCardRand}
                      onChange={(e) => setSplitCardRand(e.target.value)}
                      className="font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            ) : method === 'cash' ? (
              /* Cash Calculator */
              <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cash Tendered by Customer (ZAR)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tenderRand}
                    onChange={(e) => setTenderRand(e.target.value)}
                    className="font-mono text-lg font-bold"
                    autoFocus
                  />
                </div>

                {/* Quick Rand Tender Buttons */}
                <div className="flex gap-1.5 font-mono text-xs">
                  {[50, 100, 200, 500].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTenderRand(r.toString())}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold"
                    >
                      R{r}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTenderRand((total / 100).toFixed(2))}
                    className="px-2.5 py-1 rounded bg-amber-200 dark:bg-amber-900/60 font-bold text-amber-900 dark:text-amber-200"
                  >
                    Exact
                  </button>
                </div>

                {/* Change Due Box */}
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 flex items-center justify-between font-mono">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">Change to Disburse:</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{zar(change)}</span>
                </div>
              </div>
            ) : method === 'card_tap' ? (
              /* SoftPOS Tap Simulation View */
              <div className="p-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 text-center space-y-3">
                <SmartphoneNfc className="h-10 w-10 text-indigo-600 mx-auto animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Ask customer to tap card or phone</p>
                  <p className="text-xs text-slate-500">Supports Mastercard, Visa Contactless, Apple Pay, Google Wallet</p>
                </div>
                {tapSimulating && (
                  <p className="text-xs font-mono font-bold text-indigo-600 animate-bounce">
                    Processing EMV Contactless NFC Token...
                  </p>
                )}
                {tapSuccess && (
                  <p className="text-xs font-mono font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Card Approved (Auth: 839201)
                  </p>
                )}
              </div>
            ) : (
              /* PayShap / SnapScan QR Preview */
              <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/30 text-center space-y-2">
                <QrCode className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Dynamic PayShap / SnapScan QR
                </p>
                <p className="text-[11px] text-slate-500">
                  Clicking Complete will generate an instantaneous customer payment QR for immediate banking app scan.
                </p>
              </div>
            )}

            {/* QR Polling Overlay if active */}
            {qr && (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-amber-400 text-center space-y-2">
                <p className="text-xs font-black text-slate-900 dark:text-white">Scan with Capitec, FNB, Nedbank, Standard Bank or SnapScan</p>
                <img src={qr.image} alt="Payment QR" className="mx-auto h-48 w-48 rounded-lg shadow-sm" />
                <p className="text-[11px] text-slate-500 font-mono">Awaiting instant payment confirmation...</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setCheckoutOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={processing || tapSimulating}
                onClick={handlePay}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6"
              >
                {processing ? 'Processing...' : `Complete Sale (${zar(total)})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= POST-CHECKOUT RECEIPT MODAL ================= */}
      {receipt && (
        <Dialog open={Boolean(receipt)} onOpenChange={() => setReceipt(null)}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <PosThermalReceipt
              receipt={receipt}
              onClose={() => setReceipt(null)}
              onNewSale={() => {
                setReceipt(null);
                searchInputRef.current?.focus();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ================= PARKED CARTS / HOLD & RECALL MODAL (F4) ================= */}
      <Dialog open={parkModalOpen} onOpenChange={setParkModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PauseCircle className="h-4 w-4 text-amber-500" />
              Parked Carts &amp; Hold Queue (F4)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Hold the current transaction to serve the next customer, or recall a previously parked order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {cart.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 space-y-2">
                <Label className="text-xs font-bold text-amber-950 dark:text-amber-300">Park Current Cart ({cart.length} items)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reference note (e.g. Table 4 / Sipho)"
                    value={parkRefName}
                    onChange={(e) => setParkRefName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    onClick={handleParkCart}
                    className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0"
                  >
                    Park Bill
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Currently Parked Bills ({parkedCarts.length})
              </p>

              {parkedCarts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No bills on hold.</p>
              ) : (
                parkedCarts.map((p) => {
                  const pTotal = p.lines.reduce((a, b) => a + (b.unitPriceCents * b.quantity - b.discountCents), 0);
                  return (
                    <div key={p.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.refName}</p>
                        <p className="text-[10px] font-mono text-slate-500">{p.lines.length} items • {zar(pTotal)}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRecallCart(p)}
                        className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                      >
                        <PlayCircle className="h-3 w-3 mr-1" /> Recall
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= CUSTOMER & B2B ATTACHMENT MODAL (F5) ================= */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Customer &amp; B2B Attachment (F5)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Attach a customer to this transaction for SARS Tax Invoices (with company VAT number) or loyalty tracking.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customerName.trim()) return;
              setAttachedCustomer({
                name: customerName.trim(),
                phone: customerPhone.trim(),
                vatNumber: customerVatNumber.trim() || undefined,
              });
              setCustomerModalOpen(false);
              toast({ title: `Attached: ${customerName.trim()}` });
            }}
            className="space-y-3 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs font-bold">Customer / Company Name</Label>
              <Input
                placeholder="e.g. Apex Engineering Pty Ltd"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Contact Phone Number</Label>
              <Input
                placeholder="e.g. 0821234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">SARS VAT Number (Optional for Tax Invoice)</Label>
              <Input
                placeholder="10-digit number e.g. 4123456789"
                value={customerVatNumber}
                onChange={(e) => setCustomerVatNumber(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setCustomerModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                Attach to Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MARGIN GUARD MANAGER PIN OVERRIDE MODAL ================= */}
      <Dialog open={managerPinModalOpen} onOpenChange={setManagerPinModalOpen}>
        <DialogContent className="sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Margin Guard: Manager Approval
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              One or more cart items are discounted below cost price. Enter a Manager or Owner 4-digit PIN to authorize this sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-xl tracking-[0.5em] font-bold h-11"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setManagerPinModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleManagerPinOverride}
                disabled={pinBusy || managerPin.length !== 4}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Authorize Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= CASHIER QUICK-SWITCH PIN MODAL ================= */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Switch Cashier on Duty
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter your 4-digit cashier PIN to take over this till.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-xl tracking-[0.5em] font-bold h-11"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPinOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitPin}
                disabled={pinBusy || pin.length !== 4}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Log In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= LINE DISCOUNT MODAL ================= */}
      {discountLine && (
        <Dialog open={Boolean(discountLine)} onOpenChange={() => setDiscountLine(null)}>
          <DialogContent className="sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Discount: {discountLine.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">R</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountRand}
                  onChange={(e) => setDiscountRand(e.target.value)}
                  className="pl-8 font-mono text-sm font-bold"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDiscountLine(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const c = Math.round(parseFloat(discountRand || '0') * 100);
                    setCart((prev) =>
                      prev.map((l) => (l.key === discountLine.key ? { ...l, discountCents: c } : l))
                    );
                    setDiscountLine(null);
                  }}
                  className="bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ================= CUSTOM ITEM MODAL ================= */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Add Custom / Ad-Hoc Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              placeholder="Item description (e.g. Gift Wrap)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="text-xs"
              autoFocus
            />
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">R</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="pl-8 font-mono text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCustomOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={addCustom} className="bg-amber-500 text-slate-950 font-bold text-xs">
                Add to Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= CAMERA SCANNER MODAL ================= */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Camera Barcode Scanner</DialogTitle>
          </DialogHeader>
          <CameraScanner
            onCode={(code) => {
              setScanOpen(false);
              const match = products.find((p) => p.barcode === code || p.sku === code);
              if (match) {
                addProduct(match);
                toast({ title: `Scanned: ${match.name}` });
              } else {
                toast({ title: `Barcode ${code} not in catalog`, variant: 'destructive' });
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
