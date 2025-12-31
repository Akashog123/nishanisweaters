# Razorpay Payment Integration Setup

## Environment Variables

Set these in your Convex dashboard (Settings → Environment Variables):

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx
```

## Webhook Configuration

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings → Webhooks → Add New Webhook**
3. Configure:
   - **URL**: `https://<your-deployment>.convex.site/razorpay-webhook`
   - **Secret**: Generate and save as `RAZORPAY_WEBHOOK_SECRET`
   - **Events**: Select these:
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `refund.created`

## Testing

1. Enable **Test Mode** in Razorpay Dashboard
2. Use [test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/):
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
3. Verify webhook delivery in Razorpay Dashboard → Webhooks → Recent Deliveries

## Health Check

Verify the endpoint is live:
```
curl https://<your-deployment>.convex.site/health
```

## Going Live

1. Switch to **Live Mode** in Razorpay Dashboard
2. Update environment variables with live credentials
3. Update webhook URL if deployment URL changes
