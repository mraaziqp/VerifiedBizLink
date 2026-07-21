import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, Users, TrendingUp, Building2 } from "lucide-react";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Trust First",
    description: "Every verified business on our platform has been through real due diligence — CIPC registration, SARS compliance, and document review by our team. Trust isn't a badge we hand out, it's earned.",
  },
  {
    icon: Users,
    title: "Real Connections",
    description: "We built VerifiedBizLink to make B2B networking in South Africa easier and safer — connecting business owners with partners, suppliers, and customers they can actually trust.",
  },
  {
    icon: TrendingUp,
    title: "Growth Focused",
    description: "From your first verified profile to running sponsored ad campaigns, every tool on the platform is built to help your business get discovered and grow.",
  },
];

export default async function AboutPage() {
  const [verifiedRow] = await db`SELECT COUNT(*)::int AS count FROM businesses WHERE status = 'verified'`.catch(() => [{ count: 0 }]);

  const stats = [
    { label: "Verified Businesses", value: `${verifiedRow?.count ?? 0}` },
    { label: "Verification Turnaround", value: "3–7 days" },
    { label: "POPI Act", value: "Compliant" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About VerifiedBizLink</h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            VerifiedBizLink is South Africa's verification-first business network — a platform built to help
            genuine, compliant businesses find each other, connect, and grow with confidence.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Our Mission</h2>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              South Africa has a huge number of legitimate, hard-working businesses — and an equally large problem
              with fraud, fake suppliers, and unverified operators making it hard to know who you can actually trust.
              VerifiedBizLink exists to fix that: a place where verification is real, trust scores mean something,
              and business owners can connect without the guesswork.
            </p>
            <p>
              We handle the due diligence — CIPC registration checks, SARS tax compliance, identity verification,
              and document review — so businesses on our platform can focus on what they do best: doing business.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">What We Do</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <Building2 className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <span>Verify businesses against CIPC and SARS records, and issue a public Trust Score and Gold Verification badge.</span>
            </li>
            <li className="flex gap-3">
              <Users className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <span>Connect business owners directly — messaging, posts, and a searchable network of verified profiles.</span>
            </li>
            <li className="flex gap-3">
              <TrendingUp className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <span>Give businesses the tools to grow their visibility — customizable public profiles, galleries, and sponsored ad campaigns.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <span>Keep everything POPI Act compliant — your data is protected, and we never sell it.</span>
            </li>
          </ul>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-cyan-400 mb-6">What We Stand For</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((value) => (
              <div key={value.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <value.icon className="h-8 w-8 text-yellow-500 mb-3" />
                <h3 className="font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Ready to get verified?</h2>
          <p className="text-gray-400 mb-6">Join hundreds of businesses building trust on VerifiedBizLink.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/signup">
              <Button className="bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold">
                Create Your Free Profile
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">Contact Us</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
