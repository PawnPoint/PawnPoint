import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
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
        <h1 className="text-3xl font-bold">Pawn Point - Cookie Policy</h1>
        <p>
          <strong>Last modified:</strong> [11/01/2026]
        </p>

        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p>
          This Cookie Policy explains how <strong>Pawn Point</strong>, operated by Bruce Gemmell ("we," "us," or "our"),
          uses cookies and similar technologies on our website and services (the "Platform").
        </p>
        <p>
          By using the Platform, you agree to our use of cookies as described in this Policy. This Cookie Policy should
          be read together with our <strong>Privacy Policy</strong>.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">2. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are placed on your device (computer, mobile phone, or tablet) when you visit
          a website. They help websites function properly, remember preferences, and improve performance.
        </p>
        <p>
          In addition to cookies, we may use <strong>similar technologies</strong> such as local storage, session
          storage, or authentication tokens to operate and secure the Platform.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">3. Why We Use Cookies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Ensure the Platform functions correctly</li>
          <li>Keep users logged in securely</li>
          <li>Protect accounts and prevent abuse</li>
          <li>Improve performance and reliability</li>
          <li>Understand general usage patterns so we can improve the Platform</li>
        </ul>
        <p>We do <strong>not</strong> use cookies for targeted advertising.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">4. Types of Cookies We Use</h2>
        <h3 className="text-lg font-semibold">4.1 Essential Cookies</h3>
        <p>These cookies are <strong>strictly necessary</strong> for the Platform to work. They enable core features such as:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Account login and authentication</li>
          <li>Security and fraud prevention</li>
          <li>Session management</li>
        </ul>
        <p>Without these cookies, the Platform cannot operate properly.</p>

        <h3 className="text-lg font-semibold">4.2 Performance and Analytics Cookies</h3>
        <p>These cookies help us understand how users interact with the Platform, such as:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Which pages are visited most</li>
          <li>How the Platform performs</li>
          <li>Whether errors occur</li>
        </ul>
        <p>The information collected is <strong>aggregated</strong> and used only to improve functionality and user experience.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">5. Third-Party Cookies</h2>
        <p>Some cookies or similar technologies may be set by trusted third-party services that support the Platform, such as:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Hosting and infrastructure providers</strong></li>
          <li><strong>Analytics or performance monitoring tools</strong></li>
          <li><strong>Payment providers</strong> (e.g. PayPal, for transaction processing only)</li>
        </ul>
        <p>
          We do not control how third parties manage their cookies. Their use of cookies is governed by their own
          privacy and cookie policies.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">6. Managing Cookies</h2>
        <p>
          Because we currently use cookies only for <strong>essential functionality and basic analytics</strong>, we do{" "}
          <strong>not</strong> require a cookie consent banner under South African law.
        </p>
        <p>You can still control cookies by:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Adjusting your browser settings to block or delete cookies</li>
          <li>Using private or incognito browsing modes</li>
        </ul>
        <p>
          Please note that disabling cookies may affect your ability to log in or use certain features of the Platform.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">7. External Websites</h2>
        <p>
          The Platform may contain links to third-party websites. We are not responsible for the cookie practices of
          those external sites. We encourage you to review their cookie and privacy policies separately.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">8. Changes to This Cookie Policy</h2>
        <p>
          We may update this Cookie Policy from time to time. Any changes will be posted on this page, and the "Last
          modified" date will be updated accordingly.
        </p>
        <p>Your continued use of the Platform after changes are made means you accept the updated Policy.</p>

        <div>---</div>

        <h2 className="text-xl font-semibold">Contact Information</h2>
        <p>If you have any questions about this Cookie Policy, please contact us at:</p>
        <p>
          <strong>Email:</strong> Please contact officialpawnpoint@gmail.com
        </p>
        <p>
          <strong>Operator:</strong> Bruce Gemmell
        </p>
        <p>
          <strong>Location:</strong> Republic of South Africa
        </p>
      </div>
    </div>
  );
}
