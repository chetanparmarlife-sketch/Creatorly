# Dodo Payments setup

Creatorly uses Dodo’s hosted checkout and customer billing portal. Paid access is never granted from the browser return page. A signed Dodo webhook must confirm the payment first.

## What can be sold now

Create these six products in the Dodo **test-mode** catalog:

| Creatorly item | Dodo product type | Convex variable |
| --- | --- | --- |
| Basic monthly | Recurring subscription, monthly | `DODO_BASIC_MONTHLY_PRODUCT_ID` |
| Basic annual | Recurring subscription, annual | `DODO_BASIC_ANNUAL_PRODUCT_ID` |
| Pro monthly | Recurring subscription, monthly | `DODO_PRO_MONTHLY_PRODUCT_ID` |
| Pro annual | Recurring subscription, annual | `DODO_PRO_ANNUAL_PRODUCT_ID` |
| 50 contact credits | One-time payment | `DODO_CREDITS_50_PRODUCT_ID` |
| 100 contact credits | One-time payment | `DODO_CREDITS_100_PRODUCT_ID` |

Do not create paid Inbox, AI Agents, or Reporting products yet. Those add-ons remain marked as future products until their features and usage limits exist.

## Convex development variables

Add these in the Convex development dashboard under **Settings → Environment Variables**:

```text
DODO_PAYMENTS_API_KEY=<Dodo test API key>
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_WEBHOOK_SECRET=<Dodo test webhook secret>
CREATORLY_APP_URL=https://my-build-week-project.vercel.app
DODO_BASIC_MONTHLY_PRODUCT_ID=<test product id>
DODO_BASIC_ANNUAL_PRODUCT_ID=<test product id>
DODO_PRO_MONTHLY_PRODUCT_ID=<test product id>
DODO_PRO_ANNUAL_PRODUCT_ID=<test product id>
DODO_CREDITS_50_PRODUCT_ID=<test product id>
DODO_CREDITS_100_PRODUCT_ID=<test product id>
```

Keep all values in Convex. Do not add the API key or webhook secret to `.env.local`, Git, frontend variables, screenshots, or chat.

## Webhook

Create a test webhook in Dodo that sends events to:

```text
https://<your-convex-development-deployment>.convex.site/dodopayments-webhook
```

Subscribe to these events:

- `payment.processing`
- `payment.succeeded`
- `payment.failed`
- `payment.cancelled`
- `subscription.active`
- `subscription.renewed`
- `subscription.updated`
- `subscription.plan_changed`
- `subscription.on_hold`
- `subscription.paused`
- `subscription.unpaused`
- `subscription.cancelled`
- `subscription.failed`
- `subscription.expired`

The endpoint verifies Dodo’s signature with `DODO_PAYMENTS_WEBHOOK_SECRET`. Duplicate webhook deliveries are stored by event key and do not add credits twice.

## Test checklist

1. Sign in to Creatorly and start a Basic monthly checkout.
2. Complete payment with a Dodo test payment method.
3. Return to `/payment/success`; the page must say confirmation is pending rather than claiming instant access.
4. Confirm the Dodo webhook returns HTTP 200.
5. Refresh Creatorly and confirm the Basic plan and 100 plan credits appear.
6. Replay the same webhook and confirm the credit balance does not change again.
7. Buy a 50-credit pack and confirm exactly 50 credits are added.
8. Trigger a failed payment and confirm access is not granted.
9. Open the Dodo customer portal from Settings and confirm invoices and cancellation controls are available.
10. Trigger `subscription.on_hold`, `subscription.cancelled`, and `subscription.expired`; confirm Creatorly mirrors each status.

## Live-mode cutover

Do this only after the test checklist passes:

1. Create the same six products in Dodo live mode.
2. Replace every development product ID with its live product ID in the production Convex deployment.
3. Set the live API key and live webhook secret in production Convex.
4. Register the production Convex webhook URL in Dodo live mode.
5. Set `DODO_PAYMENTS_ENVIRONMENT=live_mode`.
6. Set `DODO_PAYMENTS_LIVE_ENABLED=true` as the final deliberate switch.
7. Make one low-value real purchase and verify checkout, invoice, webhook, entitlement, cancellation, renewal, and failure handling before inviting customers.
