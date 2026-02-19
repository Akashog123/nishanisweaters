# Product Requirements Document (PRD): Nidhi Clothing Co. E-commerce Platform

## 1. Project Overview
Nidhi Clothing Co. is a premium winter wear brand. The goal is to evolve the current showcase site into a full-fledged e-commerce platform that supports both retail (B2C) and wholesale (B2B) operations, managed through a centralized admin dashboard.

## 2. Target Audience
*   **Retail Customers (B2C):** Individual shoppers looking for premium winter wear.
*   **Wholesale Partners (B2B):** Retailers and boutiques looking to stock Nidhi Clothing Co. products in bulk.
*   **Administrators:** Internal staff managing inventory, orders, and customer relations.

## 3. Key Features

### 3.1 Storefront (B2C)
*   **Product Discovery:** Enhanced search, filtering (by size, color, price, category), product reviews and ratings and sorting.
*   **Product Details:** High-quality image galleries, size guides, stock availability, and related products.
*   **Shopping Cart:** Persistent cart, mini-cart drawer, and "Save for Later" functionality.
*   **Checkout:** Multi-step checkout, address validation, and integrated payments via Razorpay.
*   **User Accounts:** Order history, profile management, and wishlist managed via Clerk.

### 3.2 Wholesale Portal (B2B)
*   **Wholesale Registration:** Application form for businesses to apply for wholesale accounts.
*   **Wholesale Registration:** Allow wholesale users to self-register with a business account (company name, business email(optional), GST No.(optional), address, website(optional)).
    *   **Direct Signup Flow:** Self-service registration with email verification and immediate limited access.
    *   **Verification & Approval:** Support optional admin review—require document upload (reseller certificate, business license) for full wholesale access.
    *   **Access:** Approved accounts see wholesale pricing set per product.
    *   **Notifications & Onboarding:** Automated emails for verification, approval status, and onboarding steps; admin alerts for manual reviews.
*   **Wholesale Pricing:** Admin sets a single wholesale price per product (separate from retail price). For custom bulk pricing negotiations, customers contact via WhatsApp (+91 7458 816 343).
*   **Bulk Ordering:** Quick-add forms for ordering multiple sizes/colors of a single product in one go.
*   **Minimum Order Quantity (MOQ):** Per-product minimum order quantities set by admin, enforced at checkout.
*   **Invoicing:** Option to pay via invoice/bank transfer for approved partners.
*   **Wholesale Dashboard:** View wholesale-specific catalogs, order history, and WhatsApp contact for bulk pricing inquiries.

### 3.3 Admin Dashboard
*   **Inventory Management:**
    *   Add/Edit/Delete products(including images and videos for products).
    *   Manage variants (size, color, SKU).
    *   Real-time stock tracking and low-stock alerts (powered by Convex reactive queries).
*   **Order Management:**
    *   View and process B2C and B2B orders.
    *   Update order status (Pending, Shipped, Delivered, Cancelled).
    *   Generate shipping labels and tracking numbers.
*   **Customer Management:**
    *   Manage retail and wholesale user accounts via Clerk.
    *   Approve/Reject wholesale applications.
    *   Update user roles (customer, wholesale, admin).
*   **Analytics & Reporting:**
    *   Sales reports (daily, weekly, monthly).
    *   Top-selling products.
    *   Customer acquisition data.
*   **Content Management (CMS):**
    *   Update banners, announcements, marketing mailing customisation with auto generation, user query handling, ratings and review verification.

### 3.4 Marketing & Communication
*   **Transactional Emails:** Automated order confirmations, shipping updates, and account verification emails.
*   **Marketing Campaigns:** Newsletter signup, scheduled promotional emails, and abandoned cart recovery.
*   **Wholesale Notifications:** Automated alerts for application status (approved/rejected) notifications for partners.

