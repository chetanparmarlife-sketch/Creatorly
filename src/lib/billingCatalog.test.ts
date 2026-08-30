import { describe, expect, it } from "vitest";
import { getBillingItem, type BillingPurchase } from "./billingCatalog";

describe("billing catalog", () => {
  it.each([
    [{ kind: "core_plan", tier: "basic", billingCycle: "monthly" }, "DODO_BASIC_MONTHLY_PRODUCT_ID", 100],
    [{ kind: "core_plan", tier: "pro", billingCycle: "annual" }, "DODO_PRO_ANNUAL_PRODUCT_ID", 250],
    [{ kind: "contact_credits", credits: 50 }, "DODO_CREDITS_50_PRODUCT_ID", 50],
    [{ kind: "contact_credits", credits: 100 }, "DODO_CREDITS_100_PRODUCT_ID", 100],
  ] as const)("maps %o to a server product and allowance", (purchase, environmentKey, credits) => {
    const item = getBillingItem(purchase as BillingPurchase);

    expect(item.environmentKey).toBe(environmentKey);
    expect(item.credits).toBe(credits);
  });

  it("does not expose an item for the free plan", () => {
    expect(() => getBillingItem({ kind: "core_plan", tier: "free", billingCycle: "monthly" } as never)).toThrow(
      "The Free plan does not require checkout.",
    );
  });
});
