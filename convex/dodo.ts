import { DodoPayments, type DodoPaymentsClientConfig } from "@dodopayments/convex";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { components, internal } from "./_generated/api";

const config: DodoPaymentsClientConfig = {
  identify: async (ctx: GenericActionCtx<GenericDataModel>): Promise<{ dodoCustomerId: string } | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const customer: { dodoCustomerId: string } | null = await ctx.runQuery(internal.billingCustomers.getDodoCustomer, { userId });
    return customer ? { dodoCustomerId: customer.dodoCustomerId } : null;
  },
  apiKey: process.env.DODO_PAYMENTS_API_KEY ?? "",
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as "test_mode" | "live_mode",
};

export const dodo: DodoPayments = new DodoPayments(components.dodopayments, config);
type DodoApi = ReturnType<DodoPayments["api"]>;
const dodoApi: DodoApi = dodo.api();
export const checkout: DodoApi["checkout"] = dodoApi.checkout;
export const customerPortal: DodoApi["customerPortal"] = dodoApi.customerPortal;
