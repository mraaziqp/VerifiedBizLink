"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Loader2, X, Save } from "lucide-react";

const MOCK_USERS = [
  { id: "1", email: "john@company.com", name: "John Smith", business_name: "ABC Consulting", current_tier: "Premium", status: "active", created_at: "2026-01-15" },
  { id: "2", email: "sarah@business.co.za", name: "Sarah Johnson", business_name: "Sarah Consulting", current_tier: "Verified", status: "active", created_at: "2026-02-20" },
  { id: "3", email: "mike@startup.com", name: "Mike Chen", business_name: "Tech Startup", current_tier: "Free", status: "pending", created_at: "2026-05-10" },
  { id: "4", email: "lisa@services.com", name: "Lisa Martinez", business_name: "Premium Services", current_tier: "Enterprise", status: "active", created_at: "2026-03-05" },
  { id: "5", email: "david@business.org", name: "David Brown", business_name: "Brown Industries", current_tier: "Premium", status: "active", created_at: "2026-04-12" },
];

interface User {
  id: string;
  email: string;
  name: string;
  business_name: string;
  current_tier: string;
  status: string;
  created_at: string;
}

export default function UserSubscriptionManager() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
        } else {
          setUsers(MOCK_USERS);
        }
      } else {
        setUsers(MOCK_USERS);
      }
    } catch (error) {
      console.error("Error:", error);
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditData({ ...user });
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    setUsers(users.map((u) => (u.id === editingId ? editData : u)));
    setEditingId(null);
    setEditData(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setUsers(users.filter((u) => u.id !== userId));
  };

  const getTierColor = (tier: string) => {
    if (tier === "Enterprise") return "bg-purple-500/20 text-purple-400";
    if (tier === "Premium") return "bg-cyan-500/20 text-cyan-400";
    if (tier === "Verified") return "bg-yellow-500/20 text-yellow-400";
    return "bg-gray-500/20 text-gray-400";
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "text-green-400" : "text-yellow-400";
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
        <h2 className="text-2xl font-bold text-white">User Subscriptions</h2>
        <p className="text-gray-400 text-sm mt-1">Manage user tiers and subscriptions</p>
      </div>

      <Input
        placeholder="Search by email or name..."
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
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Tier</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-gray-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 text-gray-300">{user.email}</td>
                <td className="px-6 py-4 text-gray-300">{user.name}</td>
                <td className="px-6 py-4 text-gray-300">{user.business_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(user.current_tier)}`}>
                    {user.current_tier}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm font-semibold ${getStatusColor(user.status)}`}>
                  {user.status}
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="text-cyan-400 border-cyan-500/30 gap-1">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(user.id)} className="text-red-400 border-red-500/30 gap-1">
                    <Trash2 className="h-3 w-3" />
                  </Button>
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

      {/* Edit Modal */}
      {editingId && editData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit User</h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <Input
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name
                </label>
                <Input
                  value={editData.business_name}
                  onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tier
                  </label>
                  <select
                    value={editData.current_tier}
                    onChange={(e) => setEditData({ ...editData, current_tier: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option>Free</option>
                    <option>Premium</option>
                    <option>Enterprise</option>
                    <option>Verified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
