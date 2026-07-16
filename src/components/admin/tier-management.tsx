"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X, Loader2, Plus, Megaphone } from "lucide-react";

interface Tier {
  key: string;
  name: string;
  price: number;
  adLimit: number;
  monthlyAdCredits: number;
  features: string[];
  note?: string | null;
  sortOrder: number;
  isActive: boolean;
  isPurchasable: boolean;
}

type TierForm = {
  name: string;
  price: number;
  adLimit: number;
  monthlyAdCredits: number;
  features: string;
};

const emptyForm: TierForm = { name: "", price: 0, adLimit: 0, monthlyAdCredits: 0, features: "" };

function toForm(tier: Tier): TierForm {
  return {
    name: tier.name,
    price: tier.price,
    adLimit: tier.adLimit,
    monthlyAdCredits: tier.monthlyAdCredits,
    features: tier.features.join("\n"),
  };
}

export default function TierManagement() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TierForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newForm, setNewForm] = useState<TierForm>(emptyForm);

  const fetchTiers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tiers");
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers || []);
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const startEdit = (tier: Tier) => {
    setEditingKey(tier.key);
    setEditForm(toForm(tier));
  };

  const handleSave = async (key: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/tiers/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          price: Number(editForm.price),
          adLimit: Number(editForm.adLimit),
          monthlyAdCredits: Number(editForm.monthlyAdCredits),
          features: editForm.features.split("\n").map((f) => f.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const { tier } = await res.json();
        setTiers((prev) => prev.map((t) => (t.key === key ? tier : t)));
        setEditingKey(null);
        toast({ title: "Tier updated" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Could not update tier", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not update tier", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (tier: Tier) => {
    try {
      const res = await fetch(`/api/admin/tiers/${tier.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tier.isActive }),
      });
      if (res.ok) {
        const { tier: updated } = await res.json();
        setTiers((prev) => prev.map((t) => (t.key === tier.key ? updated : t)));
      }
    } catch {
      toast({ title: "Could not update tier", variant: "destructive" });
    }
  };

  const handleTogglePurchasable = async (tier: Tier) => {
    try {
      const res = await fetch(`/api/admin/tiers/${tier.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchasable: !tier.isPurchasable }),
      });
      if (res.ok) {
        const { tier: updated } = await res.json();
        setTiers((prev) => prev.map((t) => (t.key === tier.key ? updated : t)));
      }
    } catch {
      toast({ title: "Could not update tier", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !newForm.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          name: newForm.name,
          price: Number(newForm.price),
          adLimit: Number(newForm.adLimit),
          monthlyAdCredits: Number(newForm.monthlyAdCredits),
          features: newForm.features.split("\n").map((f) => f.trim()).filter(Boolean),
          sortOrder: tiers.length + 1,
        }),
      });
      if (res.ok) {
        const { tier } = await res.json();
        setTiers((prev) => [...prev, tier]);
        setShowNewForm(false);
        setNewKey("");
        setNewForm(emptyForm);
        toast({ title: "Tier created" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Could not create tier", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not create tier", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
        <p className="text-gray-400 mt-4">Loading tiers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Tier Management</h2>
          <p className="text-gray-400 text-sm mt-1">
            Prices, ad limits, and monthly ad-credit allowances — these blocks are enforced live: a business&apos;s
            package_type determines exactly what they can do.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewForm((v) => !v)}
          className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <Plus className="h-4 w-4" /> New Tier
        </Button>
      </div>

      {showNewForm && (
        <Card className="bg-gray-900/60 border-cyan-500/30 p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Key (used internally, e.g. &ldquo;gold&rdquo;)</label>
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="gold" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Display Name</label>
              <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Gold" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Price (R/month)</label>
              <Input type="number" value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max simultaneous ads</label>
              <Input type="number" value={newForm.adLimit} onChange={(e) => setNewForm({ ...newForm, adLimit: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Monthly ad credits (ad-days)</label>
              <Input type="number" value={newForm.monthlyAdCredits} onChange={(e) => setNewForm({ ...newForm, monthlyAdCredits: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Features (one per line)</label>
            <textarea
              value={newForm.features}
              onChange={(e) => setNewForm({ ...newForm, features: e.target.value })}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={isSaving || !newKey.trim() || !newForm.name.trim()} className="bg-green-600 hover:bg-green-700 text-white gap-1">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Create
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <Card
            key={tier.key}
            className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-cyan-500/20 hover:border-cyan-500/40 transition-all p-6 ${!tier.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-white">{tier.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Active</span>
                <Switch checked={tier.isActive} onCheckedChange={() => handleToggleActive(tier)} />
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs font-mono">{tier.key}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">On pricing page</span>
                <Switch checked={tier.isPurchasable} onCheckedChange={() => handleTogglePurchasable(tier)} />
              </div>
            </div>
            {!tier.isPurchasable && (
              <p className="text-[11px] text-yellow-500/80 mb-2">Hidden from pricing/checkout — e.g. a trial state, not something someone manually buys.</p>
            )}

            {editingKey === tier.key ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Name</label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Price (R/month)</label>
                  <Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max simultaneous ads</label>
                  <Input type="number" value={editForm.adLimit} onChange={(e) => setEditForm({ ...editForm, adLimit: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Monthly ad credits (ad-days)</label>
                  <Input type="number" value={editForm.monthlyAdCredits} onChange={(e) => setEditForm({ ...editForm, monthlyAdCredits: Number(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Features (one per line)</label>
                  <textarea
                    value={editForm.features}
                    onChange={(e) => setEditForm({ ...editForm, features: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(tier.key)} disabled={isSaving} className="flex-1 bg-green-600 text-white hover:bg-green-700 gap-1">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </Button>
                  <Button size="sm" onClick={() => setEditingKey(null)} variant="outline" className="flex-1 border-gray-700 text-gray-300 gap-1">
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-cyan-400">
                    R{Number(tier.price).toLocaleString("en-ZA")}
                    <span className="text-base font-medium text-gray-400">/month</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-gray-800 text-gray-300 border-gray-700 gap-1">
                    <Megaphone className="h-3 w-3" /> {tier.adLimit} active ad{tier.adLimit === 1 ? "" : "s"}
                  </Badge>
                  <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                    {tier.monthlyAdCredits} ad-days/mo
                  </Badge>
                </div>
                <ul className="space-y-1 mb-4 text-xs text-gray-400">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                  {tier.features.length > 4 && <li>+{tier.features.length - 4} more</li>}
                </ul>
                <Button size="sm" onClick={() => startEdit(tier)} className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-600 font-semibold gap-2">
                  <Edit2 className="h-4 w-4" /> Edit Tier
                </Button>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
