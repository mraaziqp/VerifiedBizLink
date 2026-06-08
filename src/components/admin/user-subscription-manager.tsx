"use client";

import { useState, useEffect } from "react";
import { Search, Edit2, Loader2, Shield, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface User {
  id: string;
  email: string;
  name: string;
}

interface Subscription {
  id: string;
  user_id: string;
  tier_id: string;
  tier_name: string;
  status: string;
  started_at: string;
  renews_at: string;
  permission_overrides: Record<string, boolean>;
}

interface Tier {
  id: string;
  name: string;
  price_usd: number;
}

export default function UserSubscriptionManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiersRes, usersRes] = await Promise.all([
        fetch("/api/admin/tiers"),
        fetch("/api/users"),
      ]);

      const tiersData = await tiersRes.json();
      const usersData = await usersRes.json();

      setTiers(tiersData);
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscription = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`);
      const data = await res.json();
      setSubscription(data.subscription || null);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setSelectedTierId("");
    await fetchUserSubscription(user.id);
    setIsDialogOpen(true);
  };

  const handleAssignTier = async () => {
    if (!selectedUser || !selectedTierId) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/users/${selectedUser.id}/subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier_id: selectedTierId }),
        }
      );

      if (res.ok) {
        await fetchUserSubscription(selectedUser.id);
        // Optionally close dialog after success
        // setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to assign tier:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedUser || !subscription) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/users/${selectedUser.id}/subscription`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription_id: subscription.id,
            status: "cancelled",
          }),
        }
      );

      if (res.ok) {
        await fetchUserSubscription(selectedUser.id);
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">User Subscriptions</h2>
        <p className="text-gray-400 text-sm mt-1">
          Assign tiers and manage user permissions
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
        <Input
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 overflow-hidden">
        {loading && filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700/50">
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Current Tier</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-right text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-gray-700/30 hover:bg-gray-800/20">
                  <TableCell className="text-gray-300">{user.email}</TableCell>
                  <TableCell className="text-white font-medium">{user.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-gray-600">
                      {/* Would fetch from subscription */}
                      Free
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserSelect(user)}
                          className="text-yellow-400 border-yellow-400/30 hover:border-yellow-400 hover:bg-yellow-400/10"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Manage Subscription
                          </DialogTitle>
                          <DialogDescription>
                            {selectedUser?.email}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Current Subscription Info */}
                          {subscription && (
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                              <p className="text-sm text-gray-400 mb-2">Current Tier</p>
                              <p className="text-lg font-bold text-yellow-400">
                                {subscription.tier_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                Status: {subscription.status}
                              </p>
                            </div>
                          )}

                          {/* Assign New Tier */}
                          <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">
                              Change Tier
                            </label>
                            <select
                              value={selectedTierId}
                              onChange={(e) => setSelectedTierId(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                            >
                              <option value="">Select a tier...</option>
                              {tiers.map((tier) => (
                                <option key={tier.id} value={tier.id}>
                                  {tier.name} (${tier.price_usd}/mo)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Permission Overrides */}
                          <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">
                              <Lock className="inline h-4 w-4 mr-2" />
                              Permission Overrides
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                              Grant or revoke specific permissions beyond tier defaults
                            </p>
                            <div className="space-y-2">
                              {[
                                "can_create_posts",
                                "can_view_analytics",
                                "api_access",
                                "priority_support",
                              ].map((permission) => (
                                <div key={permission} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={permission}
                                    defaultChecked={
                                      subscription?.permission_overrides?.[permission] || false
                                    }
                                    className="w-4 h-4"
                                  />
                                  <label htmlFor={permission} className="text-sm text-gray-300">
                                    {permission.replace(/_/g, " ")}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-4 border-t border-gray-700">
                            <Button
                              onClick={handleAssignTier}
                              disabled={!selectedTierId || loading}
                              className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                            >
                              {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Assign Tier"
                              )}
                            </Button>
                            {subscription && (
                              <Button
                                onClick={handleCancelSubscription}
                                disabled={loading}
                                variant="outline"
                                className="text-red-400 border-red-400/30 hover:border-red-400"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
