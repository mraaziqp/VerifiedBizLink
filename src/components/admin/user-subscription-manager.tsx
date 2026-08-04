"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Loader2, X, Save, Ban, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STAFF_ROLES = ["admin", "banker", "lawyer"];

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
  is_suspended: boolean;
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
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleToggleSuspend = async (user: User) => {
    const suspending = !user.is_suspended;
    let suspendedReason: string | undefined;
    if (suspending) {
      const reason = window.prompt("Reason for suspending this account (shown to the user):", "");
      if (reason === null) return; // cancelled
      suspendedReason = reason;
    }
    setSuspendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: suspending, suspendedReason }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: suspending } : u)));
        toast({ title: suspending ? "Account suspended" : "Account reinstated" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Could not update account", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not update account", variant: "destructive" });
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.full_name || user.email} (${user.email})?\n\nThis removes their account, posts, connections, messages, and business listing (if any). This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast({ title: "User deleted" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Could not delete user", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not delete user", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const tierName = (key: string | null) => tiers.find((t) => t.key === key)?.name || key || "Free";

  const getTierColor = (tier: string | null) => {
    if (tier === "premium") return "bg-cyan-500/15 text-cyan-700";
    if (tier === "standard") return "bg-yellow-500/15 text-yellow-700";
    if (tier === "premium_half") return "bg-purple-500/15 text-purple-700";
    return "bg-gray-200 text-gray-700";
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Users &amp; Plans</h2>
        <p className="text-gray-500 text-sm mt-1">
          {users.length} account{users.length === 1 ? "" : "s"}. Business accounts can have their plan
          overridden here (e.g. for support/comp reasons) — takes effect immediately.
        </p>
      </div>

      <Input
        placeholder="Search by email, name, or business..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-white border-gray-300 text-gray-900 placeholder-gray-400"
      />

      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Business</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Plan</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Change Plan</th>
              <th className="px-6 py-3 text-left text-gray-700 font-semibold">Moderate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => {
              const isStaffUser = STAFF_ROLES.includes(user.role);
              return (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-900">{user.email}</td>
                <td className="px-6 py-4 text-gray-900">{user.full_name}</td>
                <td className="px-6 py-4 text-gray-700">{user.company_name || "—"}</td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <select
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1 text-xs"
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
                  {!user.business_id ? (
                    <span className="text-gray-400 text-xs">—</span>
                  ) : editingId === user.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(user)} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-1">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="border-gray-300 text-gray-600 gap-1">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="text-cyan-700 border-cyan-500/30 gap-1">
                      <Edit2 className="h-3 w-3" /> Change Plan
                    </Button>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isStaffUser ? (
                    <span className="text-gray-400 text-xs">—</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleSuspend(user)}
                        disabled={suspendingId === user.id}
                        title={user.is_suspended ? "Reinstate this account" : "Ban / suspend this account"}
                        className={user.is_suspended ? "text-green-700 border-green-500/30 gap-1" : "text-red-700 border-red-500/30 gap-1"}
                      >
                        {suspendingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : user.is_suspended ? (
                          <><RotateCcw className="h-3 w-3" /> Reinstate</>
                        ) : (
                          <><Ban className="h-3 w-3" /> Ban</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        title="Permanently delete this account"
                        className="text-red-700 border-red-500/30 gap-1"
                      >
                        {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3" /> Remove</>}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found matching your search.</p>
        </div>
      )}
    </div>
  );
}
