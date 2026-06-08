import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mb-8">Terms & Conditions</h1>
        <div className="prose prose-invert max-w-none">
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing and using VerifiedBizLink, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Use License</h2>
              <p>Permission is granted to temporarily download one copy of the materials (information or software) on VerifiedBizLink for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on the platform</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Disclaimer</h2>
              <p>The materials on VerifiedBizLink are provided on an 'as is' basis. VerifiedBizLink makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Limitations</h2>
              <p>In no event shall VerifiedBizLink or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on VerifiedBizLink.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Accuracy of Materials</h2>
              <p>The materials appearing on VerifiedBizLink could include technical, typographical, or photographic errors. VerifiedBizLink does not warrant that any of the materials on its website are accurate, complete, or current. VerifiedBizLink may make changes to the materials contained on its website at any time without notice.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Links</h2>
              <p>VerifiedBizLink has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by VerifiedBizLink of the site. Use of any such linked website is at the user's own risk.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Modifications</h2>
              <p>VerifiedBizLink may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Governing Law</h2>
              <p>These terms and conditions are governed by and construed in accordance with the laws of South Africa, and you irrevocably submit to the exclusive jurisdiction of the courts located in South Africa.</p>
            </section>

            <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm">Last updated: June 8, 2026</p>
              <p className="text-sm mt-2">For questions, contact: legal@verifiedbizlink.co.za</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
