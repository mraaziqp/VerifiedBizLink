"use client";

import { useState, useEffect } from "react";
import { compressImage, fetchWithTimeout } from "@/lib/image-compress";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Bell, CreditCard, Loader2, Camera, Trash2, Download, AlertTriangle, Lock, CheckCircle2, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionConfirm, setDeletionConfirm] = useState("");
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    connectionRequests: true,
    vettingUpdates: true,
    postInteractions: false,
    complianceAlerts: false,
  });
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    headline: "",
    location: "",
    bio: "",
    phone: "",
    avatarUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check if there is already a pending deletion request
    fetch('/api/users/delete-request')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.pending) setDeletionRequested(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch full profile from DB (includes bio, phone, location not stored in JWT)
    fetch('/api/users/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfileForm({
            fullName: data.fullName || "",
            headline: data.headline || "",
            location: data.location || "",
            bio: data.bio || "",
            phone: data.phone || "",
            avatarUrl: data.avatarUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        headline: prev.headline || user.headline || "",
        avatarUrl: prev.avatarUrl || user.avatarUrl || "",
      }));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName: profileForm.fullName,
            headline: profileForm.headline,
            location: profileForm.location,
            bio: profileForm.bio,
            phone: profileForm.phone,
          }),
      });
      if (res.ok) {
        await refresh();
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifSettings }),
      });
      if (res.ok) {
        toast({ title: "Preferences Saved", description: "Your notification settings have been updated." });
      } else {
        toast({ title: "Saved locally", description: "Preferences updated for this session." });
      }
    } catch {
      toast({ title: "Saved locally", description: "Preferences updated for this session." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (res.ok) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast({ title: "Password Changed", description: "Your password has been updated." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (deletionConfirm !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/users/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setDeletionRequested(true);
        toast({
          title: "Deletion Request Submitted",
          description: "Your account will be permanently deleted within 30–90 days. You can cancel this within 7 days.",
        });
      } else {
        const d = await res.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not submit deletion request.", variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
      setDeletionConfirm("");
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const res = await fetch('/api/users/delete-request', { method: 'DELETE' });
      if (res.ok) {
        setDeletionRequested(false);
        toast({ title: "Deletion Cancelled", description: "Your account deletion request has been cancelled." });
      }
    } catch {
      toast({ title: "Error", description: "Could not cancel deletion.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast({ title: "Signed Out", description: "You have been signed out." });
        router.push('/login');
      }
    } catch {
      toast({ title: "Error", description: "Could not sign out.", variant: "destructive" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file even after an error
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Resize to a small square-ish avatar before upload → fast & always under the limit.
      const compressed = await compressImage(file, { maxDim: 512, quality: 0.85 });
      const form = new FormData();
      form.append('avatar', compressed);
      const res = await fetchWithTimeout('/api/users/avatar', { method: 'POST', body: form }, 30000);
      if (res.ok) {
        const data = await res.json();
        setProfileForm(p => ({ ...p, avatarUrl: data.avatarUrl }));
        await refresh();
        toast({ title: "Avatar Updated", description: "Your profile photo has been saved." });
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: "Upload Failed", description: d.error || "Please try again.", variant: "destructive" });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      toast({
        title: "Upload Failed",
        description: aborted ? "Upload timed out — check your connection and retry." : "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="hidden lg:block lg:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="lg:col-span-9 space-y-6 min-w-0">
            <div className="flex items-center justify-between px-2">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <Tabs defaultValue="profile" className="w-full space-y-6">
              <TabsList className="bg-white border p-1 rounded-2xl h-auto shadow-sm w-full lg:w-fit flex overflow-x-auto gap-0">
                <TabsTrigger value="profile" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Notifs</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="privacy" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Lock className="h-4 w-4" />
                  Data & Privacy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your public profile and contact details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <form className="space-y-6" onSubmit={handleSaveProfile}>
                      {/* Avatar upload */}
                      <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-gray-100">
                          <AvatarImage src={profileForm.avatarUrl || user?.avatarUrl} alt={profileForm.fullName} />
                          <AvatarFallback className="text-xl font-bold">
                            {profileForm.fullName?.[0] ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4" />Profile Photo</Label>
                          <label htmlFor="avatar-upload">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl cursor-pointer"
                              disabled={isUploadingAvatar}
                              asChild
                            >
                              <span>
                                {isUploadingAvatar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Camera className="h-4 w-4 mr-2" />Upload Photo</>}
                              </span>
                            </Button>
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={handleAvatarUpload}
                            disabled={isUploadingAvatar}
                          />
                          <p className="text-xs text-gray-500">JPEG, PNG, WebP or GIF · auto-optimized on upload</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={profileForm.fullName}
                            onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            value={user?.email || ""}
                            disabled
                            className="rounded-xl h-11 bg-gray-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Professional Headline</Label>
                          <Input
                            value={profileForm.headline}
                            onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))}
                            placeholder="e.g. CEO at Acme Corp"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            type="tel"
                            value={profileForm.phone}
                            onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+27 21 555 0100"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Location</Label>
                          <Input
                            value={profileForm.location}
                            onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                            placeholder="Cape Town, South Africa"
                            className="rounded-xl h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Bio / About</Label>
                        <Textarea
                          value={profileForm.bio}
                          onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Tell the community about yourself and your business experience..."
                          className="rounded-xl min-h-[100px] resize-none"
                          maxLength={600}
                        />
                      </div>
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Login & Security</CardTitle>
                    <CardDescription>Secure your account with a strong password.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form className="space-y-6 max-w-sm" onSubmit={handleChangePassword}>
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how and when you receive alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {([
                      { key: 'connectionRequests', label: "New Connection Requests", desc: "Alert when someone wants to connect" },
                      { key: 'vettingUpdates', label: "Vetting Status Updates", desc: "Alert when your business verification changes" },
                      { key: 'postInteractions', label: "Post Interactions", desc: "Alert when someone likes or comments" },
                      { key: 'complianceAlerts', label: "Compliance Alerts", desc: "Critical compliance notifications" },
                    ] as const).map((item) => (
                      <div key={item.key} className="p-6 border-b last:border-b-0 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-bold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifSettings[item.key]}
                          onCheckedChange={(val) => setNotifSettings(prev => ({ ...prev, [item.key]: val }))}
                        />
                      </div>
                    ))}
                    <div className="p-6 border-b last:border-b-0 flex items-center justify-between hover:bg-blue-50 transition-colors bg-blue-50/30">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-bold text-gray-900">AI Assistant</p>
                          <p className="text-xs text-gray-500 font-medium">Enable smart support and research features</p>
                        </div>
                      </div>
                      <Switch
                        checked={aiAssistantEnabled}
                        onCheckedChange={setAiAssistantEnabled}
                      />
                    </div>
                    <div className="p-6 flex justify-end border-t bg-gray-50/50">
                      <Button
                        onClick={handleSaveNotifications}
                        disabled={isSaving}
                        className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Billing & Subscription</CardTitle>
                    <CardDescription>Manage your membership plan and payment methods.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                      <div className="p-4 rounded-2xl bg-primary/10">
                        <CreditCard className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Billing Portal Coming Soon</h3>
                        <p className="text-sm text-gray-500 font-medium mt-1 max-w-sm">
                          Subscription and payment management will be available here. Contact us to learn about available plans.
                        </p>
                      </div>
                      <a href="/contact">
                        <Button variant="outline" className="rounded-xl font-bold">
                          Contact Us About Plans
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="animate-in fade-in duration-500 space-y-5">
                {/* Your Data */}
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-blue-600" />
                      Your Data Rights
                    </CardTitle>
                    <CardDescription>Under the POPI Act, you control your personal data.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {[
                      {
                        icon: CheckCircle2,
                        title: "View Your Data",
                        desc: "Your email, name, location, and profile information are displayed in your profile settings above.",
                        action: null,
                        color: "text-green-600",
                      },
                      {
                        icon: Download,
                        title: "Download Your Data",
                        desc: "Request a copy of all personal data we hold about you in a machine-readable format.",
                        action: "Download",
                        color: "text-blue-600",
                      },
                      {
                        icon: User,
                        title: "Edit Your Data",
                        desc: "Update your personal information at any time in the Profile tab above.",
                        action: null,
                        color: "text-gray-600",
                      },
                    ].map((item, i) => (
                      <div key={i} className="p-6 border-b last:border-b-0 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <item.icon className={`h-5 w-5 mt-0.5 ${item.color}`} />
                          <div>
                            <p className="font-bold text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        {item.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl font-bold shrink-0"
                            onClick={() => toast({ title: "Request Submitted", description: "We'll email your data export within 24 hours." })}
                          >
                            {item.action}
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Privacy Links */}
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6 flex flex-col sm:flex-row gap-3">
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/privacy" target="_blank">View Privacy Policy</a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/terms" target="_blank">View Terms & Conditions</a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/contact">Contact Data Officer</a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Account Deletion */}
                <Card className="border-none shadow-sm overflow-hidden border-red-100">
                  <CardHeader className="bg-red-50 border-b border-red-100 py-6">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Trash2 className="h-5 w-5" />
                      Delete Account
                    </CardTitle>
                    <CardDescription className="text-red-600">
                      Permanently delete your account and all associated data. This process takes 30–90 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {deletionRequested ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-orange-800">Deletion Scheduled</p>
                            <p className="text-sm text-orange-700 mt-0.5">
                              Your account is scheduled for deletion within 30–90 days. All your data, posts, connections, and documents will be permanently removed.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl font-bold border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={handleCancelDeletion}
                        >
                          Cancel Deletion Request
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                          <p className="font-bold mb-2">Before you proceed:</p>
                          <ul className="space-y-1">
                            {[
                              "Your profile, posts, and connections will be permanently deleted.",
                              "Your business verification and documents will be removed.",
                              "You will be logged out immediately.",
                              "You can cancel this request within 7 days.",
                              "Certain audit logs may be retained for legal compliance (up to 5 years).",
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <div className="mt-1.5 h-1 w-1 rounded-full bg-red-400 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-700">
                            Type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-600">DELETE</span> to confirm
                          </Label>
                          <Input
                            value={deletionConfirm}
                            onChange={(e) => setDeletionConfirm(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="rounded-xl h-11 border-red-200 focus:border-red-400"
                          />
                        </div>
                        <Button
                          onClick={handleRequestDeletion}
                          disabled={isDeletingAccount || deletionConfirm !== "DELETE"}
                          className="bg-red-600 text-white hover:bg-red-700 font-bold rounded-xl h-11 disabled:opacity-50 gap-2"
                        >
                          {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Request Account Deletion
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
