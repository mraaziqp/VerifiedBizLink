"use client";

import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, FileCheck, Search, Building, ArrowRight, AlertCircle } from "lucide-react";

export default function VettingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="md:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="md:col-span-9 space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vetting Hub</h1>
                  <p className="text-gray-600 font-medium">Verify your business to unlock premium features and higher trust scores.</p>
                </div>
              </div>
              <Button className="bg-gray-900 text-white hover:bg-black rounded-xl px-8 h-12 font-bold">
                Start New Vetting
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Current Status */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Current Business Status</CardTitle>
                      <Badge className="bg-green-100 text-green-700 font-bold px-3">Verified Gold</Badge>
                    </div>
                    <CardDescription>Your last audit was conducted on March 12, 2024</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-500">Validation Progress</span>
                        <span className="text-primary">98% Complete</span>
                      </div>
                      <Progress value={98} className="h-2.5 bg-gray-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Entity Verification</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          Passed
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-dashed flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Compliance Review</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          Passed
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Required Documentation</CardTitle>
                    <CardDescription>Keep these updated to maintain your verification status.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {[
                      { name: "CIPC Registration Certificate", status: "Valid", date: "Expires 2025" },
                      { name: "VAT Compliance Letter", status: "Valid", date: "Expires 2024" },
                      { name: "Identity Proof of Directors", status: "Verified", date: "Permanent" },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-6 border-t first:border-t-0 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-lg">
                            <Building className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{doc.date}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-green-200 text-green-600 bg-green-50 font-bold">{doc.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card className="bg-gray-900 text-white border-none shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold">Why Vetting Matters</h3>
                    <div className="space-y-3">
                      {[
                        "Unlock Global Trade Networks",
                        "Higher Placement in Search",
                        "Instant Trust with Partners",
                        "Exclusive Premium Groups"
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 rounded-xl">
                      Learn More <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>

                <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-yellow-700 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Pending Action
                  </div>
                  <p className="text-xs text-yellow-600 font-medium">Your tax clearance certificate will expire in 14 days. Upload a new version to avoid a score drop.</p>
                  <Button variant="link" className="text-xs text-yellow-700 font-bold p-0 h-auto justify-start underline">Upload Now</Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
