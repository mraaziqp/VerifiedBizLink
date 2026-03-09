"use client";

import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Bell, CreditCard, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 px-2">Settings</h1>

            <Tabs defaultValue="profile" className="w-full space-y-6">
              <TabsList className="bg-white border p-1 rounded-2xl h-14 shadow-sm w-full md:w-fit">
                <TabsTrigger value="profile" className="h-12 px-6 rounded-xl font-bold gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="h-12 px-6 rounded-xl font-bold gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="h-12 px-6 rounded-xl font-bold gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="billing" className="h-12 px-6 rounded-xl font-bold gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your public profile and contact details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input defaultValue="Sarah Jenkins" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input defaultValue="sarah@nexgen.com" disabled className="rounded-xl h-11 bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Professional Headline</Label>
                        <Input defaultValue="CEO at NexGen Solutions" className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input defaultValue="Cape Town, South Africa" className="rounded-xl h-11" />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl">
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Login & Security</CardTitle>
                    <CardDescription>Secure your account with multi-factor authentication.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-6 border-b flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div>
                        <p className="font-bold text-gray-900">Change Password</p>
                        <p className="text-xs text-gray-500 font-medium">Update your account password regularly for security</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary" />
                    </div>
                    <div className="p-6 border-b flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-bold text-gray-900">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 font-medium">Add an extra layer of security to your account</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-bold text-gray-900 text-red-600">Deactivate Account</p>
                        <p className="text-xs text-gray-500 font-medium">Temporarily disable your profile from search</p>
                      </div>
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl">Deactivate</Button>
                    </div>
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
