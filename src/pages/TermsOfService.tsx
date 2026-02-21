import Layout from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { useLegalSettings } from "@/hooks/useSiteSettings";

export default function TermsOfService() {
  const { termsOfServiceTitle, termsOfServiceEditedAt, isLoading } = useLegalSettings();

  // Use settings content if available, otherwise use default
  const lastUpdated = termsOfServiceEditedAt || "February 19, 2026";

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
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">{termsOfServiceTitle}</h1>
            <p className="text-lg text-zinc-400">Last updated: {lastUpdated}</p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-4xl mx-auto prose prose-zinc dark:prose-invert">
              <p className="text-lg text-muted-foreground mb-8">
                Welcome to Nidhi Clothing Co. By accessing and using our website, you agree to be bound by these Terms of Service. Please read them carefully before using our services.
              </p>

              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing, browsing, or using the Nidhi Clothing Co. website ("we," "our," or "us"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, along with our Privacy Policy. If you do not agree to these terms, please do not use our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
                  <p className="text-muted-foreground mb-4">
                    Permission is granted to temporarily use the Nidhi Clothing Co. website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose or public display</li>
                    <li>Transfer the materials to another person or entity</li>
                    <li>Attempt to reverse engineer any software contained on the website</li>
                    <li>Remove any copyright or other proprietary notations from the materials</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
                  <p className="text-muted-foreground mb-4">
                    When you create an account with us, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account and password. You agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                    <li>Not use another user's account without permission</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">4. Product Information & Pricing</h2>
                  <p className="text-muted-foreground mb-4">
                    We strive to provide accurate product descriptions, pricing, and availability information. However, we reserve the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Correct any errors, inaccuracies, or omissions</li>
                    <li>Change prices at any time without notice</li>
                    <li>Limit quantities available for purchase</li>
                    <li>Cancel orders if products are unavailable or mispriced</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    All prices are in Indian Rupees (INR) and include applicable taxes unless otherwise stated.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">5. Orders & Payment</h2>
                  <p className="text-muted-foreground mb-4">
                    By placing an order through our website, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Provide valid payment information</li>
                    <li>Authorize us to charge the total order amount</li>
                    <li>Be bound by our pricing and shipping terms</li>
                    <li>Accept responsibility for any import duties or taxes (for international orders)</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We accept payments via Razorpay, including all major credit/debit cards, UPI, and net banking.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">6. Shipping & Delivery</h2>
                  <p className="text-muted-foreground mb-4">
                    We offer shipping across India. Delivery times may vary based on location and product availability. Standard shipping typically takes 5-7 business days, while express shipping takes 2-3 business days.
                  </p>
                  <p className="text-muted-foreground">
                    Free shipping is available on orders exceeding ₹1,000. For orders below this amount, a shipping fee of ₹99 applies.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">7. Returns & Refunds</h2>
                  <p className="text-muted-foreground mb-4">
                    We want you to be completely satisfied with your purchase. If you're not happy with your order, you may return unused items within 7 days of delivery for a full refund or exchange, subject to the following conditions:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Items must be unworn, unwashed, and in original packaging</li>
                    <li>Tags must be attached</li>
                    <li>Proof of purchase is required</li>
                    <li>Shipping costs for returns are borne by the customer unless the item is defective</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Refunds are processed within 5-7 business days after we receive and inspect the returned item.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">8. Intellectual Property</h2>
                  <p className="text-muted-foreground">
                    All content on this website, including images, designs, logos, text, and software, is the intellectual property of Nidhi Clothing Co. and is protected by Indian and international copyright laws. Unauthorized reproduction, distribution, or modification is strictly prohibited.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">9. User Conduct</h2>
                  <p className="text-muted-foreground mb-4">
                    When using our website, you agree not to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon the rights of others</li>
                    <li>Submit false or misleading information</li>
                    <li>Transmit viruses or malicious code</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">10. Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    Nidhi Clothing Co. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our website or products. Our total liability shall not exceed the amount paid by you for the products in question.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">11. Indemnification</h2>
                  <p className="text-muted-foreground">
                    You agree to indemnify, defend, and hold harmless Nidhi Clothing Co. and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, or expenses arising out of your use of our website or violation of these Terms of Service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">12. Governing Law</h2>
                  <p className="text-muted-foreground">
                    These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Ludhiana, Punjab.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">13. Changes to Terms</h2>
                  <p className="text-muted-foreground">
                    We reserve the right to modify these Terms of Service at any time. Any changes will be posted on this page with an updated "Last Updated" date. Your continued use of our website after such changes constitutes your acceptance of the new terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="bg-muted p-6 rounded-lg">
                    <p className="font-medium mb-2">Nidhi Clothing Co.</p>
                    <p className="text-muted-foreground">Main Market Road</p>
                    <p className="text-muted-foreground">Ludhiana, Punjab 141001, India</p>
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
