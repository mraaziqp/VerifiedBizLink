import { SubpageNav } from "@/components/layout/subpage-nav";
import { CheckCircle2, ShieldCheck, Lock, FileCheck, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SubpageNav title="Legal & Compliance" />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Legal &amp; Regulatory Compliance</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            VerifiedBizLink operates in full alignment with the statutory compliance standards of the Republic of South Africa.
          </p>
        </div>
        
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Regulatory Framework</h2>
                <p className="text-xs text-slate-500">Statutory and governmental verification authorities</p>
              </div>
            </div>
            
            <div className="space-y-4 text-slate-700">
              <div className="flex gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">POPIA Compliance (Act No. 4 of 2013)</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Protection of Personal Information Act — full compliance with South African data protection principles, lawful data processing, and transparent consent.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">CIPC Corporate Verification</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Companies and Intellectual Property Commission — business registration credentials, company names, and active statuses verified directly against enterprise registers.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">SARS Tax Compliance</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    South African Revenue Service — tax compliance status and PIN validation to ensure companies are in good standing with fiscal authorities.
                  </p>
                </div>
              </div>
              <div className="flex gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Consumer Protection Act (Act No. 68 of 2008)</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Rigorous standards safeguarding consumer rights, commercial transparency, fair transaction disclosures, and dispute mitigation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Data Protection &amp; Cryptography</h2>
                <p className="text-xs text-slate-500">Security protocols and cryptographic validation</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900">Encrypted Transmission</p>
                <p className="text-slate-600 mt-1">Enforced HTTPS/TLS 1.3 encryption across all network and API endpoints.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900">Cryptographic Signatures</p>
                <p className="text-slate-600 mt-1">HMAC-SHA256 authentication tokens and immutable certificate verification checks.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900">Secure Credential Storage</p>
                <p className="text-slate-600 mt-1">Multi-round salted password hashing with zero plain-text credential persistence.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-900">Audit &amp; Access Controls</p>
                <p className="text-slate-600 mt-1">Strict role-based session isolation and timestamped administrative action logs.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Business Verification Standard</h2>
                <p className="text-xs text-slate-500">Requirements for verified badge issuance</p>
              </div>
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <p>All verified businesses on VerifiedBizLink undergo structured screening:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-600 pl-1">
                <li>Active CIPC registration cross-referenced against company registers</li>
                <li>SARS tax compliance pin and valid business tax reference</li>
                <li>B-BBEE certificate / sworn affidavit validation where applicable</li>
                <li>Physical address confirmation and authorized representative identity verification</li>
              </ul>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Legal Contact &amp; Officer Information</h2>
                <p className="text-xs text-slate-500">Direct inquiries to our legal compliance office</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For legal notices, PAIA requests, or compliance inquiries, please reach out to our legal department at{' '}
              <a href="mailto:info@verifiedbizlink.co.za" className="font-bold text-slate-900 underline underline-offset-4">
                info@verifiedbizlink.co.za
              </a>
              . All statutory communications are processed within standard operational timeframes.
            </p>
          </section>

          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <div className="inline-flex items-center gap-2 text-emerald-800 font-extrabold text-base sm:text-lg mb-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Verified &amp; Certified Operations
            </div>
            <p className="text-xs sm:text-sm text-emerald-700 max-w-xl mx-auto leading-relaxed">
              VerifiedBizLink maintains rigorous South African legal and regulatory conformance across trust, consumer protection, and enterprise verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
