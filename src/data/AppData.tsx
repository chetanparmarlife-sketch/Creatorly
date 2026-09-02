import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import {
  makeFunctionReference,
  type FunctionReference,
} from "convex/server";
import { demoData } from "../lib/demoData";
import { demoClaimData } from "../features/claim/demoClaimData";
import type {
  AdminContactRequest,
  AdminCreatorClaim,
  AdminUser,
  AppNotification,
  CreditTransaction,
  ContactRequestInput,
  ContactRequestResult,
  CreatorDetailData,
  CreatorLocationFacets,
  CreatorClaim,
  CreatorClaimLookup,
  CreatorClaimProfileInput,
  CreatorVerificationMethod,
  CreatorSearchFilters,
  EngagementRateBasis,
  CreatorSearchPage,
  CreatorSearchResult,
  DataMode,
  FulfillRequestInput,
  Platform,
  NotificationPreferences,
  PlanTier,
  SignUpInput,
  UnlockHistoryItem,
  Viewer,
} from "../types";
import type { BillingPurchase } from "../lib/billingCatalog";

type AppData = {
  mode: DataMode;
  authenticated: boolean;
  authLoading: boolean;
  signUp(input: SignUpInput): Promise<AuthStartResult>;
  signIn(email: string, password: string): Promise<AuthStartResult>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendEmailVerification(email: string): Promise<void>;
  signOut(): Promise<void>;
  getViewer(): Promise<Viewer | null>;
  search(query: string, filters?: CreatorSearchFilters): Promise<CreatorSearchResult[]>;
  browseCreators(input: { cursor: string | null; numItems: number; platform?: Platform; category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: EngagementRateBasis; sortField?: "name" | "audience" | "location"; sortDirection?: "asc" | "desc" }): Promise<CreatorSearchPage>;
  countCreators(input: { platform?: Platform; category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: EngagementRateBasis }): Promise<number>;
  listCreatorLocations(): Promise<CreatorLocationFacets>;
  getDetail(creatorId: string): Promise<CreatorDetailData | null>;
  getHistory(): Promise<UnlockHistoryItem[]>;
  requestContact(input: ContactRequestInput): Promise<ContactRequestResult>;
  listAdminRequests(): Promise<AdminContactRequest[]>;
  fulfillRequest(input: FulfillRequestInput): Promise<{ creatorId: string; fulfilledCount: number }>;
  unlock(creatorId: string): Promise<void>;
  reportWrongContact(contactId: string): Promise<{ status: "created" | "already_reported" }>;
  updateProfile(input: { name: string; companyName: string; phone?: string }): Promise<void>;
  updateNotifications(input: NotificationPreferences): Promise<void>;
  completeOnboarding(): Promise<void>;
  updateOnboardingStep(step: 1 | 2 | 3): Promise<void>;
  updateOnboardingPlan(tier: PlanTier): Promise<void>;
  createCheckout(purchase: BillingPurchase): Promise<{ checkoutUrl: string }>;
  createCustomerPortal(): Promise<{ portalUrl: string }>;
  listTransactions(): Promise<CreditTransaction[]>;
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  listAdminUsers(): Promise<AdminUser[]>;
  createExtensionToken(): Promise<{ token: string }>;
  lookupInstagram(input: string): Promise<CreatorClaimLookup>;
  getMyCreatorClaim(): Promise<CreatorClaim | null>;
  startCreatorClaim(input: string): Promise<{ claimId: string }>;
  saveCreatorClaim(input: CreatorClaimProfileInput): Promise<void>;
  uploadCreatorClaimAsset(claimId: string, kind: "media_kit" | "audience_screenshot", file: File, label?: string): Promise<void>;
  removeCreatorClaimAsset(assetId: string): Promise<void>;
  issueCreatorVerification(claimId: string, method: CreatorVerificationMethod): Promise<{ code: string; expiresAt: number }>;
  submitCreatorVerification(claimId: string): Promise<void>;
  submitCreatorClaim(claimId: string, acceptTerms: boolean): Promise<void>;
  listCreatorClaimsForAdmin(): Promise<AdminCreatorClaim[]>;
  reviewCreatorClaim(claimId: string, decision: "approve" | "reject" | "request_changes", note?: string, contactVerified?: boolean): Promise<void>;
};

type AuthStartResult = { email: string; verificationRequired: boolean };

const AppDataContext = createContext<AppData | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("AppDataProvider is missing.");
  return value;
}