## 4. Technical Requirements
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI.
*   **Backend & Database:** Convex (Real-time database, serverless functions, and file storage).
*   **Authentication:** Clerk (User management, multi-tenancy for wholesale, and role-based access control).
*   **Payments & Billing:** Razorpay for retail checkout and wholesale invoicing.
*   **State Management:** Convex hooks for server state, Context API for local UI state.
*   **Email Service:** Nodemailer with Brevo SMTP for transactional emails (free tier: 300 emails/day).
*   **Deployment:** Vercel (Frontend) and Convex (Backend).

## 5. Integration Details
*   **Clerk + Convex:** Use Clerk's JWT-based authentication to secure Convex mutations and queries. User identity in Convex will be synced with Clerk user IDs.
*   **Razorpay Integration:** Leverage Razorpay for one-time payments and subscriptions (if applicable), synced with Convex for order fulfillment status.
*   **Real-time Updates:** Use Convex's reactive subscriptions to update the Admin Dashboard and Storefront inventory levels instantly without page refreshes.
*   **Email Integration:** Trigger emails via Convex actions using Nodemailer with SMTP based on database events (e.g., order created, status changed).

## 6. User Stories
*   **As a Retail Customer,** I want to filter products by my size so I only see what I can wear.
*   **As a Wholesale Partner,** I want to see wholesale pricing when I log in so I can calculate my margins, and contact via WhatsApp for custom bulk deals.
*   **As an Admin,** I want to be notified when a product is out of stock so I can reorder from the manufacturer.
*   **As an Admin,** I want to see a breakdown of retail vs. wholesale sales to understand my business growth.
*   **As an Admin,** I want to set a wholesale price and minimum order quantity for each product.

## 7. Roadmap
*   **Phase 1 (MVP):** Complete B2C checkout flow, basic user accounts, and simple admin product management.
*   **Phase 2 (Wholesale):** Implement wholesale registration, per-product wholesale pricing, and bulk ordering.
*   **Phase 3 (Advanced Admin):** Detailed analytics, automated inventory alerts, and CMS features.
*   **Phase 4 (Optimization):** SEO enhancements, (INR/language)

---

## 8. Implementation Status

### Completed Features ✅

#### Storefront (B2C)
- [x] Product Discovery: Search, filtering (size, color, price, category), sorting
- [x] Product Details: Image galleries, size guides, stock availability, related products
- [x] Shopping Cart: Persistent cart, mini-cart drawer, promo code support
- [x] Checkout: Multi-step checkout (4 steps), address validation
- [x] Razorpay Integration: Order creation, payment processing, signature verification
- [x] User Accounts: Order history, profile management, wishlist (via Clerk)
- [x] Reviews and Ratings: Review submission and display

#### Wholesale Portal (B2B)
- [x] Wholesale Registration: Application form with business details
- [x] Wholesale Pricing: Per-product wholesale price display for approved partners
- [x] Bulk Ordering: Quick-add forms for multiple variants
- [x] Minimum Order Quantity (MOQ): Per-product MOQ enforced at checkout
- [x] Invoice Payment Option: UI support for invoice/bank transfer payment method
- [x] Wholesale Dashboard: Order history, catalog view

#### Admin Dashboard
- [x] Inventory Management: CRUD products, manage variants, real-time stock tracking
- [x] Low-Stock Alerts: Automated detection via `hasLowStock` index
- [x] Order Management: View/process orders, status updates, cancellation with inventory restore
- [x] Customer Management: User roles, wholesale application approval/rejection
- [x] Analytics & Reporting: Sales analytics, top-selling products, retail vs wholesale breakdown
- [x] Dashboard Overview: Revenue, pending orders, low stock counts

#### Marketing & Communication
- [x] Transactional Emails: Order confirmation, shipping updates (via Nodemailer/Brevo SMTP)
- [x] Wholesale Notifications: Application status emails (approved/rejected)
- [x] Abandoned Cart Recovery: Automated reminders (3 reminder emails, cron-scheduled)
- [x] Newsletter Welcome Email: Template ready

