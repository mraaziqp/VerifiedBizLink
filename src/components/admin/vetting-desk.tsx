
"use client";

import { FileText, CheckCircle2, XCircle, Clock, Info, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";

export function VettingDesk() {
  const db = useFirestore();
  const businessesRef = db ? collection(db, "businesses") : null;
  const businessesQuery = businessesRef ? query(businessesRef, orderBy("submittedAt", "desc")) : null;
  const { data: businesses, loading } = useCollection(businessesQuery);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return;
    const businessDoc = doc(db, "businesses", id);
    await updateDoc(businessDoc, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Fetching verification queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vetting Desk</h2>
          <p className="text-gray-500 font-medium text-sm">Reviewing {businesses?.length || 0} pending business applications</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 px-3 py-1 font-bold">
            {businesses?.filter(b => b.status === 'pending').length || 0} New
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-bold">
            {businesses?.filter(b => b.status === 'verified').length || 0} Verified
          </Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold">Business</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Registration</TableHead>
              <TableHead className="font-bold">Submitted</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses?.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{item.companyName}</span>
                    <span className="text-xs text-gray-500">{item.industry || "General B2B"} • {item.id.slice(0, 8)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={
                    item.status === "verified" ? "bg-green-100 text-green-700 hover:bg-green-100" : 
                    item.status === "reviewing" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : 
                    "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                  }>
                    <Clock className="h-3 w-3 mr-1" />
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-mono text-gray-600">{item.regNumber}</span>
                </TableCell>
                <TableCell className="text-gray-600 font-medium">
                  {item.submittedAt?.toDate?.().toLocaleDateString() || "Recently"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    onClick={() => handleUpdateStatus(item.id, "reviewing")}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    onClick={() => handleUpdateStatus(item.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                    onClick={() => handleUpdateStatus(item.id, "verified")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {businesses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-gray-400 font-medium">
                  No pending vettings in the queue.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
