"use client";

import { useState, useEffect } from "react";
import { Edit2, Plus, Trash2, Lock, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: "super_admin" | "admin" | "moderator";
  createdAt: string;
}

export default function AdminUserManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ username: "", email: "" });
  const [newAdmin, setNewAdmin] = useState({ email: "", username: "", role: "admin" });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        await fetchAdmins();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error updating admin:", error);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.username) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });

      if (res.ok) {
        await fetchAdmins();
        setNewAdmin({ email: "", username: "", role: "admin" });
      }
    } catch (error) {
      console.error("Error adding admin:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this admin?")) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAdmins();
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Users</h2>
          <p className="text-gray-400 text-sm mt-1">Manage admin accounts and permissions</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2">
              <Plus className="h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Admin</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Email</label>
                <Input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Username</label>
                <Input
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  placeholder="admin_username"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as any })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <Button
                onClick={handleAddAdmin}
                className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
              >
                Add Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admins Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">Loading admins...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No admins yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-4 text-gray-300 font-semibold">Email</th>
                  <th className="text-left px-6 py-4 text-gray-300 font-semibold">Username</th>
                  <th className="text-left px-6 py-4 text-gray-300 font-semibold">Role</th>
                  <th className="text-left px-6 py-4 text-gray-300 font-semibold">Created</th>
                  <th className="text-right px-6 py-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-gray-700/30 hover:bg-gray-800/20">
                    <td className="px-6 py-4">
                      {editingId === admin.id ? (
                        <Input
                          value={editData.email}
                          onChange={(e) =>
                            setEditData({ ...editData, email: e.target.value })
                          }
                          className="bg-gray-800 border-gray-700 text-white max-w-xs"
                        />
                      ) : (
                        <span className="text-white flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          {admin.email}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === admin.id ? (
                        <Input
                          value={editData.username}
                          onChange={(e) =>
                            setEditData({ ...editData, username: e.target.value })
                          }
                          className="bg-gray-800 border-gray-700 text-white max-w-xs"
                        />
                      ) : (
                        <span className="text-gray-300">{admin.username}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        admin.role === "super_admin"
                          ? "bg-red-500/20 text-red-400"
                          : admin.role === "admin"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {admin.role.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {editingId === admin.id ? (
                        <Button
                          size="sm"
                          onClick={() => handleEdit(admin.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(admin.id);
                            setEditData({ email: admin.email, username: admin.username });
                          }}
                          className="text-yellow-400 border-yellow-400/30 hover:border-yellow-400"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(admin.id)}
                        className="text-red-400 border-red-400/30 hover:border-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