#### Security Implementation
- [x] Server-side identity verification (never trusts client user IDs)
- [x] HMAC-SHA256 payment signature verification
- [x] **Constant-time signature comparison** (prevents timing attacks)
- [x] Role-based access control (admin/wholesale/customer)
- [x] XSS protection in email templates
- [x] Input validation (phone, postal code, addresses)
- [x] Atomic inventory operations (prevents overselling)
- [x] **Payload size/depth validation** (prevents DoS attacks)
- [x] **Order ID format validation** (prevents injection)
- [x] **Replay attack protection** (event timestamp validation)
- [x] **Rate limiting on webhooks** (100 req/min per IP)

---

### Pending/Incomplete Features ⚠️

#### ~~CRITICAL: HTTP Webhook Endpoint~~ ✅ COMPLETED
- [x] **`convex/http.ts` IMPLEMENTED** - Razorpay webhooks now work
  - HTTP router with `/razorpay-webhook` endpoint
  - `/health` endpoint for monitoring
  - Rate limiting (100 req/min per IP)
  - Security headers on all responses

#### Invoice Payment Processing
- [ ] Invoice generation for wholesale orders
- [ ] Bank transfer payment tracking and confirmation
- [ ] Admin interface for marking invoice payments as received

#### Content Management System (CMS)
- [ ] Banner/announcement management
- [ ] Content scheduling
- [ ] Marketing email campaign builder
- [ ] Review moderation UI

#### Additional Enhancements
- [ ] Shipping label generation
- [ ] Tracking number auto-generation
- [ ] WhatsApp integration for bulk pricing inquiries
- [ ] SEO enhancements
- [ ] Multi-language support

---

## 9. Razorpay Integration Details

> **Important:** Razorpay is a **payment provider** (like Stripe), not a payment method. It supports multiple payment methods including UPI, Credit/Debit Cards, Net Banking, and Wallets.

### Understanding Razorpay Payment Flow

Razorpay follows a **two-phase payment model**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAZORPAY PAYMENT LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [1] ORDER CREATED ──► [2] PAYMENT AUTHORIZED ──► [3] PAYMENT CAPTURED    │
│        (Server)              (Funds blocked)          (Funds transferred)   │
│                                   │                         │               │
│                                   │                         ▼               │
│                                   │                  [4] SETTLED            │
│                                   │                  (To bank account)      │
│                                   │                                         │
│                                   ▼                                         │
│                           (If not captured)                                 │
│                           [X] EXPIRED/FAILED                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **Order** | Created server-side before payment. Ensures amount integrity and enables tracking. |
| **Authorization** | Customer's bank approves payment, funds are blocked (not yet transferred). |
| **Capture** | Funds are actually transferred to merchant's Razorpay account. |
| **Auto-Capture** | Default setting - payments are captured immediately after authorization. |
| **Manual Capture** | Optional - merchant explicitly captures within 5 days (for inventory checks, fraud review). |

### Current Implementation Status

#### ✅ What's Correctly Implemented

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Orders API | `convex/payments.ts:89-129` | ✅ Complete | Creates Razorpay order with `convexOrderId` in notes |
| Standard Checkout | `src/pages/Checkout.tsx:640-690` | ✅ Complete | Uses Razorpay modal with proper configuration |
| Signature Verification | `convex/payments.ts:131-192` | ✅ Complete | HMAC-SHA256 with constant-time comparison |
| Webhook Handler | `convex/payments.ts:209-453` | ✅ Complete | Handles all events with idempotency |
| HTTP Endpoint | `convex/http.ts` | ✅ Complete | Rate-limited, secure webhook receiver |
| TypeScript Types | `src/types/razorpay.ts` | ✅ Complete | Full type definitions for Razorpay SDK |

#### ✅ Security Measures Implemented

