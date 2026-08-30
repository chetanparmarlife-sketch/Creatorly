# Dodo Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace DemoPay account mutations with Dodo Payments test-mode checkout, signed webhook fulfilment, and a customer billing portal.

**Architecture:** The React app asks a Convex action to create a hosted Dodo checkout for a server-selected product. Dodo’s signed webhook is the only path that activates a paid plan or adds purchased contact credits; webhook event keys make fulfilment safe to retry. Subscription records and invoice links are stored in Convex, and cancellations move to Dodo’s customer portal.

**Tech Stack:** React 19, TypeScript, Convex, `@dodopayments/convex`, Vitest

**Spec:** User request in this task and `/Users/chetan/.codex/attachments/87dd4821-23e6-4856-af58-b5bf9931b341/pasted-text.txt`

## Global Constraints

- Start with `DODO_PAYMENTS_ENVIRONMENT=test_mode`; no live charges during implementation.
- Keep API keys, webhook secrets, and product IDs in Convex environment variables.
- Never grant a paid plan or purchased credits from the browser return URL.
- Only signed, idempotently processed Dodo webhooks may fulfil purchases.
- Keep Creatorly’s own contact-credit balance separate from Dodo’s payment records.

---

### Task 1: Dodo component and billing records

**Files:**
- Modify: `package.json`
- Modify: `convex/convex.config.ts`
- Modify: `convex/schema.ts`

**Interfaces:**
- Produces: Dodo Convex component plus `billingCustomers`, `billingSubscriptions`, `billingPayments`, and `billingWebhookEvents` tables.

- [ ] Install `@dodopayments/convex` and register its Convex component.
- [ ] Add indexed provider records for customers, subscriptions, payments, invoices, and webhook deduplication.
- [ ] Run `npm run build` and confirm schema/type errors are visible before moving on.

### Task 2: Server-owned checkout and billing portal

**Files:**
- Create: `convex/dodo.ts`
- Replace: `convex/billing.ts`
- Test: `src/lib/billingCatalog.test.ts`
- Create: `src/lib/billingCatalog.ts`

**Interfaces:**
- Consumes: authenticated Convex user and server environment product IDs.
- Produces: `billing:createCheckout({ purchase, returnUrl }) -> { checkoutUrl }` and `billing:createCustomerPortal() -> { portalUrl }`.

- [ ] Write catalog tests for plan/credit keys, labels, and credit allocations.
- [ ] Run `npm test -- src/lib/billingCatalog.test.ts` and confirm the missing catalog fails.
- [ ] Add the shared public catalog and a server-side product-ID map that never accepts arbitrary product IDs from the browser.
- [ ] Add authenticated Dodo checkout and portal actions with Creatorly user metadata.
- [ ] Run the catalog test and `npm run build`.

### Task 3: Signed and idempotent fulfilment

**Files:**
- Create: `convex/billingWebhooks.ts`
- Modify: `convex/http.ts`

**Interfaces:**
- Consumes: verified Dodo payment and subscription webhook payloads.
- Produces: persisted payments/invoices, subscription state, plan access, credit allocations, and payment notifications.

- [ ] Add internal mutations that reject duplicate event keys before changing balances.
- [ ] Fulfil one-time contact packs only from `payment.succeeded` metadata.
- [ ] Activate, renew, hold, cancel, fail, and expire core subscriptions from subscription events.
- [ ] Save Dodo customer IDs for later customer-portal access.
- [ ] Register `/dodopayments-webhook` with Dodo’s signature-verifying Convex handler.
- [ ] Run `npm run build` and `npm run lint`.

### Task 4: Replace DemoPay UI

**Files:**
- Modify: `src/data/AppData.tsx`
- Modify: `src/components/PricingView.tsx`
- Modify: `src/components/PaymentResultView.tsx`
- Modify: `src/components/SettingsView.tsx`
- Delete: `src/components/DemoCheckout.tsx`

**Interfaces:**
- Consumes: checkout and portal URLs returned by Convex.
- Produces: hosted-checkout redirects, pending-payment return state, and Dodo billing management.

- [ ] Replace direct paid-plan and credit mutations with checkout creation.
- [ ] Keep local demo mode explicit and non-commercial; it must not pretend to collect money.
- [ ] Change the return page to explain that access updates after webhook confirmation.
- [ ] Replace direct cancellation with the Dodo customer portal.
- [ ] Run focused tests, full tests, lint, and production build.

### Task 5: Configuration and browser verification

**Files:**
- Create: `docs/dodo-payments-setup.md`

**Interfaces:**
- Consumes: Dodo test products, test API key, webhook secret, and deployed Convex URL.
- Produces: exact setup checklist for checkout, webhook URL, test purchase, renewal/failure events, and live-mode cutover.

- [ ] Document every required Convex variable and Dodo product type without including secret values.
- [ ] Verify pricing and settings locally in both signed-out and signed-in states.
- [ ] After explicit approval, upload Convex functions to the development deployment and run a Dodo test checkout.
- [ ] Confirm payment success is idempotent by replaying the same webhook and checking that credits are added once.
