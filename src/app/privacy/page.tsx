import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none">
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
              <p>VerifiedBizLink ("we" or "us" or "our") operates the website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Information Collection and Use</h2>
              <p>We collect several different types of information for various purposes to provide and improve our service:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li><strong>Personal Data:</strong> Email address, first name, last name, business information, location data</li>
                <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, time spent on pages</li>
                <li><strong>Cookies:</strong> Session tokens for authentication and user preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Use of Data</h2>
              <p>VerifiedBizLink uses the collected data for various purposes:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>To provide and maintain our service</li>
                <li>To notify you about changes to our service</li>
                <li>To allow you to participate in interactive features</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information so we can improve our service</li>
                <li>To monitor the usage of our service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Security of Data</h2>
              <p>The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. POPIA Compliance</h2>
              <p>VerifiedBizLink is committed to compliance with the Protection of Personal Information Act, 2013 (POPIA). We process personal information lawfully, fairly, and transparently, and we maintain appropriate safeguards to protect your data.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Children's Privacy</h2>
              <p>Our service does not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from children under 18. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Changes to This Privacy Policy</h2>
              <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the bottom of this Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at: privacy@verifiedbizlink.co.za</p>
            </section>

            <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm">Last updated: June 8, 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