| Issue | Priority | Status |
|-------|----------|--------|
| HTTP Webhook Endpoint | 🔴 CRITICAL | ✅ FIXED - `convex/http.ts` created |
| Timing Attack Prevention | 🔴 CRITICAL | ✅ FIXED - `crypto.timingSafeEqual` used |
| Rate Limiting | 🔴 CRITICAL | ✅ FIXED - 100 req/min per IP |
| `order.paid` Event | 🟡 Medium | ✅ FIXED - Now handled |
| Idempotency | 🟡 Medium | ✅ FIXED - Checks before updates |
| Payload Validation | 🟡 Medium | ✅ FIXED - Size/depth limits |
| Order ID Validation | 🟡 Medium | ✅ FIXED - Format validation |
| Replay Attack Protection | 🟡 Medium | ✅ FIXED - Timestamp validation |
| `payment.authorized` | 🟢 Low | Not needed (using auto-capture) |

### Complete Payment Flow (Current Implementation)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CURRENT FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                           CONVEX                    RAZORPAY      │
│  ────────                           ──────                    ────────      │
│                                                                             │
│  [1] User clicks                                                            │
│      "Place Order"                                                          │
│          │                                                                  │
│          ▼                                                                  │
│  [2] ─────────────────► createOrder() ◄──────── Creates Convex order       │
│                         (mutation)              with pending_payment        │
│          │                                                                  │
│          ▼                                                                  │
│  [3] ─────────────────► createRazorpayOrder() ────────► Orders API         │
│                         (action)                        POST /v1/orders     │
│          │                                                                  │
│          │              ◄─────────────────────────────── Returns order_id   │
│          │                                                                  │
│  [4] Opens Razorpay                                                         │
│      Checkout Modal ─────────────────────────────────► Payment Page         │
│          │                                                                  │
│          │ (User pays via UPI/Card/NetBanking)                              │
│          │                                                                  │
│  [5] ◄──────────────────────────────────────────────── Payment Response     │
│      Receives callback                                  (order_id,          │
│      with payment data                                   payment_id,        │
│          │                                               signature)         │
│          ▼                                                                  │
│  [6] ─────────────────► verifyPayment() ◄──────── Validates signature      │
│                         (action)                 HMAC-SHA256                │
│          │                                                                  │
│          │              updatePaymentStatus() ◄─ Updates to "paid"          │
│          │              (internal mutation)      Triggers email             │
│          │                                                                  │
│  [7] Redirects to                                                           │
│      /order-confirmation                                                    │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════   │
│  WEBHOOK PATH (NOT YET WORKING - NEEDS convex/http.ts)                      │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│                                         [PARALLEL] Razorpay sends webhook   │
│                                                    to /razorpay-webhook     │
│                                                            │                │
│                                                            ▼                │
│                         handlePaymentWebhook() ◄─ Verifies webhook sig      │
│                         (internal action)        Updates payment status     │
│                                                  (idempotent backup)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Webhooks Are Critical

Even with client-side verification working, webhooks are essential for:

| Scenario | Without Webhooks | With Webhooks |
|----------|------------------|---------------|
| User closes browser after payment | ❌ Order stuck as "pending" | ✅ Auto-updated via webhook |
| UPI late authorization (up to 24hrs) | ❌ No notification | ✅ `payment.captured` received |
| Refund from Razorpay dashboard | ❌ Order shows "paid" forever | ✅ `refund.created` updates status |
| Payment failure after timeout | ❌ No update | ✅ `payment.failed` received |
| Network error during callback | ❌ Lost payment info | ✅ Webhook provides backup |

### Environment Variables Required

```bash
# Required for all Razorpay operations
RAZORPAY_KEY_ID=rzp_test_xxxxx           # From Dashboard → API Keys
RAZORPAY_KEY_SECRET=xxxxx                 # From Dashboard → API Keys

# Required for webhook verification
RAZORPAY_WEBHOOK_SECRET=xxxxx             # From Dashboard → Webhooks → Secret

# Optional - for test mode indicator
RAZORPAY_TEST_MODE=true                   # Set to false in production
```

