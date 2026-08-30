import type { PlanTier } from "../types";

export type BillingCycle = "monthly" | "annual";
export type PaidPlanTier = Exclude<PlanTier, "free">;
export type BillingPurchase =
  | { kind: "core_plan"; tier: PaidPlanTier; billingCycle: BillingCycle }
  | { kind: "contact_credits"; credits: 50 | 100 };

export type BillingItem = {
  key: string;
  label: string;
  environmentKey:
    | "DODO_BASIC_MONTHLY_PRODUCT_ID"
    | "DODO_BASIC_ANNUAL_PRODUCT_ID"
    | "DODO_PRO_MONTHLY_PRODUCT_ID"
    | "DODO_PRO_ANNUAL_PRODUCT_ID"
    | "DODO_CREDITS_50_PRODUCT_ID"
    | "DODO_CREDITS_100_PRODUCT_ID";
  credits: number;
};

export function getBillingItem(purchase: BillingPurchase): BillingItem {
  if (purchase.kind === "contact_credits") {
    return purchase.credits === 50
      ? { key: "credits_50", label: "50 contact credits", environmentKey: "DODO_CREDITS_50_PRODUCT_ID", credits: 50 }
      : { key: "credits_100", label: "100 contact credits", environmentKey: "DODO_CREDITS_100_PRODUCT_ID", credits: 100 };
  }

  if ((purchase as { tier: string }).tier === "free") throw new Error("The Free plan does not require checkout.");
  const prefix = purchase.tier === "basic" ? "BASIC" : "PRO";
  const suffix = purchase.billingCycle === "monthly" ? "MONTHLY" : "ANNUAL";
  return {
    key: `${purchase.tier}_${purchase.billingCycle}`,
    label: `${purchase.tier === "basic" ? "Basic" : "Pro"} core · ${purchase.billingCycle}`,
    environmentKey: `DODO_${prefix}_${suffix}_PRODUCT_ID`,
    credits: purchase.tier === "basic" ? 100 : 250,
  };
}
