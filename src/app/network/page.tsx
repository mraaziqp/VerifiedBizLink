"use client";

import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { MessageSquare, UserMinus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const CONNECTIONS = [
  { name: "Robert Fox", role: "Supply Chain Manager", company: "Fox Logistics", avatar: "https://picsum.photos/seed/net1/200/200" },
  { name: "Kristin Watson", role: "Operations Lead", company: "Watson Industries", avatar: "https://picsum.photos/seed/net2/200/200" },
  { name: "Guy Hawkins", role: "CEO", company: "Skyline Partners", avatar: "https://picsum.photos/seed/net3/200/200" },
  { name: "Jane Cooper", role: "CTO", company: "Tech Flow", avatar: "https://picsum.photos/seed/net4/200/200" },
  { name: "Cody Fisher", role: "Senior Analyst", company: "Data Peak", avatar: "https://picsum.photos/seed/net5/200/200" },
];

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-6">
                <div>
                  <CardTitle className="text-2xl font-bold">My Network</CardTitle>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage your 1.2k professional connections</p>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search connections..." className="pl-10 rounded-xl" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-6 gap-6">
                    <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">All Connections</TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">Pending (8)</TabsTrigger>
                    <TabsTrigger value="groups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">Business Groups</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="p-6 focus-visible:ring-0 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {CONNECTIONS.map((conn, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border rounded-2xl hover:border-primary/50 transition-all group">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={conn.avatar} />
                              <AvatarFallback>{conn.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-gray-900">{conn.name}</h4>
                                <GoldCheckmark />
                              </div>
                              <p className="text-xs text-gray-500 font-medium">{conn.role} at {conn.company}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-primary hover:bg-primary/5">
                              <MessageSquare className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50">
                              <UserMinus className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
