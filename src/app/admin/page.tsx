
"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { VettingDesk } from "@/components/admin/vetting-desk";
import { ComplianceLegal } from "@/components/admin/compliance-legal";
import { SystemOps } from "@/components/admin/system-ops";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Scale, Terminal } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Master Hub</h1>
              <p className="text-gray-500 font-medium">Switch between departmental views to manage VerifiedBizLink</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Active Admin</p>
              <p className="text-sm font-bold text-primary">Chief Systems Architect</p>
            </div>
          </div>

          <Tabs defaultValue="vetting" className="w-full space-y-8">
            <TabsList className="bg-white border p-1 rounded-2xl h-16 shadow-sm w-full md:w-fit">
              <TabsTrigger value="vetting" className="h-14 px-8 rounded-xl font-bold flex gap-3 data-[state=active]:bg-primary data-[state=active]:text-gray-900">
                <Building2 className="h-5 w-5" />
                Vetting Desk (Banker)
              </TabsTrigger>
              <TabsTrigger value="compliance" className="h-14 px-8 rounded-xl font-bold flex gap-3 data-[state=active]:bg-primary data-[state=active]:text-gray-900">
                <Scale className="h-5 w-5" />
                Compliance (Lawyer)
              </TabsTrigger>
              <TabsTrigger value="ops" className="h-14 px-8 rounded-xl font-bold flex gap-3 data-[state=active]:bg-primary data-[state=active]:text-gray-900">
                <Terminal className="h-5 w-5" />
                System Ops (Dev)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vetting" className="animate-in fade-in duration-500">
              <VettingDesk />
            </TabsContent>
            
            <TabsContent value="compliance" className="animate-in fade-in duration-500">
              <ComplianceLegal />
            </TabsContent>
            
            <TabsContent value="ops" className="animate-in fade-in duration-500">
              <SystemOps />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
