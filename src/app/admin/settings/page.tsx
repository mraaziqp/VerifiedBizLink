import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminCredentialManager } from "@/components/admin/admin-credential-manager";

export const metadata: Metadata = {
  title: "Admin Settings | VerifiedBizLink",
  description: "Manage your admin account settings and credentials",
};

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
        </div>
      </div>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <AdminCredentialManager />
      </div>
    </div>
  );
}
