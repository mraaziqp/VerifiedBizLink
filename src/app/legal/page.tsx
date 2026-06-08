import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mb-8">Legal Compliance</h1>
        
        <div className="space-y-8">
          <section className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Regulatory Compliance</h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">POPIA Compliance</h3>
                  <p className="text-sm text-gray-400">Protection of Personal Information Act (2013) - Full compliance with South African data protection legislation</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">CIPC Registration</h3>
                  <p className="text-sm text-gray-400">Companies and Intellectual Property Commission - All business registrations verified against CIPC records</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">SARS Compliance</h3>
                  <p className="text-sm text-gray-400">South African Revenue Service - Tax compliance verification for all businesses</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">Consumer Protection Act</h3>
                  <p className="text-sm text-gray-400">Full compliance with consumer rights and protection standards</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-purple-500/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Data Protection</h2>
            <div className="space-y-2 text-gray-300">
              <p>• Encrypted data transmission (HTTPS/TLS)</p>
              <p>• Secure password hashing (Bcrypt)</p>
              <p>• Regular security audits</p>
              <p>• Secure session management</p>
              <p>• Compliant with international security standards</p>
            </div>
          </section>

          <section className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-yellow-500/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Business Verification</h2>
            <div className="space-y-2 text-gray-300">
              <p><strong>All businesses on VerifiedBizLink are verified against:</strong></p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>CIPC business registration database</li>
                <li>SARS tax compliance records</li>
                <li>BEE certification where applicable</li>
                <li>Professional qualifications and licenses</li>
              </ul>
            </div>
          </section>

          <section className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-cyan-500/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Contact & Support</h2>
            <div className="space-y-4 text-gray-300">
              <p><strong>Legal Inquiries:</strong> legal@verifiedbizlink.co.za</p>
              <p><strong>Data Privacy:</strong> privacy@verifiedbizlink.co.za</p>
              <p><strong>Support:</strong> support@verifiedbizlink.co.za</p>
              <p className="text-sm text-gray-400 mt-4">We are committed to addressing all legal and compliance matters promptly and professionally.</p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <h3 className="text-xl font-bold text-green-400 mb-2">✅ Fully Compliant</h3>
            <p className="text-gray-300">VerifiedBizLink meets all South African legal and regulatory requirements for a B2B verification platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
