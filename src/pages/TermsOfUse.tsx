import { ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
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
        <h1 className="text-3xl font-bold">Terms of use</h1>
        <h2 className="text-2xl font-bold">Pawn Point — Terms of Use</h2>
        <p>
          <strong>Last modified:</strong> [11/01/2026]
        </p>

        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p>
          These Terms of Use (“Terms”) are an agreement between you and Bruce Gemmell (“Company,” “we,” “us,” or
          “our”), the owner/operator of <strong>Pawn Point</strong>.
        </p>
        <p>
          These Terms govern your access to and use of https://pawn-point.vercel.app/ and any related subdomains, apps,
          tools, and services that link to these Terms (collectively, the “Platform”), including all content, features,
          and services offered on or through the Platform.
        </p>
        <p>
          By accessing or using the Platform, or by clicking an “accept” or “agree” option where shown, you confirm that
          you have read, understood, and agree to be bound by these Terms and our Privacy Policy at{" "}
          <strong>[LINK TO PRIVACY POLICY]</strong>. If you do not agree, do not use the Platform.
        </p>

        <h2 className="text-xl font-semibold">2. Age Restrictions and Parental Consent</h2>
        <p>
          2.1 <strong>Minimum age (13+).</strong> The Platform is intended for users who are <strong>13 years of age or
          older</strong>. Users under 13 are not permitted to access or use the Platform.
        </p>
        <p>
          2.2 <strong>Users under 18.</strong> If you are <strong>under 18</strong>, you may only use the Platform with
          the knowledge and consent of a parent or legal guardian. By using the Platform, you represent that you have
          that consent.
        </p>
        <p>
          2.3 <strong>Children’s information.</strong> We do not knowingly collect personal information from children
          under 13. If you believe a child under 13 has provided personal information, please contact us at
          officialpawnpoint@gmail.com so we can take appropriate steps.
        </p>

        <h2 className="text-xl font-semibold">3. Changes to the Terms</h2>
        <p>
          We may update these Terms from time to time. Updates take effect when posted on the Platform. If changes are
          material, we may notify registered users via email or via an in-product notice.
        </p>
        <p>
          By continuing to use the Platform after updated Terms are posted (and/or after being notified), you agree to
          the updated Terms. You are responsible for checking this page periodically.
        </p>

        <h2 className="text-xl font-semibold">4. Platform Access and Availability</h2>
        <p>
          We may change, suspend, withdraw, or restrict access to all or part of the Platform at any time, with or
          without notice. We are not liable if, for any reason, the Platform is unavailable at any time or for any
          period.
        </p>
        <p>You are responsible for:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Making all arrangements necessary for you to access the Platform; and</li>
          <li>
            Ensuring that anyone who accesses the Platform through your internet connection is aware of these Terms and
            complies with them.
          </li>
        </ul>

        <h2 className="text-xl font-semibold">5. Accounts, Security, and Responsibility</h2>
        <p>
          5.1 <strong>Accurate information.</strong> If you create an account, you agree to provide accurate, current,
          and complete information and keep it updated.
        </p>
        <p>
          5.2 <strong>Account security.</strong> You are responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account. Do not share your password or allow others to
          access your account.
        </p>
        <p>
          5.3 <strong>Unauthorised access.</strong> Notify us immediately at officialpawnpoint@gmail.com if you suspect
          unauthorised access to your account or any security breach.
        </p>
        <p>
          5.4 <strong>Suspension/termination.</strong> We may disable or terminate accounts (including usernames) at our
          discretion, including where we believe you have violated these Terms, risked harm to the Platform or others,
          or engaged in unlawful conduct.
        </p>

        <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
        <p>
          6.1 <strong>Our IP.</strong> The Platform and its content (including software, designs, text, graphics, logos,
          audio, video, and other materials) are owned by us or our licensors and are protected under applicable
          intellectual property laws.
        </p>
        <p>
          6.2 <strong>Limited licence.</strong> We grant you a limited, non-exclusive, non-transferable, revocable
          licence to access and use the Platform for your personal, non-commercial use (unless we explicitly allow
          otherwise).
        </p>
        <p>
          6.3 <strong>Restrictions.</strong> You may not:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Copy, reproduce, distribute, publicly display, publicly perform, or create derivative works of the Platform
            or content, except as permitted by law or with our prior written permission;
          </li>
          <li>
            Reverse engineer, decompile, disassemble, or attempt to discover the source code of the Platform (except to
            the extent this restriction is prohibited by law);
          </li>
          <li>Remove or alter any copyright, trademark, or other proprietary notices;</li>
          <li>Use the Platform for commercial purposes without our written permission.</li>
        </ul>
        <p>
          6.4 <strong>Requests.</strong> Permission requests may be sent to <strong>[LEGAL/CONTACT EMAIL]</strong>.
        </p>

        <h2 className="text-xl font-semibold">7. Products and Services Availability</h2>
        <p>
          Certain products, services, and/or memberships are offered exclusively online through the Platform. We may
          change, limit, or discontinue any aspect of the Platform, products, services, or memberships at any time,
          without notice.
        </p>
        <p>
          Submitting an order or subscribing is an offer to purchase. We may accept or decline that offer at our
          discretion, including in cases of suspected fraud, chargeback risk, pricing errors, or platform abuse.
        </p>

        <h2 className="text-xl font-semibold">8. Pricing, Taxes, and Payment</h2>
        <p>
          8.1 <strong>Pricing changes.</strong> Prices and membership programs may change from time to time. Changes
          apply prospectively (not retroactively), except where required by PayPal or applicable law.
        </p>
        <p>
          8.2 <strong>Taxes.</strong> Unless expressly stated otherwise, prices shown may be <strong>exclusive of
          applicable taxes</strong> (including VAT), which may be added where applicable.
        </p>
        <p>
          8.3 <strong>Payment processor (PayPal).</strong> Payments for subscriptions are processed by <strong>PayPal</strong>.
          By purchasing a subscription, you also agree to PayPal’s applicable terms and policies. We do not store full
          payment card details.
        </p>
        <p>
          8.4 <strong>Billing authorisation.</strong> By subscribing, you authorise PayPal to charge the applicable
          subscription fees (and any applicable taxes) on a recurring basis until you cancel.
        </p>

        <h2 className="text-xl font-semibold">9. Access and Use Permissions</h2>
        <p>
          You may access and use the Platform only as permitted by these Terms. We may modify or discontinue any part of
          the Platform at any time.
        </p>
        <p>
          You must not share paid access with others, resell access, or use the Platform unlawfully or in a way that
          infringes anyone’s rights.
        </p>

        <h2 className="text-xl font-semibold">10. Account Inactivity and Deletion</h2>
        <p>
          To maintain platform integrity, accounts that have not been accessed for <strong>6 months</strong> may be
          considered inactive and may be deleted, subject to our Privacy Policy and any legal retention obligations.
        </p>
        <p>
          <strong>Paid accounts:</strong> If your account has an active or historic paid subscription, we may retain
          account records for billing, support, tax, fraud-prevention, or legal compliance purposes, even if access is
          inactive.
        </p>

        <h2 className="text-xl font-semibold">11. Trademarks</h2>
        <p>
          “Pawn Point,” our logos, and any related product or service names, slogans, and branding are our trademarks
          (or used with permission). You may not use them without our prior written consent.
        </p>

        <h2 className="text-xl font-semibold">12. Membership Subscriptions (PayPal)</h2>
        <p>
          12.1 <strong>Subscription term and renewal.</strong> Subscriptions renew automatically until cancelled.
        </p>
        <p>
          12.2 <strong>Cancelling.</strong> You can cancel at any time through:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your <strong>PayPal account</strong> (Subscriptions / Automatic Payments settings), and/or</li>
          <li>Any cancellation method we make available inside the Platform (if applicable).</li>
        </ul>
        <p>
          12.3 <strong>Effect of cancellation.</strong> If you cancel, you will continue to have access to paid features
          until the end of the current billing period, unless access is terminated earlier under these Terms (e.g., for
          abuse or violations).
        </p>
        <p>
          12.4 <strong>Failed payments.</strong> If PayPal cannot process payment, your access to paid features may be
          suspended or downgraded until payment is successfully processed.
        </p>

        <h2 className="text-xl font-semibold">13. No Trial Period</h2>
        <p>
          We do <strong>not</strong> offer a free trial period unless we explicitly state otherwise in writing on the
          Platform for a specific promotion.
        </p>

        <h2 className="text-xl font-semibold">14. Refund Policy (No Refunds)</h2>
        <p>
          14.1 <strong>General rule: no refunds.</strong> All subscription payments are <strong>non-refundable</strong>,
          and we do not offer refunds for partial periods, unused time, or accidental purchases.
        </p>
        <p>
          14.2 <strong>Legal exception.</strong> Nothing in these Terms limits any rights you may have under applicable
          South African law (including the Consumer Protection Act, where applicable). If a refund is required by law,
          we will comply.
        </p>
        <p>
          14.3 <strong>Chargebacks.</strong> If you initiate a chargeback or payment dispute, we may suspend your account
          during investigation and may terminate access if we determine you violated these Terms or abused the
          Platform.
        </p>

        <h2 className="text-xl font-semibold">15. Prohibited Uses</h2>
        <p>You must use the Platform lawfully and in accordance with these Terms. You must not:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Violate any applicable law or regulation;</li>
          <li>Harm or attempt to harm minors or solicit personal information from minors;</li>
          <li>Send spam, junk mail, or unsolicited promotions;</li>
          <li>Impersonate us or someone else;</li>
          <li>Interfere with the Platform’s operation, security, or other users’ enjoyment;</li>
          <li>Use bots, scrapers, spiders, or automated tools without permission;</li>
          <li>Introduce viruses, malware, or harmful code;</li>
          <li>Attempt unauthorised access to the Platform, servers, or databases;</li>
          <li>Engage in denial-of-service attacks or similar harmful activity.</li>
        </ul>

        <h2 className="text-xl font-semibold">16. User Contributions (Courses and Other Content)</h2>
        <p>
          16.1 <strong>User Contributions.</strong> The Platform may allow you to post content, including courses,
          lessons, text, images, or other materials (“User Contributions”).
        </p>
        <p>16.2 <strong>Public/non-confidential.</strong> User Contributions may be visible to others and are not confidential.</p>
        <p>
          16.3 <strong>Licence you grant to us.</strong> By posting User Contributions, you grant us a worldwide,
          royalty-free, non-exclusive, transferable, sublicensable licence to host, store, reproduce, distribute,
          display, perform, modify (for formatting and platform compatibility), and otherwise use your User
          Contributions for the purpose of operating, improving, and promoting the Platform.
        </p>
        <p>16.4 <strong>Your promises.</strong> You represent and warrant that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You own your User Contributions or have all necessary rights/permissions to post them;</li>
          <li>Your User Contributions do not infringe any third-party rights (including copyright, privacy, or personality rights);</li>
          <li>Your User Contributions comply with these Terms and applicable law.</li>
        </ul>
        <p>
          16.5 <strong>Removal and enforcement.</strong> We may remove or restrict User Contributions at any time if we
          believe they violate these Terms, are unlawful, or may expose us or others to risk. We may also suspend or
          terminate accounts for repeated violations.
        </p>
        <p>
          16.6 <strong>Disclosure.</strong> If someone claims your User Contribution violates their rights, we may
          disclose information as required by law or as reasonably necessary to address the complaint.
        </p>

        <h2 className="text-xl font-semibold">17. Submissions (Feedback and Ideas)</h2>
        <p>
          If you send us feedback, ideas, or suggestions (“Submissions”), you agree that:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>We may use them without restriction or compensation to you; and</li>
          <li>You do not retain any claim to ownership or credit for such Submissions.</li>
        </ul>

        <h2 className="text-xl font-semibold">18. Reliance on Platform Information</h2>
        <p>
          Content on the Platform is provided for general information and educational purposes. We do not guarantee that
          content is complete, accurate, or suitable for your needs. You use the Platform at your own risk.
        </p>

        <h2 className="text-xl font-semibold">19. Changes to the Platform</h2>
        <p>
          We may update or change the Platform from time to time. We are not obligated to keep any particular feature,
          course, or content available.
        </p>

        <h2 className="text-xl font-semibold">20. Your Information and Privacy</h2>
        <p>
          Your use of the Platform is subject to our Privacy Policy at <strong>[LINK]</strong>. By using the Platform,
          you consent to our collection, use, and sharing of information as described there.
        </p>

        <h2 className="text-xl font-semibold">21. Linking to Our Platform and Social Features</h2>
        <p>
          You may link to our homepage in a fair and lawful way that does not damage our reputation or suggest
          endorsement. We may withdraw linking permission at any time.
        </p>

        <h2 className="text-xl font-semibold">22. Third-Party Links</h2>
        <p>
          The Platform may contain links to third-party sites. We do not control and are not responsible for third-party
          content, policies, or practices. Access third-party sites at your own risk.
        </p>

        <h2 className="text-xl font-semibold">23. Disclaimer of Endorsement</h2>
        <p>
          References to third-party products, services, or trademarks do not imply endorsement or affiliation unless
          explicitly stated. We are not responsible for third-party content.
        </p>

        <h2 className="text-xl font-semibold">24. Geographic Scope</h2>
        <p>
          The Platform is operated from South Africa. If you access it from outside South Africa, you are responsible
          for complying with local laws.
        </p>

        <h2 className="text-xl font-semibold">25. Disclaimer of Warranties</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM AND ALL CONTENT AND SERVICES ARE PROVIDED “AS IS” AND “AS
          AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Platform will be uninterrupted, error-free, secure, or free of harmful components.
        </p>

        <h2 className="text-xl font-semibold">26. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL OUR TOTAL LIABILITY ARISING OUT OF OR RELATING TO
          THESE TERMS OR YOUR USE OF THE PLATFORM EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN THE <strong>12 MONTHS</strong>{" "}
          BEFORE THE EVENT GIVING RISE TO LIABILITY.
        </p>
        <p>
          We will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of
          profits, revenue, data, or goodwill.
        </p>

        <h2 className="text-xl font-semibold">27. Indemnity</h2>
        <p>
          You agree to defend, indemnify, and hold harmless the Company and its affiliates, and their respective
          officers, directors, employees, contractors, agents, licensors, and service providers, from and against any
          claims, liabilities, damages, judgments, awards, losses, costs, expenses, and reasonable legal fees arising
          out of or relating to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your breach of these Terms;</li>
          <li>Your misuse of the Platform; or</li>
          <li>Your User Contributions.</li>
        </ul>

        <h2 className="text-xl font-semibold">28. Governing Law and Jurisdiction (South Africa — High Court)</h2>
        <p>
          These Terms and any dispute arising from or relating to the Platform will be governed by the laws of the{" "}
          <strong>Republic of South Africa</strong>.
        </p>
        <p>
          You agree that the <strong>High Court of South Africa</strong> will have jurisdiction over any dispute or
          claim arising out of or relating to these Terms or the Platform, subject to any mandatory legal requirements.
        </p>

        <h2 className="text-xl font-semibold">29. No Mandatory Arbitration</h2>
        <p>
          We do not require arbitration. Nothing prevents either party from seeking urgent relief (including an interdict)
          from a competent court.
        </p>

        <h2 className="text-xl font-semibold">30. Time Limit to Bring Claims</h2>
        <p>
          To the maximum extent permitted by law, any claim you have arising out of or relating to these Terms or the
          Platform must be brought within <strong>one (1) year</strong> from the date the claim arose.
        </p>

        <h2 className="text-xl font-semibold">31. Waiver and Severability</h2>
        <p>
          No waiver is a waiver unless in writing. If any provision of these Terms is found invalid or unenforceable,
          the remaining provisions remain in full force and effect.
        </p>

        <h2 className="text-xl font-semibold">32. Entire Agreement</h2>
        <p>
          These Terms, together with the Privacy Policy and any other policies expressly incorporated by reference,
          constitute the entire agreement between you and us regarding the Platform and supersede all prior
          understandings.
        </p>

        <div>---</div>

        <h2 className="text-xl font-semibold">Contact Information</h2>
        <p>
          <strong>Platform operated by:</strong> Bruce Gemmell (owner of Pawn Point)
        </p>
        <p>
          <strong>Business enquiries:</strong> officialpawnpoint@gmail.com
        </p>
        <p>
          <strong>Support:</strong> officialpawnpoint@gmail.com
        </p>
      </div>
    </div>
  );
}
