import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0b0f1c] text-white">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="fixed top-6 left-6 z-20 h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-6 leading-relaxed">
        <h1 className="text-3xl font-bold">Pawn Point - Privacy Policy</h1>
        <p>
          <strong>Last modified:</strong> [11/01/2026]
        </p>

        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p>
          This Privacy Policy explains how <strong>Pawn Point</strong>, operated by Bruce Gemmell ("we," "us," or "our"),
          collects, uses, stores, protects, and discloses personal information when you access or use our website,
          applications, and related services (collectively, the "Platform").
        </p>
        <p>
          We are committed to protecting your personal information in accordance with the{" "}
          <strong>Protection of Personal Information Act, 4 of 2013 ("POPIA")</strong> and other applicable South
          African laws.
        </p>
        <p>This Privacy Policy applies to information we collect:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Directly through the Platform;</li>
          <li>Through electronic communications between you and us; and</li>
          <li>Through our official social media pages where you choose to engage with us.</li>
        </ul>
        <p>This Policy does <strong>not</strong> apply to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Information collected offline; or</li>
          <li>Information collected by third parties not controlled by us, even if accessed through the Platform.</li>
        </ul>
        <p>By using the Platform, you agree to the practices described in this Privacy Policy.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">2. Information We Collect</h2>
        <p>We may collect the following categories of information:</p>

        <h3 className="text-lg font-semibold">2.1 Personal Information</h3>
        <p>Information that identifies you directly or indirectly, including:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Name</li>
          <li>Email address</li>
          <li>Account login details</li>
          <li>Any information you submit when creating an account or contacting us</li>
        </ul>

        <h3 className="text-lg font-semibold">2.2 Platform Usage Information</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Courses or lessons accessed or completed</li>
          <li>Progress, activity logs, and engagement data</li>
          <li>Content you upload or publish (such as courses)</li>
        </ul>

        <h3 className="text-lg font-semibold">2.3 Technical and Usage Data</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>IP address</li>
          <li>Device type, browser type, and operating system</li>
          <li>Pages visited, time spent, and interaction patterns</li>
        </ul>

        <h3 className="text-lg font-semibold">2.4 Aggregated and Anonymised Data</h3>
        <p>Statistical or analytical data that cannot reasonably be linked to an identifiable individual.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">3. How We Collect Information</h2>
        <h3 className="text-lg font-semibold">3.1 Information You Provide</h3>
        <p>We collect information when you:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Register for an account</li>
          <li>Upload or publish content (including courses)</li>
          <li>Contact us for support or enquiries</li>
          <li>Communicate with us via email or social platforms</li>
        </ul>

        <h3 className="text-lg font-semibold">3.2 Automatic Collection</h3>
        <p>We automatically collect certain technical data using:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Cookies</li>
          <li>Local storage</li>
          <li>Server logs</li>
          <li>Analytics tools</li>
        </ul>
        <p>These help us understand how the Platform is used and improve performance.</p>

        <h3 className="text-lg font-semibold">3.3 Third-Party Sources</h3>
        <p>We may receive limited information from:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Payment processors (e.g. PayPal - confirmation data only)</li>
          <li>Hosting, analytics, or infrastructure providers</li>
        </ul>
        <p>
          We do <strong>not</strong> control how third parties collect or use your information, and their practices are
          governed by their own privacy policies.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">4. How We Use Your Information</h2>
        <p>We use personal information to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide and operate the Platform</li>
          <li>Create and manage user accounts</li>
          <li>Deliver services and features you request</li>
          <li>Communicate with you about your account or subscriptions</li>
          <li>Improve functionality, security, and user experience</li>
          <li>Enforce our Terms of Use</li>
          <li>Comply with legal and regulatory obligations</li>
        </ul>
        <p>We do <strong>not</strong> sell personal information.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">5. Cookies</h2>
        <p>Cookies are small data files stored on your device.</p>
        <p>We use:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Essential cookies</strong> - required for core functionality, security, and authentication</li>
          <li><strong>Analytics cookies</strong> - help us understand platform usage and improve services</li>
        </ul>
        <p>You may manage cookie preferences through your browser or any cookie banner provided on the Platform.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">6. Your Rights Under South African Law</h2>
        <p>Under POPIA, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Access</strong> your personal information</li>
          <li><strong>Correct</strong> inaccurate or outdated information</li>
          <li><strong>Request deletion</strong> of your personal information (subject to legal requirements)</li>
          <li><strong>Object</strong> to certain types of processing</li>
          <li><strong>Withdraw consent</strong> where processing is based on consent</li>
        </ul>
        <p>To exercise these rights, contact us at <strong>[PRIVACY EMAIL]</strong>.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">7. Children and Minors (13+)</h2>
        <p>The Platform is intended for users 13 <strong>years and older</strong>.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Users under 18 must have <strong>parental or guardian consent</strong>.</li>
          <li>We do not knowingly collect personal information from children under 13.</li>
          <li>If such information is discovered, it will be deleted promptly.</li>
        </ul>
        <p>
          If you believe a child under 13 has provided personal information, contact us at officialpawnpoint@gmail.com.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">8. Disclosure of Information</h2>
        <p>We may disclose personal information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To service providers who assist us in operating the Platform (under confidentiality obligations)</li>
          <li>If required by law, court order, or regulatory authority</li>
          <li>To protect our legal rights, users, or the integrity of the Platform</li>
          <li>In connection with a business transfer (e.g. sale, restructuring), subject to confidentiality safeguards</li>
        </ul>
        <p>We may also share <strong>aggregated or anonymised data</strong> that does not identify individuals.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">9. Accessing and Correcting Your Information</h2>
        <p>You may:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Review and update your information through your account settings; or</li>
          <li>Request access, correction, or deletion by emailing <strong>[PRIVACY EMAIL]</strong>.</li>
        </ul>
        <p>Please note:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Deleting personal information may require deletion of your account</li>
          <li>Content you publish (such as courses) may persist in backups or cached systems for a limited time</li>
        </ul>

        <div>---</div>

        <h2 className="text-xl font-semibold">10. Data Security</h2>
        <p>We implement reasonable technical and organisational safeguards, including:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Encrypted connections (SSL/TLS)</li>
          <li>Secure servers and access controls</li>
          <li>Limited access to personal information</li>
        </ul>
        <p>We do <strong>not</strong> store or process payment card details. Payments are handled directly by <strong>PayPal</strong>.</p>
        <p>No system is completely secure, and you use the Platform at your own risk.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">11. Cross-Border Data Transfers</h2>
        <p>Your information may be stored or processed outside South Africa (for example, on cloud servers).</p>
        <p>Where personal information is transferred outside South Africa, we ensure that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The recipient is subject to laws, agreements, or safeguards that provide protection substantially similar to POPIA; or</li>
          <li>You have consented to the transfer; or</li>
          <li>The transfer is legally required or necessary for service delivery.</li>
        </ul>

        <div>---</div>

        <h2 className="text-xl font-semibold">12. Retention of Information</h2>
        <p>We retain personal information only for as long as necessary to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Fulfil the purposes described in this Policy</li>
          <li>Comply with legal, accounting, or regulatory obligations</li>
          <li>Resolve disputes or enforce agreements</li>
        </ul>
        <p>You may request deletion at any time, subject to lawful retention requirements.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">13. Automatic Account Deletion</h2>
        <p>Accounts may be considered inactive after <strong>6 months</strong> of no activity.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Accounts with purchases</strong> may be retained for legal, billing, or compliance purposes.</li>
          <li>Prior to deletion, we may notify you using your registered email address.</li>
        </ul>

        <div>---</div>

        <h2 className="text-xl font-semibold">14. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Updates will be posted on this page, and material changes
          may be communicated via email or Platform notice.
        </p>
        <p>Your continued use of the Platform after updates means you accept the revised Privacy Policy.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">Contact Information</h2>
        <p><strong>Pawn Point</strong></p>
        <p>Operated by: Bruce Gemmell</p>
        <p>
          <strong>Email:</strong> officialpawnpoint@gmail.com
        </p>
        <p><strong>Location:</strong> Republic of South Africa</p>
      </div>
    </div>
  );
}
