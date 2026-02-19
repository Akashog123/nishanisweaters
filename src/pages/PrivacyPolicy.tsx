import Layout from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { useLegalSettings, useSiteSettings } from "@/hooks/useSiteSettings";

// Default fallback content when settings are not configured
const DEFAULT_CONTENT = `At Nidhi Clothing Co., we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit our website or make a purchase.

## Information We Collect

We collect information that you provide directly to us, including:
- Name, email address, and phone number
- Shipping and billing addresses
- Payment information
- Order history and preferences

## How We Use Your Information

We use the information we collect to:
- Process and fulfill your orders
- Communicate with you about your orders
- Improve our website and services
- Send you marketing communications (with your consent)

## Data Security

We implement appropriate security measures to protect your personal information.`;

export default function PrivacyPolicy() {
  const { privacyPolicyTitle, privacyPolicyEditedAt, privacyPolicyContent, isLoading } = useLegalSettings();
  const { siteName, businessLocation } = useSiteSettings();

  // Use settings content if available, otherwise use default
  const content = privacyPolicyContent || DEFAULT_CONTENT;
  const lastUpdated = privacyPolicyEditedAt || "February 19, 2026";

  return isLoading ? (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <BackButton />
      </div>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    </Layout>
  ) : (
    <Layout>
      <div className="container mx-auto px-4 pt-4">
        <BackButton />
      </div>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="bg-zinc-900 text-white py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">{privacyPolicyTitle}</h1>
            <p className="text-lg text-zinc-400">Last updated: {lastUpdated}</p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-4xl mx-auto prose prose-zinc dark:prose-invert">
              <p className="text-lg text-muted-foreground mb-8">
                At Nidhi Clothing Co., we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit our website or make a purchase.
              </p>

              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
                  <p className="text-muted-foreground mb-4">
                    We collect information in several ways to provide you with the best shopping experience:
                  </p>
                  <h3 className="text-xl font-semibold mb-2">Personal Information You Provide</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account</li>
                    <li><strong>Shipping Address:</strong> Delivery addresses for order fulfillment</li>
                    <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely via Razorpay)</li>
                    <li><strong>Order History:</strong> Details of your purchases and order preferences</li>
                    <li><strong>Communication Data:</strong> Messages you send us through contact forms or customer support</li>
                  </ul>
                  <h3 className="text-xl font-semibold mb-2 mt-4">Automatically Collected Information</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                    <li><strong>Usage Data:</strong> Pages visited, time spent on site, links clicked</li>
                    <li><strong>Cookies:</strong> Session data to enhance your browsing experience</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-4">
                    We use your information for the following purposes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Order Processing:</strong> To process and fulfill your orders, including shipping and delivery</li>
                    <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity</li>
                    <li><strong>Customer Support:</strong> To respond to your inquiries and provide assistance</li>
                    <li><strong>Personalization:</strong> To recommend products based on your preferences and browsing history</li>
                    <li><strong>Marketing Communications:</strong> To send you promotional emails about new products and special offers (with your consent)</li>
                    <li><strong>Analytics:</strong> To analyze website traffic and improve our services</li>
                    <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">3. Information Sharing & Disclosure</h2>
                  <p className="text-muted-foreground mb-4">
                    We may share your information with the following third parties:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Service Providers:</strong> Payment processors (Razorpay), shipping partners, and IT service providers who assist in our operations</li>
                    <li><strong>Shipping Partners:</strong> Courier services to deliver your orders</li>
                    <li><strong>Legal Authorities:</strong> When required by law or to protect our rights and safety</li>
                    <li><strong>Business Transfers:</strong> In the event of a merger or sale of business assets</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We do <strong>not</strong> sell, trade, or rent your personal information to third parties for marketing purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
                  <p className="text-muted-foreground mb-4">
                    We implement appropriate technical and organizational measures to protect your personal information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>SSL encryption for all data transmission</li>
                    <li>Secure payment processing via Razorpay (PCI-DSS compliant)</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>Access controls limiting employee access to personal data</li>
                    <li>Secure data storage with encryption at rest</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">5. Cookies & Tracking Technologies</h2>
                  <p className="text-muted-foreground mb-4">
                    We use cookies and similar tracking technologies to enhance your browsing experience:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Essential Cookies:</strong> Required for basic site functionality and shopping cart persistence</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                    <li><strong>Marketing Cookies:</strong> Used to track visitors across websites for targeted advertising</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    You can control or disable cookies through your browser settings. However, disabling essential cookies may affect your ability to use certain features of our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">6. Your Rights</h2>
                  <p className="text-muted-foreground mb-4">
                    Under Indian data protection laws, you have the following rights:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
                    <li><strong>Right to Correction:</strong> Request correction of inaccurate personal data</li>
                    <li><strong>Right to Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                    <li><strong>Right to Object:</strong> Object to processing of your personal data for certain purposes</li>
                    <li><strong>Right to Data Portability:</strong> Request transfer of your data to another service provider</li>
                    <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for processing at any time</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    To exercise these rights, please contact us at support@nidhiclothing.com.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
                  <p className="text-muted-foreground">
                    We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements. Account data is retained for 2 years after account inactivity, after which it may be deleted upon request.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">8. Third-Party Links</h2>
                  <p className="text-muted-foreground">
                    Our website may contain links to third-party websites, services, or applications that are not operated by us. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately, and we will take steps to delete such information.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">10. International Data Transfers</h2>
                  <p className="text-muted-foreground">
                    Your information may be transferred to and processed in countries other than India, where our servers or service providers are located. We ensure appropriate safeguards are in place to protect your data during such transfers, in compliance with applicable data protection laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">11. Changes to This Privacy Policy</h2>
                  <p className="text-muted-foreground mb-4">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or for operational, legal, or regulatory reasons. We will post any changes on this page and update the "Last Updated" date at the top.
                  </p>
                  <p className="text-muted-foreground">
                    We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">12. Grievance Officer</h2>
                  <p className="text-muted-foreground mb-4">
                    In accordance with the Information Technology Act, 2000, we have appointed a Grievance Officer to address any privacy concerns or complaints:
                  </p>
                  <div className="bg-muted p-6 rounded-lg">
                    <p className="font-medium mb-2">Grievance Officer</p>
                    <p className="text-muted-foreground">{siteName}</p>
                    <p className="text-muted-foreground">{businessLocation}</p>
                    <p className="text-muted-foreground mt-2">Email: support@nidhiclothing.com</p>
                    <p className="text-muted-foreground">Phone: +91 7458 816 343</p>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    We will acknowledge and respond to your grievance within 15 days as required by law.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                  </p>
                  <div className="bg-muted p-6 rounded-lg">
                    <p className="font-medium mb-2">{siteName}</p>
                    <p className="text-muted-foreground">{businessLocation}</p>
                    <p className="text-muted-foreground mt-2">Email: support@nidhiclothing.com</p>
                    <p className="text-muted-foreground">Phone: +91 7458 816 343</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
