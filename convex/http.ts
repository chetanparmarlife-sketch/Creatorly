import { httpRouter } from "convex/server";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import { createDodoWebhookHandler, type Payment, type Subscription } from "@dodopayments/convex";
import { resolveCreditProduct, resolvePlanProduct } from "./lib/dodoCatalog";

const http = httpRouter();
auth.addHttpRoutes(http);

type WebhookContext = GenericActionCtx<GenericDataModel>;
type DodoEnvelope<T> = { type: string; timestamp: Date; data: T };

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

async function syncDodoPayment(
  ctx: WebhookContext,
  payload: DodoEnvelope<Payment>,
  status: "processing" | "succeeded" | "failed" | "cancelled",
) {
  const productId = payload.data.product_cart?.[0]?.product_id ?? undefined;
  const credits = productId ? resolveCreditProduct(productId) : null;
  const declaredPurchase = metadataString(payload.data.metadata, "creatorly_purchase");
  const kind = declaredPurchase === "contact_credits" && credits
    ? "contact_credits" as const
    : declaredPurchase === "core_plan"
      ? "core_plan" as const
      : "unknown" as const;
  await ctx.runMutation(internal.billingWebhooks.syncPayment, {
    eventKey: `${payload.type}:${payload.data.payment_id}:${payload.timestamp.getTime()}`,
    eventType: payload.type,
    paymentId: payload.data.payment_id,
    userId: metadataString(payload.data.metadata, "creatorly_user_id"),
    dodoCustomerId: payload.data.customer.customer_id,
    customerEmail: payload.data.customer.email,
    productId,
    purchaseKind: kind,
    status,
    amount: payload.data.total_amount,
    currency: payload.data.currency,
    invoiceId: payload.data.invoice_id ?? undefined,
    invoiceUrl: payload.data.invoice_url ?? undefined,
    failureMessage: payload.data.error_message ?? undefined,
    credits: kind === "contact_credits" ? credits ?? undefined : undefined,
  });
}

async function syncDodoSubscription(ctx: WebhookContext, payload: DodoEnvelope<Subscription>, grantCredits: boolean) {
  const plan = resolvePlanProduct(payload.data.product_id);
  await ctx.runMutation(internal.billingWebhooks.syncSubscription, {
    eventKey: `${payload.type}:${payload.data.subscription_id}:${payload.timestamp.getTime()}`,
    eventType: payload.type,
    subscriptionId: payload.data.subscription_id,
    userId: metadataString(payload.data.metadata, "creatorly_user_id"),
    dodoCustomerId: payload.data.customer.customer_id,
    customerEmail: payload.data.customer.email,
    productId: payload.data.product_id,
    tier: plan.tier,
    billingCycle: plan.billingCycle,
    status: payload.data.status,
    nextBillingDate: payload.data.next_billing_date?.getTime(),
    cancelAtNextBillingDate: payload.data.cancel_at_next_billing_date,
    grantCredits,
  });
}

http.route({
  path: "/dodopayments-webhook",
  method: "POST",
  handler: createDodoWebhookHandler({
    onPaymentProcessing: (ctx, payload) => syncDodoPayment(ctx, payload, "processing"),
    onPaymentSucceeded: (ctx, payload) => syncDodoPayment(ctx, payload, "succeeded"),
    onPaymentFailed: (ctx, payload) => syncDodoPayment(ctx, payload, "failed"),
    onPaymentCancelled: (ctx, payload) => syncDodoPayment(ctx, payload, "cancelled"),
    onSubscriptionActive: (ctx, payload) => syncDodoSubscription(ctx, payload, true),
    onSubscriptionRenewed: (ctx, payload) => syncDodoSubscription(ctx, payload, true),
    onSubscriptionUpdated: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionPlanChanged: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionOnHold: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionCancelled: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionFailed: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionExpired: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionPaused: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
    onSubscriptionUnpaused: (ctx, payload) => syncDodoSubscription(ctx, payload, false),
  }),
});

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": "application/json" };
http.route({ pathPrefix: "/extension/", method: "OPTIONS", handler: httpAction(async () => new Response(null,{status:204,headers:cors})) });
http.route({ path: "/extension/profile", method: "GET", handler: httpAction(async (ctx,request) => {
  const url=new URL(request.url);const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const platform=url.searchParams.get("platform");const handle=url.searchParams.get("handle")??"";
  if(platform!=="instagram"&&platform!=="youtube"&&platform!=="linkedin"&&platform!=="twitter")return new Response(JSON.stringify({error:"Invalid platform."}),{status:400,headers:cors});
  const result=await ctx.runQuery(api.extensionApi.profile,{token,platform,handle});return new Response(JSON.stringify(result),{headers:cors});
})});
http.route({ path: "/extension/unlock", method: "POST", handler: httpAction(async (ctx,request) => {
  const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const body=await request.json() as {creatorId:string};
  try { const result=await ctx.runMutation(api.extensionApi.unlock,{token,creatorId:body.creatorId as never});return new Response(JSON.stringify(result),{headers:cors}); } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unlock failed."}),{status:400,headers:cors}); }
})});
http.route({ path: "/extension/save", method: "POST", handler: httpAction(async (ctx,request) => {
  const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const body=await request.json() as {creatorId:string;platform:"instagram"|"youtube"|"linkedin"|"twitter";handle:string};
  try { const result=await ctx.runMutation(api.extensionApi.saveMatched,{token,creatorId:body.creatorId as never,platform:body.platform,handle:body.handle});return new Response(JSON.stringify(result),{headers:cors}); } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Save failed."}),{status:400,headers:cors}); }
})});
http.route({ path: "/extension/save-private", method: "POST", handler: httpAction(async (ctx,request) => {
  const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const body=await request.json() as {platform:"instagram"|"youtube"|"linkedin"|"twitter";handle:string;displayName?:string};
  try { const result=await ctx.runMutation(api.extensionApi.savePrivate,{token,platform:body.platform,handle:body.handle,displayName:body.displayName});return new Response(JSON.stringify(result),{headers:cors}); } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Private save failed."}),{status:400,headers:cors}); }
})});
http.route({ path: "/extension/report-contact", method: "POST", handler: httpAction(async (ctx,request) => {
  const authorization=request.headers.get("Authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");const body=await request.json() as {contactId:string};
  try { const result=await ctx.runMutation(api.extensionApi.reportWrongContact,{token,contactId:body.contactId as never});return new Response(JSON.stringify(result),{headers:cors}); } catch(error) { return new Response(JSON.stringify({error:error instanceof Error?error.message:"Report failed."}),{status:400,headers:cors}); }
})});

export default http;
