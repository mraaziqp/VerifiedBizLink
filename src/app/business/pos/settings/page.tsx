'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Check, CreditCard, Loader2, Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PosPlan {
  plan_key: string;
  name: string;
  monthly_price_rand: number;
  setup_fee_rand: number;
  transaction_fee_percent: number;
  max_tills: number;
  max_staff: number;
  features: string[];
}

export default function PosSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [plans, setPlans] = useState<PosPlan[]>([]);
  const [currentPlanKey, setCurrentPlanKey] = useState('starter');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    tax_rate_percent: 15,
    vat_number: '',
    receipt_header: 'Thank you for supporting local business!',
    receipt_footer: 'Verified by VerifiedBizLink.co.za',
    phone: '',
    email: '',
    address: '',
    auto_print_receipt: false,
    allow_offline_sales: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [setRes, subRes] = await Promise.all([
        fetch('/api/pos/settings').catch(() => null),
        fetch('/api/pos/subscription').catch(() => null),
      ]);

      if (setRes?.ok) {
        const data = await setRes.json();
        if (data.settings) {
          setSettings({
            tax_rate_percent: Number(data.settings.tax_rate_percent) || 15,
            vat_number: data.settings.vat_number || '',
            receipt_header: data.settings.receipt_header || 'Thank you for supporting local business!',
            receipt_footer: data.settings.receipt_footer || 'Verified by VerifiedBizLink.co.za',
            phone: data.settings.phone || '',
            email: data.settings.email || '',
            address: data.settings.address || '',
            auto_print_receipt: Boolean(data.settings.auto_print_receipt),
            allow_offline_sales: data.settings.allow_offline_sales !== false,
          });
        }
      }

      if (subRes?.ok) {
        const subData = await subRes.json();
        setPlans(subData.plans || []);
        if (subData.subscription?.plan_key) {
          setCurrentPlanKey(subData.subscription.plan_key);
        }
      }
    } catch {
      toast({ title: 'Could not load POS settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/pos/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({ title: 'Store settings saved successfully' });
      } else {
        toast({ title: 'Failed to update settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSwitchPlan = async (planKey: string) => {
    setSubscribing(planKey);
    try {
      const res = await fetch('/api/pos/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, setupFeePaid: true }),
      });

      if (res.ok) {
        toast({ title: `Subscribed to ${planKey.toUpperCase()} plan!` });
        setCurrentPlanKey(planKey);
      } else {
        toast({ title: 'Could not update plan', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/business/pos">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">POS Settings & Subscription</h1>
            <p className="text-xs text-slate-500">Configure till receipts, VAT details, and your POS subscription plan.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Subscription Plans Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-500" /> POS Subscription & Pricing Plans
                </h2>
                <p className="text-xs text-slate-500">
                  Affordable POS built for South African merchants. Transparent 1% platform fee.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p) => {
                  const isCurrent = currentPlanKey === p.plan_key;
                  const feats = Array.isArray(p.features) ? p.features : [];

                  return (
                    <div
                      key={p.plan_key}
                      className={cn(
                        'relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-xs transition-all',
                        isCurrent
                          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                          : 'border-slate-200'
                      )}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 right-6 rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black uppercase text-slate-950 shadow-xs">
                          Current Plan
                        </span>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-950">
                              R{p.monthly_price_rand}
                            </span>
                            <span className="text-xs font-bold text-slate-400">/ month</span>
                          </div>
                          <p className="text-[11px] font-bold text-emerald-700 mt-1">
                            + {p.transaction_fee_percent}% transaction fee
                          </p>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-2">
                          {feats.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6 mt-4 border-t border-slate-100">
                        {isCurrent ? (
                          <Button disabled className="w-full rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">
                            Active Plan
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleSwitchPlan(p.plan_key)}
                            disabled={subscribing === p.plan_key}
                            className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xs"
                          >
                            {subscribing === p.plan_key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              `Upgrade to ${p.name}`
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Till & Receipt Settings Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Store className="h-5 w-5 text-amber-500" /> Store Profile & Receipt Customization
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Receipt Header Banner</label>
                  <Input
                    value={settings.receipt_header}
                    onChange={(e) => setSettings((s) => ({ ...s, receipt_header: e.target.value }))}
                    className="mt-1 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed at the top of digital and WhatsApp receipts.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Receipt Footer Note</label>
                  <Input
                    value={settings.receipt_footer}
                    onChange={(e) => setSettings((s) => ({ ...s, receipt_footer: e.target.value }))}
                    className="mt-1 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed at the bottom of digital receipts.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700">VAT / Tax Number</label>
                  <Input
                    value={settings.vat_number}
                    onChange={(e) => setSettings((s) => ({ ...s, vat_number: e.target.value }))}
                    placeholder="e.g. 4012345678"
                    className="mt-1 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Standard VAT Rate (%)</label>
                  <Input
                    type="number"
                    value={settings.tax_rate_percent}
                    onChange={(e) => setSettings((s) => ({ ...s, tax_rate_percent: parseFloat(e.target.value || '15') }))}
                    className="mt-1 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Store Contact Phone</label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="082 123 4567"
                    className="mt-1 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Store Contact Email</label>
                  <Input
                    value={settings.email}
                    onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                    placeholder="store@verifiedbizlink.co.za"
                    className="mt-1 rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700">Physical Store Address</label>
                  <Input
                    value={settings.address}
                    onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                    placeholder="e.g. 12 Long Street, Cape Town"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Allow Offline Cash Sales</p>
                    <p className="text-[11px] text-slate-500">
                      Enables cash checkout without active internet connection; queues sales to sync when online.
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_offline_sales}
                    onCheckedChange={(checked) => setSettings((s) => ({ ...s, allow_offline_sales: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Auto-Print Thermal Receipt</p>
                    <p className="text-[11px] text-slate-500">Automatically invokes printer dialog after each approved sale.</p>
                  </div>
                  <Switch
                    checked={settings.auto_print_receipt}
                    onCheckedChange={(checked) => setSettings((s) => ({ ...s, auto_print_receipt: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs px-6 shadow-xs"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Store Settings'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
