'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, ShoppingBag, Plus, Minus, Trash2, CreditCard,
  Banknote, QrCode, CheckCircle2, X, Printer,
  MessageSquare, Loader2, Barcode, Wifi, WifiOff,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { offlineStore } from '@/lib/pos/offline-store';
import { cn } from '@/lib/utils';

interface PosProductItem {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  selling_price_cents: number;
  cost_price_cents: number;
  stock_quantity: number;
  barcode?: string;
  sku?: string;
  image_url?: string;
  unit: string;
}

interface CartItem {
  productId?: string;
  name: string;
  unitPriceCents: number;
  costPriceCents: number;
  quantity: number;
  discountCents?: number;
}

export default function PosTerminalPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Custom Item Modal
  const [customItemModal, setCustomItemModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPriceRand, setCustomPriceRand] = useState('');

  // Payment Modal
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_tap' | 'qr_online'>('card_tap');
  const [tenderRand, setTenderRand] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tapStep, setTapStep] = useState<'prompt' | 'reading' | 'authorized' | 'declined'>('prompt');

  // Receipt Modal
  const [receiptModal, setReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    receiptNumber: string;
    totalCents: number;
    paymentMethod: string;
    changeCents?: number;
    items: CartItem[];
    authCode?: string;
    date: string;
  } | null>(null);

  // Barcode Scanner Modal (manual or camera)
  const [scannerModal, setScannerModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/pos/products').catch(() => null),
        fetch('/api/pos/categories').catch(() => null),
      ]);

      if (prodRes?.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
        offlineStore.cacheProducts(prodData.products || []);
      } else {
        const cached = offlineStore.getCachedProducts();
        if (cached.length > 0) setProducts(cached as PosProductItem[]);
      }

      if (catRes?.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch {
      const cached = offlineStore.getCachedProducts();
      if (cached.length > 0) setProducts(cached as PosProductItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadData]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        return matchName || matchBarcode || matchSku;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Operations
  const addToCart = (product: PosProductItem) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPriceCents: product.selling_price_cents,
          costPriceCents: product.cost_price_cents,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((it, i) => (i === index ? { ...it, quantity: newQty } : it));
    });
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => setCart([]);

  const addCustomItem = () => {
    const priceRand = parseFloat(customPriceRand);
    if (!customName.trim() || isNaN(priceRand) || priceRand <= 0) {
      toast({ title: 'Please provide a valid item name and price.', variant: 'destructive' });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        name: customName.trim(),
        unitPriceCents: Math.round(priceRand * 100),
        costPriceCents: 0,
        quantity: 1,
      },
    ]);
    setCustomName('');
    setCustomPriceRand('');
    setCustomItemModal(false);
  };

  // Barcode Lookup
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = products.find((p) => p.barcode === barcodeInput.trim());
    if (match) {
      addToCart(match);
      toast({ title: `Added "${match.name}" to basket` });
      setBarcodeInput('');
      setScannerModal(false);
    } else {
      toast({ title: 'Barcode not found', description: 'No product matches this barcode.', variant: 'destructive' });
    }
  };

  // Totals
  const subtotalCents = useMemo(
    () => cart.reduce((acc, it) => acc + it.quantity * it.unitPriceCents, 0),
    [cart]
  );
  const taxCents = Math.round(subtotalCents - subtotalCents / 1.15);
  const totalCents = subtotalCents;

  const totalRand = (totalCents / 100).toFixed(2);
  const tenderCents = tenderRand ? Math.round(parseFloat(tenderRand) * 100) : totalCents;
  const changeCents = Math.max(0, tenderCents - totalCents);

  // Handle Checkout Execution
  const handleProcessPayment = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'cash' && tenderCents < totalCents) {
      toast({ title: 'Tendered cash is less than total due', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    if (paymentMethod === 'card_tap') {
      setTapStep('reading');
      // Simulated/Native SoftPOS contactless card read animation
      await new Promise((r) => setTimeout(r, 1600));
    }

    try {
      const idempotencyKey = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!isOnline) {
        // Safe offline cash queuing
        if (paymentMethod !== 'cash') {
          throw new Error('Only cash transactions can be safely completed while offline.');
        }

        offlineStore.queueSale({
          items: cart,
          paymentMethod: 'cash',
          tenderAmountCents: tenderCents,
          totalCents,
        });

        const offlineReceipt = `VBL-OFF-${Date.now().toString().slice(-6)}`;
        setCompletedSale({
          receiptNumber: offlineReceipt,
          totalCents,
          paymentMethod: 'cash (Offline)',
          changeCents,
          items: [...cart],
          date: new Date().toLocaleString('en-ZA'),
        });

        toast({
          title: 'Offline sale recorded',
          description: 'Saved locally. Will sync automatically when connection restores.',
        });

        clearCart();
        setCheckoutModal(false);
        setReceiptModal(true);
        return;
      }

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          paymentMethod,
          tenderAmountCents: tenderCents,
          idempotencyKey,
          useSandbox: true, // Seamless developer and testing sandbox
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setTapStep('authorized');

      setCompletedSale({
        receiptNumber: data.sale.receipt_number,
        totalCents: data.sale.total_cents,
        paymentMethod,
        changeCents: data.payment.change_amount_cents || changeCents,
        items: [...cart],
        authCode: data.payment.auth_code,
        date: new Date(data.sale.created_at).toLocaleString('en-ZA'),
      });

      clearCart();
      setCheckoutModal(false);
      setReceiptModal(true);
    } catch (err) {
      setTapStep('declined');
      toast({
        title: 'Transaction Declined',
        description: err instanceof Error ? err.message : 'Could not complete sale.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getWhatsAppReceiptUrl = () => {
    if (!completedSale) return '#';
    const itemsText = completedSale.items
      .map((it) => `• ${it.quantity}x ${it.name} - R${((it.quantity * it.unitPriceCents) / 100).toFixed(2)}`)
      .join('%0A');
    const msg = `*VerifiedBizLink Digital Receipt*%0AReceipt: ${completedSale.receiptNumber}%0ADate: ${completedSale.date}%0A%0A*Items:*%0A${itemsText}%0A%0A*Total:* R${(completedSale.totalCents / 100).toFixed(2)}%0A*Paid via:* ${completedSale.paymentMethod.toUpperCase()}${completedSale.changeCents ? `%0A*Change:* R${(completedSale.changeCents / 100).toFixed(2)}` : ''}%0A%0A_Verified business on VerifiedBizLink.co.za_`;
    return `https://wa.me/?text=${msg}`;
  };

  const printReceipt = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-100 overflow-hidden font-sans">
      {/* LEFT: Product Catalog & Till Grid */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-slate-200 bg-slate-50">
        {/* Top Navbar */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/business/pos">
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </Link>
            </Button>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">Digital Till #1</h1>
              <div className="flex items-center gap-2 text-xs">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <WifiOff className="h-3 w-3" /> Offline Till
                  </span>
                )}
                <span className="text-slate-400">· Tap to Pay Ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScannerModal(true)}
              className="rounded-xl border-slate-300 text-xs font-bold text-slate-800"
            >
              <Barcode className="h-4 w-4 mr-1.5" /> Barcode Scan
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomItemModal(true)}
              className="rounded-xl border-amber-300 bg-amber-50 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Custom Item
            </Button>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, barcode, or SKU..."
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all',
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              All Items ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all',
                  selectedCategory === c.id
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ShoppingBag className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No products found</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {searchQuery
                  ? 'Try a different search or barcode'
                  : 'Add items in Inventory to see them here, or tap "Custom Item" above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((p) => {
                const priceRand = (p.selling_price_cents / 100).toFixed(2);
                const isOutOfStock = p.stock_quantity <= 0;
                const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= 5;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xs transition hover:border-amber-400 hover:shadow-md active:scale-95 group relative"
                  >
                    <div className="w-full">
                      <div className="relative aspect-video w-full rounded-xl bg-slate-100 overflow-hidden mb-2">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 text-amber-600 font-black text-sm">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {isOutOfStock && (
                          <span className="absolute top-1 right-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                            Out of stock
                          </span>
                        )}
                        {isLowStock && (
                          <span className="absolute top-1 right-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-xs">
                            Low: {p.stock_quantity}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-black text-slate-900 line-clamp-2 leading-tight group-hover:text-amber-600">
                        {p.name}
                      </h3>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-black text-slate-950">R{priceRand}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{p.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Live Shopping Basket & Checkout Drawer */}
      <div className="w-full lg:w-96 flex flex-col h-full bg-white border-l border-slate-200 shrink-0">
        {/* Basket Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900">Current Order</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900">
              {cart.reduce((acc, it) => acc + it.quantity, 0)}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Basket Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6">
              <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">Basket is empty</p>
              <p className="text-xs text-slate-400 mt-1">
                Tap items on the left to add them to this sale.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    R{(item.unitPriceCents / 100).toFixed(2)} each
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-700"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-700"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeCartItem(idx)}
                    className="ml-1 text-slate-300 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-right shrink-0 min-w-16">
                  <span className="text-xs font-black text-slate-900">
                    R{((item.quantity * item.unitPriceCents) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">R{(subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Incl. VAT (15%)</span>
              <span>R{(taxCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Total Due</span>
              <span className="text-xl text-amber-600">R{totalRand}</span>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => {
              setTenderRand((totalCents / 100).toFixed(2));
              setTapStep('prompt');
              setCheckoutModal(true);
            }}
            disabled={cart.length === 0}
            className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="h-5 w-5" /> Charge R{totalRand}
          </Button>
        </div>
      </div>

      {/* ===================== CHECKOUT & PAYMENT MODAL ===================== */}
      <Dialog open={checkoutModal} onOpenChange={setCheckoutModal}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Collect Payment: R{totalRand}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select payment method to complete this transaction.
            </DialogDescription>
          </DialogHeader>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2 my-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('card_tap')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all',
                paymentMethod === 'card_tap'
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 text-amber-950 font-black'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Smartphone className="h-6 w-6 mb-1 text-amber-600" />
              <span className="text-xs">Tap to Pay</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all',
                paymentMethod === 'cash'
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 text-amber-950 font-black'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Banknote className="h-6 w-6 mb-1 text-emerald-600" />
              <span className="text-xs">Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('qr_online')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all',
                paymentMethod === 'qr_online'
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 text-amber-950 font-black'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <QrCode className="h-6 w-6 mb-1 text-blue-600" />
              <span className="text-xs">QR / Link</span>
            </button>
          </div>

          {/* TAP TO PAY INTERACTION */}
          {paymentMethod === 'card_tap' && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-6 text-center space-y-4">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-lg">
                <CreditCard className="h-10 w-10 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  NFC
                </span>
              </div>

              <div>
                <h4 className="text-base font-black text-slate-900">
                  {tapStep === 'reading' ? 'Reading Card...' : 'Ready for Contactless Tap'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Ask customer to tap their debit/credit card, Apple Pay, or Google Wallet against the device.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                <span>Visa</span> · <span>Mastercard</span> · <span>Apple Pay</span> · <span>Google Pay</span>
              </div>
            </div>
          )}

          {/* CASH TENDER & CHANGE CALCULATOR */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Cash Tendered (R)</label>
                <Input
                  type="number"
                  step="0.10"
                  value={tenderRand}
                  onChange={(e) => setTenderRand(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 h-12 rounded-xl text-lg font-black bg-white"
                />
              </div>

              {/* Quick Rand Buttons */}
              <div className="flex items-center gap-2">
                {[50, 100, 200].map((rand) => (
                  <button
                    key={rand}
                    type="button"
                    onClick={() => setTenderRand(rand.toString())}
                    className="flex-1 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    R{rand}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTenderRand((totalCents / 100).toFixed(2))}
                  className="flex-1 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  Exact
                </button>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Change Due to Customer</span>
                <span className="text-base font-black text-emerald-600">
                  R{(changeCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* QR CODE / PAYFAST FALLBACK */}
          {paymentMethod === 'qr_online' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-3">
              <QrCode className="h-16 w-16 mx-auto text-slate-800" />
              <p className="text-xs text-slate-600 font-bold">
                Scan to Pay (Capitec Pay, SnapScan, Card, Instant EFT)
              </p>
              <p className="text-[11px] text-slate-400">
                Customer scans the QR code directly from your till screen.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              onClick={() => setCheckoutModal(false)}
              className="rounded-xl border-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-6 shadow-md"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Authorizing...
                </>
              ) : (
                `Complete Sale (R${totalRand})`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================== RECEIPT MODAL ===================== */}
      <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Receipt #{completedSale?.receiptNumber}
            </DialogDescription>
          </DialogHeader>

          {/* On-Screen Printable Thermal Receipt Format */}
          <div className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 space-y-2">
            <div className="text-center border-b border-dashed border-slate-300 pb-2">
              <p className="font-bold text-sm">VerifiedBizLink Merchant</p>
              <p className="text-[11px] text-slate-500">{completedSale?.date}</p>
              <p className="text-[11px] text-slate-500">Receipt: {completedSale?.receiptNumber}</p>
            </div>

            <div className="space-y-1 py-1 max-h-40 overflow-y-auto">
              {completedSale?.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate pr-2">
                    {it.quantity}x {it.name}
                  </span>
                  <span>R{((it.quantity * it.unitPriceCents) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL PAID</span>
                <span>R{((completedSale?.totalCents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Method</span>
                <span>{completedSale?.paymentMethod.toUpperCase()}</span>
              </div>
              {completedSale?.changeCents ? (
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>Change Given</span>
                  <span>R{(completedSale.changeCents / 100).toFixed(2)}</span>
                </div>
              ) : null}
              {completedSale?.authCode ? (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Auth Code</span>
                  <span>{completedSale.authCode}</span>
                </div>
              ) : null}
            </div>

            <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
              Thank you for your business! · Verified on VerifiedBizLink.co.za
            </div>
          </div>

          {/* Quick Sharing & Print Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-950 font-bold hover:bg-emerald-100 text-xs"
            >
              <a href={getWhatsAppReceiptUrl()} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-1.5 text-emerald-600" /> WhatsApp Receipt
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={printReceipt}
              className="rounded-xl border-slate-300 font-bold text-xs"
            >
              <Printer className="h-4 w-4 mr-1.5 text-slate-700" /> Print Receipt
            </Button>
          </div>

          <Button
            onClick={() => {
              setReceiptModal(false);
              setCompletedSale(null);
            }}
            className="w-full mt-2 rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300"
          >
            Start Next Sale
          </Button>
        </DialogContent>
      </Dialog>

      {/* ===================== CUSTOM ITEM MODAL ===================== */}
      <Dialog open={customItemModal} onOpenChange={setCustomItemModal}>
        <DialogContent className="max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Add Custom Item</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              For uncatalogued products, quick repair fees, or one-off items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Item Name / Description</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Phone Repair, Fresh Juice, Tailoring"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Price in Rands (R)</label>
              <Input
                type="number"
                step="0.50"
                value={customPriceRand}
                onChange={(e) => setCustomPriceRand(e.target.value)}
                placeholder="150.00"
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCustomItemModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={addCustomItem}
                className="rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================== BARCODE SCANNER MODAL ===================== */}
      <Dialog open={scannerModal} onOpenChange={setScannerModal}>
        <DialogContent className="max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Barcode Lookup</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Scan with an attached USB/Bluetooth scanner or enter the barcode digits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBarcodeSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Barcode / SKU</label>
              <Input
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. 6001001234567"
                className="mt-1 rounded-xl font-mono text-base"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScannerModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-amber-400 font-bold text-slate-950 text-xs"
              >
                Find & Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