export function DemoDataProvider({ children, authLoading = false }: { children: ReactNode; authLoading?: boolean }) {
  const [authenticated, setAuthenticated] = useState(demoData.isAuthenticated);
  const value = useMemo<AppData>(() => ({
    mode: "demo",
    authenticated,
    authLoading,
    signUp: async (input) => {
      await demoData.signUp(input);
      setAuthenticated(true);
      return { email: input.email.trim().toLowerCase(), verificationRequired: false };
    },
    signIn: async (email) => {
      await demoData.signIn(email);
      setAuthenticated(true);
      return { email: email.trim().toLowerCase(), verificationRequired: false };
    },
    verifyEmail: async () => undefined,
    resendEmailVerification: async () => undefined,
    signOut: async () => {
      await demoData.signOut();
      setAuthenticated(false);
    },
    getViewer: demoData.viewer,
    search: demoData.search,
    browseCreators: async ({ cursor, numItems, platform, category, location, country, city, postalCode, verifiedOnly, minFollowers = 0, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis, sortField = "audience", sortDirection = "desc" }) => {
      const creators = (await demoData.search("", { platform, category, location, country, city, postalCode, verifiedOnly, minEngagementRate, maxEngagementRate, engagementRateBasis }))
        .filter(creator => creator.followerCount >= minFollowers && (maxFollowers === undefined || creator.followerCount < maxFollowers))
        .sort((left, right) => {
          const comparison = sortField === "name" ? left.displayName.localeCompare(right.displayName) : sortField === "location" ? (left.location ?? "").localeCompare(right.location ?? "") : left.followerCount - right.followerCount;
          return comparison * (sortDirection === "asc" ? 1 : -1);
        });
      const start = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
      const page = creators.slice(start, start + numItems);
      const next = start + page.length;
      return { page, continueCursor: String(next), isDone: next >= creators.length, totalCount: creators.length };
    },
    countCreators: async ({ platform, category, location, country, city, postalCode, verifiedOnly, minFollowers = 0, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis }) => (await demoData.search("", { platform, category, location, country, city, postalCode, verifiedOnly, minEngagementRate, maxEngagementRate, engagementRateBasis }))
      .filter(creator => creator.followerCount >= minFollowers && (maxFollowers === undefined || creator.followerCount < maxFollowers)).length,
    listCreatorLocations: async () => {
      const creators = await demoData.search("");
      return {
        countries: [...new Set(creators.map(creator => creator.country).filter((value): value is string => Boolean(value)))].sort(),
        cities: [...new Map(creators.filter(creator => creator.city).map(creator => [`${creator.city}:${creator.country ?? ""}`, { city: creator.city!, country: creator.country }])).values()].sort((a, b) => a.city.localeCompare(b.city)),
        postalCodes: [...new Map(creators.filter(creator => creator.postalCode).map(creator => [`${creator.postalCode}:${creator.city ?? ""}:${creator.country ?? ""}`, { postalCode: creator.postalCode!, city: creator.city, country: creator.country }])).values()].sort((a, b) => a.postalCode.localeCompare(b.postalCode)),
      };
    },
    getDetail: demoData.detail,
    getHistory: demoData.history,
    requestContact: demoData.requestContact,
    listAdminRequests: demoData.listAdminRequests,
    fulfillRequest: demoData.fulfillRequest,
    unlock: demoData.unlock,
    reportWrongContact: demoData.reportWrongContact,
    updateProfile: demoData.updateProfile,
    updateNotifications: demoData.updateNotifications,
    completeOnboarding: demoData.completeOnboarding,
    updateOnboardingStep: demoData.updateOnboardingStep,
    updateOnboardingPlan: demoData.updateOnboardingPlan,
    createCheckout: async () => { throw new Error("Dodo checkout requires the connected Creatorly backend."); },
    createCustomerPortal: async () => { throw new Error("Dodo billing management requires the connected Creatorly backend."); },
    listTransactions: demoData.listTransactions,
    listNotifications: demoData.listNotifications,
    markNotificationRead: demoData.markNotificationRead,
    listAdminUsers: demoData.listAdminUsers,
    createExtensionToken: async () => ({ token: `crx_demo_${Date.now()}` }),
    lookupInstagram: demoClaimData.lookupInstagram.bind(demoClaimData),
    getMyCreatorClaim: demoClaimData.getMine,
    startCreatorClaim: demoClaimData.start.bind(demoClaimData),
    saveCreatorClaim: demoClaimData.saveProfile,
    uploadCreatorClaimAsset: demoClaimData.uploadAsset,
    removeCreatorClaimAsset: demoClaimData.removeAsset,
    issueCreatorVerification: demoClaimData.issueVerification,
    submitCreatorVerification: demoClaimData.submitVerification,
    submitCreatorClaim: demoClaimData.submitForReview,
    listCreatorClaimsForAdmin: async () => [],
    reviewCreatorClaim: async () => undefined,
  }), [authenticated, authLoading]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

type EmptyArgs = Record<string, never>;
type SearchArgs = { query: string; platform?: Platform; category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: EngagementRateBasis; sortField?: "name" | "audience" | "location"; sortDirection?: "asc" | "desc" };
type BrowseArgs = { paginationOpts: { cursor: string | null; numItems: number }; platform?: Platform; category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: EngagementRateBasis; sortField?: "name" | "audience" | "location"; sortDirection?: "asc" | "desc" };
type CountArgs = { paginationOpts: { cursor: string | null; numItems: number }; platform?: Platform; category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: EngagementRateBasis };
type CountPage = { count: number; continueCursor: string; isDone: boolean };
type DetailArgs = { creatorId: string };

const viewerRef = makeFunctionReference<"query">("users:viewer") as FunctionReference<
  "query", "public", EmptyArgs, Viewer | null
>;
const searchRef = makeFunctionReference<"query">("creators:search") as FunctionReference<
  "query", "public", SearchArgs, CreatorSearchResult[]
>;
const browseRef = makeFunctionReference<"query">("creators:browsePage") as FunctionReference<
  "query", "public", BrowseArgs, CreatorSearchPage
>;
const countRef = makeFunctionReference<"query">("creators:countPage") as FunctionReference<
  "query", "public", CountArgs, CountPage
>;
const locationFacetsRef = makeFunctionReference<"query">("creators:listLocationFacets") as FunctionReference<
  "query", "public", EmptyArgs, CreatorLocationFacets
>;
const detailRef = makeFunctionReference<"query">("creators:getById") as FunctionReference<
  "query", "public", DetailArgs, CreatorDetailData | null
>;
const unlockRef = makeFunctionReference<"mutation">("unlocks:unlock") as FunctionReference<
  "mutation", "public", DetailArgs, unknown
>;
const reportWrongContactRef = makeFunctionReference<"mutation">("contactFlags:reportWrongContact") as FunctionReference<
  "mutation", "public", { contactId: string }, { status: "created" | "already_reported" }
>;
const historyRef = makeFunctionReference<"query">("unlocks:listHistory") as FunctionReference<
  "query", "public", EmptyArgs, UnlockHistoryItem[]
>;
const requestContactRef = makeFunctionReference<"mutation">("contactRequests:create") as FunctionReference<
  "mutation", "public", ContactRequestInput, ContactRequestResult
>;
const adminRequestsRef = makeFunctionReference<"query">("admin:listRequests") as FunctionReference<
  "query", "public", EmptyArgs, AdminContactRequest[]
>;
const fulfillRequestRef = makeFunctionReference<"mutation">("admin:fulfillRequest") as FunctionReference<
  "mutation", "public", FulfillRequestInput, { creatorId: string; fulfilledCount: number }
>;
const updateProfileRef = makeFunctionReference<"mutation">("users:updateProfile") as FunctionReference<"mutation", "public", { name: string; companyName: string; phone?: string }, unknown>;
const updateNotificationsRef = makeFunctionReference<"mutation">("users:updateNotifications") as FunctionReference<"mutation", "public", NotificationPreferences, unknown>;
const completeOnboardingRef = makeFunctionReference<"mutation">("users:completeOnboarding") as FunctionReference<"mutation", "public", EmptyArgs, unknown>;
const updateOnboardingStepRef = makeFunctionReference<"mutation">("users:updateOnboardingStep") as FunctionReference<"mutation", "public", { step: 1 | 2 | 3 }, unknown>;
const updateOnboardingPlanRef = makeFunctionReference<"mutation">("users:updateOnboardingPlan") as FunctionReference<"mutation", "public", { tier: PlanTier }, unknown>;
const createCheckoutRef = makeFunctionReference<"action">("billing:createCheckout") as FunctionReference<"action", "public", { purchase: BillingPurchase }, { checkoutUrl: string }>;
const createCustomerPortalRef = makeFunctionReference<"action">("billing:createCustomerPortal") as FunctionReference<"action", "public", EmptyArgs, { portalUrl: string }>;
const transactionsRef = makeFunctionReference<"query">("billing:listTransactions") as FunctionReference<"query", "public", EmptyArgs, CreditTransaction[]>;
const notificationsRef = makeFunctionReference<"query">("notifications:listMine") as FunctionReference<"query", "public", EmptyArgs, AppNotification[]>;
const markReadRef = makeFunctionReference<"mutation">("notifications:markRead") as FunctionReference<"mutation", "public", { notificationId: string }, unknown>;
const adminUsersRef = makeFunctionReference<"query">("admin:listUsers") as FunctionReference<"query", "public", EmptyArgs, AdminUser[]>;
const extensionTokenRef = makeFunctionReference<"mutation">("users:createExtensionToken") as FunctionReference<"mutation", "public", EmptyArgs, { token: string }>;
const claimLookupRef = makeFunctionReference<"query">("creatorClaims:lookupInstagram") as FunctionReference<"query", "public", { input: string }, CreatorClaimLookup>;
const myClaimRef = makeFunctionReference<"query">("creatorClaims:getMine") as FunctionReference<"query", "public", EmptyArgs, CreatorClaim | null>;
const startClaimRef = makeFunctionReference<"mutation">("creatorClaims:start") as FunctionReference<"mutation", "public", { input: string }, { claimId: string }>;
const saveClaimRef = makeFunctionReference<"mutation">("creatorClaims:saveProfile") as FunctionReference<"mutation", "public", CreatorClaimProfileInput, unknown>;
const claimUploadUrlRef = makeFunctionReference<"mutation">("creatorClaims:generateUploadUrl") as FunctionReference<"mutation", "public", { claimId: string }, string>;
const saveClaimAssetRef = makeFunctionReference<"mutation">("creatorClaims:saveAsset") as FunctionReference<"mutation", "public", { claimId: string; storageId: string; kind: "media_kit" | "audience_screenshot"; fileName: string; contentType: string; byteSize: number; label?: string }, unknown>;
const removeClaimAssetRef = makeFunctionReference<"mutation">("creatorClaims:removeAsset") as FunctionReference<"mutation", "public", { assetId: string }, unknown>;
const issueClaimVerificationRef = makeFunctionReference<"mutation">("creatorClaims:issueVerification") as FunctionReference<"mutation", "public", { claimId: string; method: CreatorVerificationMethod }, { code: string; expiresAt: number }>;
const submitClaimVerificationRef = makeFunctionReference<"action">("creatorClaims:submitVerification") as FunctionReference<"action", "public", { claimId: string }, unknown>;
const submitClaimRef = makeFunctionReference<"mutation">("creatorClaims:submitForReview") as FunctionReference<"mutation", "public", { claimId: string; acceptTerms: boolean }, unknown>;
const adminClaimsRef = makeFunctionReference<"query">("creatorClaims:listForAdmin") as FunctionReference<"query", "public", EmptyArgs, AdminCreatorClaim[]>;
const reviewClaimRef = makeFunctionReference<"mutation">("creatorClaims:review") as FunctionReference<"mutation", "public", { claimId: string; decision: "approve" | "reject" | "request_changes"; note?: string; contactVerified?: boolean }, unknown>;

export function ConvexDataProvider({
  authenticated,
  authLoading,
  children,
}: {
  authenticated: boolean;
  authLoading: boolean;
  children: ReactNode;
}) {
  const convex = useConvex();
  const { signIn: authSignIn, signOut: authSignOut } = useAuthActions();

  const signUp = useCallback(async (input: SignUpInput) => {
    const email = input.email.trim().toLowerCase();
    const form = new FormData();
    form.set("flow", "signUp");
    form.set("name", input.name);
    form.set("companyName", input.companyName ?? "");
    form.set("persona", input.persona ?? "buyer");
    form.set("email", email);
    form.set("password", input.password);
    const result = await authSignIn("password", form);
    return { email, verificationRequired: !result.signingIn };
  }, [authSignIn]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const form = new FormData();
    form.set("flow", "signIn");
    form.set("email", normalizedEmail);
    form.set("password", password);
    const result = await authSignIn("password", form);
    return { email: normalizedEmail, verificationRequired: !result.signingIn };
  }, [authSignIn]);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const form = new FormData();
    form.set("flow", "email-verification");
    form.set("email", email.trim().toLowerCase());
    form.set("code", code.trim());
    const result = await authSignIn("password", form);
    if (!result.signingIn) throw new Error("The verification code is invalid or expired.");
  }, [authSignIn]);

  const resendEmailVerification = useCallback(async (email: string) => {
    const form = new FormData();
    form.set("flow", "email-verification");
    form.set("email", email.trim().toLowerCase());
    await authSignIn("password", form);
  }, [authSignIn]);

  const value = useMemo<AppData>(() => ({
    mode: "convex",
    authenticated,
    authLoading,
    signUp,
    signIn,
    verifyEmail,
    resendEmailVerification,
    signOut: authSignOut,
    getViewer: () => convex.query(viewerRef, {}),
    search: (query, filters = {}) => convex.query(searchRef, { query, ...filters }),
    browseCreators: async ({ cursor, numItems, platform, category, location, country, city, postalCode, verifiedOnly, minFollowers, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis, sortField, sortDirection }) => {
      const filters = { platform, category, location, country, city, postalCode, verifiedOnly, minFollowers, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis, sortField, sortDirection };
      const result = await convex.query(browseRef, { paginationOpts: { cursor, numItems }, ...filters });
      return { ...result, continueCursor: result.continueCursor ?? "" };
    },
    countCreators: async ({ platform, category, location, country, city, postalCode, verifiedOnly, minFollowers, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis }) => {
      let cursor: string | null = null;
      let total = 0;
      for (let pageNumber = 0; pageNumber < 2_000; pageNumber += 1) {
        const result: CountPage = await convex.query(countRef, { paginationOpts: { cursor, numItems: 100 }, platform, category, location, country, city, postalCode, verifiedOnly, minFollowers, maxFollowers, minEngagementRate, maxEngagementRate, engagementRateBasis });
        total += result.count;
        if (result.isDone) return total;
        if (!result.continueCursor || result.continueCursor === cursor) return total;
        cursor = result.continueCursor;
      }
      return total;
    },
    listCreatorLocations: () => convex.query(locationFacetsRef, {}),
    getDetail: (creatorId) => convex.query(detailRef, { creatorId }),
    getHistory: () => convex.query(historyRef, {}),
    requestContact: (input) => convex.mutation(requestContactRef, input),
    listAdminRequests: () => convex.query(adminRequestsRef, {}),
    fulfillRequest: (input) => convex.mutation(fulfillRequestRef, input),
    unlock: async (creatorId) => {
      await convex.mutation(unlockRef, { creatorId });
    },
    reportWrongContact: (contactId) => convex.mutation(reportWrongContactRef, { contactId }),
    updateProfile: async (input) => { await convex.mutation(updateProfileRef, input); },
    updateNotifications: async (input) => { await convex.mutation(updateNotificationsRef, input); },
    completeOnboarding: async () => { await convex.mutation(completeOnboardingRef, {}); },
    updateOnboardingStep: async (step) => { await convex.mutation(updateOnboardingStepRef, { step }); },
    updateOnboardingPlan: async (tier) => { await convex.mutation(updateOnboardingPlanRef, { tier }); },
    createCheckout: (billingPurchase) => convex.action(createCheckoutRef, { purchase: billingPurchase }),
    createCustomerPortal: () => convex.action(createCustomerPortalRef, {}),
    listTransactions: () => convex.query(transactionsRef, {}),
    listNotifications: () => convex.query(notificationsRef, {}),
    markNotificationRead: async (notificationId) => { await convex.mutation(markReadRef, { notificationId }); },
    listAdminUsers: () => convex.query(adminUsersRef, {}),
    createExtensionToken: () => convex.mutation(extensionTokenRef, {}),
    lookupInstagram: (input) => convex.query(claimLookupRef, { input }),
    getMyCreatorClaim: () => convex.query(myClaimRef, {}),
    startCreatorClaim: (input) => convex.mutation(startClaimRef, { input }),
    saveCreatorClaim: async (input) => { await convex.mutation(saveClaimRef, input); },
    uploadCreatorClaimAsset: async (claimId, kind, file, label) => {
      const uploadUrl = await convex.mutation(claimUploadUrlRef, { claimId });
      const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!upload.ok) throw new Error("The file could not be uploaded. Try again.");
      const { storageId } = await upload.json() as { storageId: string };
      await convex.mutation(saveClaimAssetRef, { claimId, storageId, kind, fileName: file.name, contentType: file.type, byteSize: file.size, label });
    },
    removeCreatorClaimAsset: async (assetId) => { await convex.mutation(removeClaimAssetRef, { assetId }); },
    issueCreatorVerification: (claimId, method) => convex.mutation(issueClaimVerificationRef, { claimId, method }),
    submitCreatorVerification: async (claimId) => { await convex.action(submitClaimVerificationRef, { claimId }); },
    submitCreatorClaim: async (claimId, acceptTerms) => { await convex.mutation(submitClaimRef, { claimId, acceptTerms }); },
    listCreatorClaimsForAdmin: () => convex.query(adminClaimsRef, {}),
    reviewCreatorClaim: async (claimId, decision, note, contactVerified) => { await convex.mutation(reviewClaimRef, { claimId, decision, note, contactVerified }); },
  }), [authenticated, authLoading, authSignOut, convex, resendEmailVerification, signIn, signUp, verifyEmail]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