### Webhook Events to Handle

| Event | When Triggered | Current Status | Action |
|-------|----------------|----------------|--------|
| `payment.authorized` | Payment approved, funds blocked | ❌ Not handled | Only needed for manual capture |
| `payment.captured` | Funds transferred to merchant | ✅ Handled | Update order to "paid" |
| `payment.failed` | Payment failed | ✅ Handled | Update order to "failed" |
| `order.paid` | Order fully paid | ❌ Not handled | **Recommended**: Simplest event for e-commerce |
| `refund.created` | Refund initiated | ✅ Handled | Update order to "refunded" |

### Implementation Plan: convex/http.ts

**Priority: 🔴 CRITICAL**

Create `convex/http.ts` with the following:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Razorpay Webhook Endpoint
// Configure in Razorpay Dashboard: https://<your-convex-url>/razorpay-webhook
http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("x-razorpay-signature");
    const payload = await request.text();

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    try {
      await ctx.runAction(internal.payments.handlePaymentWebhook, {
        payload,
        signature,
      });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Return 200 to prevent Razorpay from retrying
      // (we've logged the error, can investigate later)
      return new Response("Processed with error", { status: 200 });
    }
  }),
});

// Health check endpoint (useful for monitoring)
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

### Improvements to payments.ts

**Priority: 🟡 MEDIUM**

Add these enhancements to `convex/payments.ts`:

1. **Handle `order.paid` event** (recommended for e-commerce):
```typescript
case "order.paid":
  const paidOrder = event.payload.order.entity;
  const paidOrderId = paidOrder.notes?.convexOrderId;
  if (paidOrderId) {
    await ctx.runMutation(internal.orders.updatePaymentStatus, {
      orderId: paidOrderId,
      paymentStatus: "paid",
    });
  }
  break;
```

2. **Add idempotency** (prevent duplicate processing):
```typescript
// Before updating, check if already processed
const existingOrder = await ctx.runQuery(internal.orders.getOrderInternal, { orderId });
if (existingOrder?.paymentStatus === "paid") {
  logger.debug('Payment already processed, skipping', { orderId });
  return { success: true };
}
```

### Razorpay Dashboard Configuration

After implementing `convex/http.ts`:

1. **Go to**: Razorpay Dashboard → Settings → Webhooks
2. **Add Webhook URL**: `https://<your-convex-deployment>.convex.site/razorpay-webhook`
3. **Select Events**:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.created`
4. **Copy Secret** → Add to Convex environment as `RAZORPAY_WEBHOOK_SECRET`

### Testing Checklist

- [ ] Create test order with Razorpay test credentials
- [ ] Complete payment via test card: `4111 1111 1111 1111`
- [ ] Verify client-side callback updates order status
- [ ] Simulate webhook via Razorpay Dashboard → Webhooks → Test
- [ ] Verify webhook handler processes events correctly
- [ ] Test UPI payment (stays pending, then completes)
- [ ] Test payment failure scenario
- [ ] Test refund from dashboard

### References

- [Razorpay Payment Gateway - How it Works](https://razorpay.com/docs/payments/payment-gateway/how-it-works/)
- [Razorpay Node.js Integration](https://razorpay.com/docs/payments/server-integration/nodejs/)
- [Razorpay Webhooks Documentation](https://razorpay.com/docs/webhooks/)
- [Razorpay Orders API](https://razorpay.com/docs/api/orders/)
- [Razorpay Payments API](https://razorpay.com/docs/api/payments/)

---

## TUTORIAL RESOURCES
* **Shadcn:** https://ui.shadcn.com/docs/components
* **Clerk:**  https://clerk.com/docs/react/getting-started/quickstart
* **Convex:** https://docs.convex.dev/client/react
* **Clerk + Convex docs:** https://clerk.com/docs/guides/development/integrations/databases/convex