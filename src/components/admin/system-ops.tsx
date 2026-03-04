
"use client";

import { Cpu, Database, Cloud, Terminal, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SystemOps() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Operations</h2>
        <Button size="sm" className="gap-2 bg-gray-900 text-white rounded-xl">
          <RefreshCw className="h-4 w-4" />
          Purge Cache
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DB Status */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-2xl">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700 font-bold">Connected</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Neon DB Cluster</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Region: aws-us-east-1</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Active Connections</span>
                <span className="text-gray-900">128 / 500</span>
              </div>
              <Progress value={25} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Vercel Storage */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <Cloud className="h-6 w-6 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 font-bold">Healthy</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Blob Storage</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Usage: Document Repository</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Storage Limit</span>
                <span className="text-gray-900">4.2GB / 10GB</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Server Metrics */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-2xl">
                <Cpu className="h-6 w-6 text-yellow-600" />
              </div>
              <Badge className="bg-yellow-100 text-yellow-700 font-bold">Stable</Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Server Health</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">Load Average: 0.42</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>CPU Usage</span>
                <span className="text-gray-900">18%</span>
              </div>
              <Progress value={18} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Error Logs */}
      <Card className="shadow-sm border-none overflow-hidden">
        <CardHeader className="bg-gray-900 text-white flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Live System Error Log
          </CardTitle>
          <div className="flex gap-2">
             <div className="flex items-center gap-1.5 text-xs text-red-400">
               <AlertTriangle className="h-3 w-3" />
               <span>2 Critical</span>
             </div>
             <div className="flex items-center gap-1.5 text-xs text-green-400">
               <CheckCircle2 className="h-3 w-3" />
               <span>All systems go</span>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-gray-950 font-mono text-xs">
          <div className="p-4 space-y-2 text-gray-400">
            <p className="text-red-400"><span className="text-gray-600">[2024-03-20 14:02:11]</span> ERROR: Connection timeout to /api/vetting/fetch-v2</p>
            <p><span className="text-gray-600">[2024-03-20 14:01:45]</span> INFO: User 0x921 registered as Business Entity</p>
            <p className="text-yellow-400"><span className="text-gray-600">[2024-03-20 13:58:20]</span> WARN: Slow response detected from Unsplash proxy (820ms)</p>
            <p><span className="text-gray-600">[2024-03-20 13:55:12]</span> INFO: Vetting report VT-9020 generated for 'Arctic Logistics'</p>
            <p className="text-red-400"><span className="text-gray-600">[2024-03-20 13:52:05]</span> CRITICAL: Failed to write to audit_logs collection (Permission Denied)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
