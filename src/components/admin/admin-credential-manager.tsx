"use client";

import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export function AdminCredentialManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const [formData, setFormData] = useState({
    currentPassword: "",
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      toast({
        title: "Required",
        description: "Please enter your current password to verify your identity.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation password must match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newEmail: formData.newEmail || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update settings.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Settings Updated",
        description: "Your credentials have been updated successfully.",
      });

      setFormData({
        currentPassword: "",
        newEmail: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
        <p className="text-gray-500 mt-1">Manage your email and password securely</p>
      </div>

      {user && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Logged in as:</strong> {user.email}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <strong>Role:</strong> {user.role === "admin" ? "Administrator" : user.role}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg p-6 border border-gray-200">
        {/* Current Password Section */}
        <div className="space-y-4 pb-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Verify Identity
          </h3>
          <div>
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password
            </Label>
            <div className="relative mt-2">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleChange("currentPassword", e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10 border-gray-300"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Required to confirm any changes</p>
          </div>
        </div>

        {/* Email Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </h3>
          <div>
            <Label htmlFor="currentEmail" className="text-sm font-medium text-gray-600">
              Current Email
            </Label>
            <Input
              id="currentEmail"
              type="email"
              value={user?.email || ""}
              disabled
              className="mt-2 bg-gray-50 cursor-not-allowed border-gray-300"
            />
          </div>
          <div>
            <Label htmlFor="newEmail" className="text-sm font-medium">
              New Email Address (optional)
            </Label>
            <Input
              id="newEmail"
              type="email"
              value={formData.newEmail}
              onChange={(e) => handleChange("newEmail", e.target.value)}
              placeholder="Leave blank if not changing"
              className="mt-2 border-gray-300"
            />
            <p className="text-xs text-gray-500 mt-1">You'll need to log in again with your new email</p>
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </h3>
          <div>
            <Label htmlFor="newPassword" className="text-sm font-medium">
              New Password (optional)
            </Label>
            <div className="relative mt-2">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleChange("newPassword", e.target.value)}
                placeholder="Leave blank if not changing"
                className="pr-10 border-gray-300"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          {formData.newPassword && (
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" })}
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Security Note:</strong> Your password is encrypted and never stored in plain text. All changes are
          logged for security purposes.
        </p>
      </div>
    </div>
  );
}
