"use client";

import { useState } from "react";
import { Save, Mail, Lock, Bell, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function UserAccountSettings({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    name: user?.name || "",
    company: "",
    phone: "",
    notificationsEmail: true,
    notificationsSMS: false,
    newsletter: true,
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Settings */}
      <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Profile Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-gray-800/50 border-gray-700 text-white"
              disabled
            />
            <p className="text-xs text-gray-500 mt-2">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
              className="bg-gray-800/50 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Your company or business name"
              className="bg-gray-800/50 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="bg-gray-800/50 border-gray-700 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <div>
              <p className="font-medium text-white">Email Notifications</p>
              <p className="text-sm text-gray-400">Get notified about ad performance and important updates</p>
            </div>
            <input
              type="checkbox"
              checked={formData.notificationsEmail}
              onChange={(e) => setFormData({ ...formData, notificationsEmail: e.target.checked })}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <div>
              <p className="font-medium text-white">SMS Notifications</p>
              <p className="text-sm text-gray-400">Text message alerts for urgent issues</p>
            </div>
            <input
              type="checkbox"
              checked={formData.notificationsSMS}
              onChange={(e) => setFormData({ ...formData, notificationsSMS: e.target.checked })}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <div>
              <p className="font-medium text-white">Marketing & Newsletter</p>
              <p className="text-sm text-gray-400">Tips, best practices, and product updates</p>
            </div>
            <input
              type="checkbox"
              checked={formData.newsletter}
              onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Security
        </h3>

        <div className="space-y-3">
          <Button className="w-full bg-gray-800/50 text-white hover:bg-gray-700/50 justify-start">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>

          <Button className="w-full bg-gray-800/50 text-white hover:bg-gray-700/50 justify-start">
            <Bell className="h-4 w-4 mr-2" />
            Two-Factor Authentication
          </Button>

          <Button className="w-full bg-gray-800/50 text-white hover:bg-gray-700/50 justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Manage Connected Devices
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/30 p-6">
        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Danger Zone
        </h3>

        <Button className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 justify-start">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account (Permanent)
        </Button>

        <p className="text-xs text-gray-500 mt-2">
          This action cannot be undone. All your data will be permanently deleted.
        </p>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        {saved && (
          <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-sm text-green-400">✓ Saved successfully</span>
          </div>
        )}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2 px-6"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-flex">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
