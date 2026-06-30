"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Save, X, Loader2 } from "lucide-react";

const MOCK_TIERS = [
  {
    id: "1",
    name: "Free",
    price_usd: 0,
    price_zar: 0,
    description: "For new businesses",
    billing_interval: "monthly",
    is_active: true,
    display_order: 1,
  },
  {
    id: "2",
    name: "Verified Business",
    price_usd: 99,
    price_zar: 1500,
    description: "Build trust and credibility",
    billing_interval: "monthly",
    is_active: true,
    display_order: 2,
  },
  {
    id: "3",
    name: "Premium Business",
    price_usd: 299,
    price_zar: 4500,
    description: "For growing SMEs",
    billing_interval: "monthly",
    is_active: true,
    display_order: 3,
  },
  {
    id: "4",
    name: "Enterprise Partner",
    price_usd: 999,
    price_zar: 15000,
    description: "For established brands",
    billing_interval: "monthly",
    is_active: true,
    display_order: 4,
  },
];

interface Tier {
  id: string;
  name: string;
  price_usd: number;
  price_zar: number;
  description: string;
  billing_interval: string;
  is_active: boolean;
  display_order: number;
}

export default function TierManagement() {
  const [tiers, setTiers] = useState<Tier[]>(MOCK_TIERS);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price_usd: 0, price_zar: 0 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tiers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTiers(data);
        } else {
          setTiers(MOCK_TIERS);
        }
      } else {
        setTiers(MOCK_TIERS);
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
      setTiers(MOCK_TIERS);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = (tier: Tier) => {
    setEditingId(tier.id);
    setEditForm({ price_usd: tier.price_usd, price_zar: tier.price_zar });
  };

  const handleSavePrice = async () => {
    if (!editingId) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/tiers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setTiers(tiers.map((t) => (t.id === editingId ? { ...t, ...editForm } : t)));
        setEditingId(null);
        alert("✅ Price updated successfully!");
      } else {
        alert("❌ Failed to update price");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error updating price");
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
      <div>
        <h2 className="text-2xl font-bold text-white">Subscription Tiers</h2>
        <p className="text-gray-400 text-sm mt-1">Manage pricing and features for each tier</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-cyan-500/20 hover:border-cyan-500/40 transition-all p-6"
          >
            <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{tier.description}</p>

            {editingId === tier.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">USD Price</label>
                  <Input
                    type="number"
                    value={editForm.price_usd}
                    onChange={(e) => setEditForm({ ...editForm, price_usd: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ZAR Price</label>
                  <Input
                    type="number"
                    value={editForm.price_zar}
                    onChange={(e) => setEditForm({ ...editForm, price_zar: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSavePrice}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 text-white hover:bg-green-700 gap-1"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setEditingId(null)}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-cyan-400">
                    R{Number(tier.price_zar).toLocaleString('en-ZA')}
                    <span className="text-base font-medium text-gray-400">/month</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleEditPrice(tier)}
                  className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-600 font-semibold gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Price
                </Button>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
