"use client";

import { useState, useEffect } from "react";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { MessageSquare, Search, Loader2, UserCheck, UserX, UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  connected_user_id: string;
  full_name: string;
  headline: string;
  avatar_url: string;
  company_name: string;
  business_status: string;
  status: string;
  is_requester: boolean;
}

export default function NetworkPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnections = () => {
    setLoading(true);
    fetch('/api/connections')
      .then(r => r.ok ? r.json() : { connections: [] })
      .then(data => setConnections(data.connections || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConnections(); }, []);

  const accepted = connections.filter(c => c.status === 'accepted');
  const pending = connections.filter(c => c.status === 'pending');
  const incomingPending = pending.filter(c => !c.is_requester);
  const outgoingPending = pending.filter(c => c.is_requester);

  const filtered = accepted.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAccept = async (connId: string, connUserId: string, name: string) => {
    setActioning(connId);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', receiverId: connUserId }),
      });
      if (res.ok) {
        toast({ title: "Connection Accepted", description: `You are now connected with ${name}.` });
        fetchConnections();
      }
    } catch { toast({ title: "Failed to accept", variant: "destructive" }); }
    finally { setActioning(null); }
  };

  const handleRemove = async (connId: string, name: string) => {
    setActioning(connId);
    try {
      const res = await fetch('/api/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connId }),
      });
      if (res.ok) {
        toast({ title: "Connection Removed", description: `${name} has been removed from your network.` });
        fetchConnections();
      }
    } catch { toast({ title: "Failed to remove", variant: "destructive" }); }
    finally { setActioning(null); }
  };

  const handleMessage = (name: string) => {
    toast({ title: "Coming Soon", description: `Direct messaging with ${name} will be available soon.` });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="hidden md:block md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-6 gap-3">
                <div>
                  <CardTitle className="text-2xl font-bold">My Network</CardTitle>
                  <p className="text-sm text-gray-500 mt-1 font-medium">
                    {loading ? "Loading..." : `${accepted.length} connection${accepted.length !== 1 ? 's' : ''}${incomingPending.length > 0 ? ` · ${incomingPending.length} pending request${incomingPending.length > 1 ? 's' : ''}` : ''}`}
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search connections..."
                    className="pl-10 rounded-xl"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-6 gap-6">
                    <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">
                      All ({accepted.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">
                      Pending {incomingPending.length > 0 && <span className="ml-1.5 bg-primary text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{incomingPending.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold px-0">
                      Sent ({outgoingPending.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Accepted Connections */}
                  <TabsContent value="all" className="p-6 focus-visible:ring-0 mt-0">
                    {loading ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 font-medium">
                        {search ? "No connections match your search." : "No connections yet. Discover and connect with businesses."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filtered.map((conn) => (
                          <div key={conn.id} className="flex items-center justify-between p-4 bg-white border rounded-2xl hover:border-primary/50 transition-all group">
                            <div className="flex items-center gap-4 min-w-0">
                              <Avatar className="h-14 w-14 shrink-0">
                                <AvatarImage src={conn.avatar_url} />
                                <AvatarFallback>{conn.full_name?.[0] ?? '?'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-gray-900 truncate">{conn.full_name}</h4>
                                  {conn.business_status === 'verified' && <GoldCheckmark />}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">
                                  {conn.headline || conn.company_name || "Professional"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="rounded-full text-gray-400 hover:text-primary hover:bg-primary/5"
                                onClick={() => handleMessage(conn.full_name)}
                                title="Send message"
                              >
                                <MessageSquare className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                                onClick={() => handleRemove(conn.id, conn.full_name)}
                                disabled={actioning === conn.id}
                                title="Remove connection"
                              >
                                {actioning === conn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-5 w-5" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Incoming Pending */}
                  <TabsContent value="pending" className="p-6 focus-visible:ring-0 mt-0">
                    {incomingPending.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 font-medium">No incoming connection requests.</div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {incomingPending.map((conn) => (
                          <div key={conn.id} className="flex items-center justify-between p-4 bg-white border border-primary/20 rounded-2xl">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-14 w-14">
                                <AvatarImage src={conn.avatar_url} />
                                <AvatarFallback>{conn.full_name?.[0] ?? '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-bold text-gray-900">{conn.full_name}</h4>
                                <p className="text-xs text-gray-500 font-medium">{conn.company_name || conn.headline}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-primary text-gray-900 hover:bg-yellow-400 rounded-xl font-bold gap-1"
                                onClick={() => handleAccept(conn.id, conn.connected_user_id, conn.full_name)}
                                disabled={actioning === conn.id}
                              >
                                {actioning === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 gap-1"
                                onClick={() => handleRemove(conn.id, conn.full_name)}
                                disabled={actioning === conn.id}
                              >
                                <UserX className="h-3 w-3" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Outgoing Pending */}
                  <TabsContent value="sent" className="p-6 focus-visible:ring-0 mt-0">
                    {outgoingPending.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 font-medium">No sent requests awaiting response.</div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {outgoingPending.map((conn) => (
                          <div key={conn.id} className="flex items-center justify-between p-4 bg-white border rounded-2xl">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-14 w-14">
                                <AvatarImage src={conn.avatar_url} />
                                <AvatarFallback>{conn.full_name?.[0] ?? '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-bold text-gray-900">{conn.full_name}</h4>
                                <p className="text-xs text-gray-500 font-medium">{conn.company_name || conn.headline}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-bold text-gray-500 hover:text-red-600 hover:border-red-200"
                              onClick={() => handleRemove(conn.id, conn.full_name)}
                              disabled={actioning === conn.id}
                            >
                              {actioning === conn.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Withdraw
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
