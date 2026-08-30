import { ConvexError } from "convex/values";

export type BillingCycle = "monthly" | "annual";
export type PaidPlanTier = "basic" | "pro";
export type CheckoutPurchase =
  | { kind: "core_plan"; tier: PaidPlanTier; billingCycle: BillingCycle }
  | { kind: "contact_credits"; credits: 50 | 100 };

const productEnvironmentKeys = {
  basic_monthly: "DODO_BASIC_MONTHLY_PRODUCT_ID",
  basic_annual: "DODO_BASIC_ANNUAL_PRODUCT_ID",
  pro_monthly: "DODO_PRO_MONTHLY_PRODUCT_ID",
  pro_annual: "DODO_PRO_ANNUAL_PRODUCT_ID",
  credits_50: "DODO_CREDITS_50_PRODUCT_ID",
  credits_100: "DODO_CREDITS_100_PRODUCT_ID",
} as const;

export function getCheckoutProduct(purchase: CheckoutPurchase) {
  const key = purchase.kind === "core_plan"
    ? `${purchase.tier}_${purchase.billingCycle}` as keyof typeof productEnvironmentKeys
    : `credits_${purchase.credits}` as keyof typeof productEnvironmentKeys;
  const environmentKey = productEnvironmentKeys[key];
  const productId = process.env[environmentKey];
  if (!productId) throw new ConvexError(`Billing is not configured for ${key}. Add ${environmentKey} to Convex.`);
  return { key, productId, environmentKey };
}

export function resolvePlanProduct(productId: string) {
  for (const [key, environmentKey] of Object.entries(productEnvironmentKeys)) {
    if (!key.startsWith("credits_") && process.env[environmentKey] === productId) {
      const [tier, billingCycle] = key.split("_") as [PaidPlanTier, BillingCycle];
      return { tier, billingCycle };
    }
  }
  throw new ConvexError("Dodo subscription product is not mapped to a Creatorly core plan.");
}

export function resolveCreditProduct(productId: string) {
  if (process.env.DODO_CREDITS_50_PRODUCT_ID === productId) return 50 as const;
  if (process.env.DODO_CREDITS_100_PRODUCT_ID === productId) return 100 as const;
  return null;
}

export function requireCreatorlyAppUrl() {
  const value = process.env.CREATORLY_APP_URL;
  if (!value) throw new ConvexError("Billing is not configured. Add CREATORLY_APP_URL to Convex.");
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new ConvexError("CREATORLY_APP_URL must use HTTPS outside localhost.");
  }
  return url.origin;
}
