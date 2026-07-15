"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Loader2, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_name: string | null;
  business_id: string | null;
  business_status: string | null;
  package_type: string | null;
  created_at: string;
}

interface Tier {
  key: string;
  name: string;
}

export default function UserSubscriptionManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetch("/api/tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.tiers) setTiers(data.tiers); })
      .catch(() => {});
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditTier(user.package_type || "free");
  };

  const handleSaveEdit = async (user: User) => {
    if (!user.business_id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/businesses/${user.business_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: editTier }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, package_type: editTier } : u)));
        setEditingId(null);
        toast({ title: "Plan updated" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Could not update plan", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not update plan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tierName = (key: string | null) => tiers.find((t) => t.key === key)?.name || key || "Free";

  const getTierColor = (tier: string | null) => {
    if (tier === "premium") return "bg-cyan-500/20 text-cyan-400";
    if (tier === "standard") return "bg-yellow-500/20 text-yellow-400";
    if (tier === "premium_half") return "bg-purple-500/20 text-purple-400";
    return "bg-gray-500/20 text-gray-400";
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
        <p className="text-gray-400 mt-4">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Users &amp; Plans</h2>
        <p className="text-gray-400 text-sm mt-1">
          {users.length} account{users.length === 1 ? "" : "s"}. Business accounts can have their plan
          overridden here (e.g. for support/comp reasons) — takes effect immediately.
        </p>
      </div>

      <Input
        placeholder="Search by email, name, or business..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
      />

      <div className="rounded-lg border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Business</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Plan</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 text-gray-300">{user.email}</td>
                <td className="px-6 py-4 text-gray-300">{user.full_name}</td>
                <td className="px-6 py-4 text-gray-300">{user.company_name || "—"}</td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value)}
                      className="bg-gray-800 border border-gray-600 text-white rounded-lg px-2 py-1 text-xs"
                    >
                      {tiers.map((t) => (
                        <option key={t.key} value={t.key}>{t.name}</option>
                      ))}
                    </select>
                  ) : user.business_id ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(user.package_type)}`}>
                      {tierName(user.package_type)}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">No business</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {!user.business_id ? null : editingId === user.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(user)} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-1">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="border-gray-700 text-gray-300 gap-1">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="text-cyan-400 border-cyan-500/30 gap-1">
                      <Edit2 className="h-3 w-3" /> Change Plan
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No users found matching your search.</p>
        </div>
      )}
    </div>
  );
}
