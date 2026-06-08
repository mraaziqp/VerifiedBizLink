"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Tier {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  price_zar: number;
  billing_interval: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function TierManagement() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_usd: 0,
    price_zar: 0,
    billing_interval: "monthly",
    display_order: 0,
  });

  // Fetch tiers
  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await fetch("/api/admin/tiers");
      const data = await res.json();
      setTiers(data);
    } catch (error) {
      console.error("Failed to fetch tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editingId) {
        // Update
        const res = await fetch(`/api/admin/tiers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchTiers();
          setEditingId(null);
        }
      } else {
        // Create
        const res = await fetch("/api/admin/tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchTiers();
          setIsCreating(false);
        }
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save tier:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tier?")) return;
    try {
      const res = await fetch(`/api/admin/tiers/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchTiers();
      }
    } catch (error) {
      console.error("Failed to delete tier:", error);
    }
  };

  const handleEdit = (tier: Tier) => {
    setFormData({
      name: tier.name,
      description: tier.description,
      price_usd: tier.price_usd,
      price_zar: tier.price_zar,
      billing_interval: tier.billing_interval,
      display_order: tier.display_order,
    });
    setEditingId(tier.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_usd: 0,
      price_zar: 0,
      billing_interval: "monthly",
      display_order: 0,
    });
  };

  if (loading && tiers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Tier Management</h2>
          <p className="text-gray-400 text-sm mt-1">Create and manage subscription tiers</p>
        </div>
        <Dialog open={isCreating || !!editingId} onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingId(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2"
              onClick={() => {
                setIsCreating(true);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4" />
              New Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingId ? "Edit Tier" : "Create New Tier"}
              </DialogTitle>
              <DialogDescription>
                Define pricing, features, and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Tier Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Standard"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this tier"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Price (USD)</label>
                  <Input
                    type="number"
                    value={formData.price_usd}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_usd: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Price (ZAR)</label>
                  <Input
                    type="number"
                    value={formData.price_zar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_zar: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Billing Interval</label>
                  <select
                    value={formData.billing_interval}
                    onChange={(e) =>
                      setFormData({ ...formData, billing_interval: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                  >
                    <option>monthly</option>
                    <option>yearly</option>
                    <option>one-time</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Display Order</label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value),
                      })
                    }
                    placeholder="1"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                >
                  {editingId ? "Update Tier" : "Create Tier"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tiers Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700/50">
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Price (USD)</TableHead>
              <TableHead className="text-gray-300">Price (ZAR)</TableHead>
              <TableHead className="text-gray-300">Billing</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.id} className="border-gray-700/30 hover:bg-gray-800/20">
                <TableCell className="text-white font-medium">{tier.name}</TableCell>
                <TableCell className="text-gray-300">${tier.price_usd.toFixed(2)}</TableCell>
                <TableCell className="text-gray-300">R{tier.price_zar.toFixed(2)}</TableCell>
                <TableCell className="text-gray-400 text-sm capitalize">
                  {tier.billing_interval}
                </TableCell>
                <TableCell>
                  <Badge variant={tier.is_active ? "default" : "secondary"}>
                    {tier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(tier)}
                    className="text-yellow-400 border-yellow-400/30 hover:border-yellow-400 hover:bg-yellow-400/10"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(tier.id)}
                    className="text-red-400 border-red-400/30 hover:border-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
