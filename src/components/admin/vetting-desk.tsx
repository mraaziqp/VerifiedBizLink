
"use client";

import { FileText, CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PENDING_VETTINGS = [
  {
    id: "VT-9021",
    business: "Neon Dynamics",
    category: "Software",
    submitted: "2h ago",
    status: "Pending",
    docs: ["CIPC_Reg.pdf", "Tax_Clearance.pdf"]
  },
  {
    id: "VT-9022",
    business: "Global Logistics Ltd",
    category: "Supply Chain",
    submitted: "5h ago",
    status: "Reviewing",
    docs: ["Identity_CEO.pdf", "Warehouse_Cert.pdf"]
  },
  {
    id: "VT-9023",
    business: "Solar Flare Energy",
    category: "Renewables",
    submitted: "1d ago",
    status: "Pending",
    docs: ["Compliance_Audit.pdf"]
  }
];

export function VettingDesk() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vetting Desk</h2>
          <p className="text-gray-500 font-medium text-sm">Reviewing 12 pending business applications</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 px-3 py-1 font-bold">8 Priority</Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold">4 Regular</Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold">Business</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Docs</TableHead>
              <TableHead className="font-bold">Submitted</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PENDING_VETTINGS.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{item.business}</span>
                    <span className="text-xs text-gray-500">{item.category} • {item.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={item.status === "Reviewing" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"}>
                    <Clock className="h-3 w-3 mr-1" />
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {item.docs.map(doc => (
                      <div key={doc} className="p-1.5 bg-gray-100 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer" title={doc}>
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 font-medium">{item.submitted}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
