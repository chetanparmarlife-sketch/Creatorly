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
import type {
  AdminContactRequest,
  AdminUser,
  AppNotification,
  CreditTransaction,
  ContactRequestInput,
  ContactRequestResult,
  CreatorDetailData,
  CreatorSearchFilters,
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
  signUp(input: SignUpInput): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getViewer(): Promise<Viewer | null>;
  search(query: string, filters?: CreatorSearchFilters): Promise<CreatorSearchResult[]>;
  browseCreators(input: { cursor: string | null; numItems: number; platform?: Platform; category?: string; location?: string; minFollowers?: number; maxFollowers?: number }): Promise<CreatorSearchPage>;
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
  updateOnboardingStep(step: 1 | 2 | 3 | 4 | 5): Promise<void>;
  updateOnboardingPlan(tier: PlanTier): Promise<void>;
  createCheckout(purchase: BillingPurchase): Promise<{ checkoutUrl: string }>;
  createCustomerPortal(): Promise<{ portalUrl: string }>;
  listTransactions(): Promise<CreditTransaction[]>;
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  listAdminUsers(): Promise<AdminUser[]>;
  createExtensionToken(): Promise<{ token: string }>;
};

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
    },
    signIn: async (email) => {
      await demoData.signIn(email);
      setAuthenticated(true);
    },
    signOut: async () => {
      await demoData.signOut();
      setAuthenticated(false);
    },
    getViewer: demoData.viewer,
    search: demoData.search,
    browseCreators: async ({ cursor, numItems, platform, category, location, minFollowers = 0, maxFollowers }) => {
      const creators = (await demoData.search("", { platform, category, location })).filter(creator => creator.followerCount >= minFollowers && (maxFollowers === undefined || creator.followerCount < maxFollowers));
      const start = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
      const page = creators.slice(start, start + numItems);
      const next = start + page.length;
      return { page, continueCursor: String(next), isDone: next >= creators.length };
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
  }), [authenticated, authLoading]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

type EmptyArgs = Record<string, never>;
type SearchArgs = { query: string; platform?: Platform; category?: string; location?: string; verifiedOnly?: boolean };
type BrowseArgs = { paginationOpts: { cursor: string | null; numItems: number }; platform?: Platform; category?: string; location?: string; minFollowers?: number; maxFollowers?: number };
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
const updateOnboardingStepRef = makeFunctionReference<"mutation">("users:updateOnboardingStep") as FunctionReference<"mutation", "public", { step: 1 | 2 | 3 | 4 | 5 }, unknown>;
const updateOnboardingPlanRef = makeFunctionReference<"mutation">("users:updateOnboardingPlan") as FunctionReference<"mutation", "public", { tier: PlanTier }, unknown>;
const createCheckoutRef = makeFunctionReference<"action">("billing:createCheckout") as FunctionReference<"action", "public", { purchase: BillingPurchase }, { checkoutUrl: string }>;
const createCustomerPortalRef = makeFunctionReference<"action">("billing:createCustomerPortal") as FunctionReference<"action", "public", EmptyArgs, { portalUrl: string }>;
const transactionsRef = makeFunctionReference<"query">("billing:listTransactions") as FunctionReference<"query", "public", EmptyArgs, CreditTransaction[]>;
const notificationsRef = makeFunctionReference<"query">("notifications:listMine") as FunctionReference<"query", "public", EmptyArgs, AppNotification[]>;
const markReadRef = makeFunctionReference<"mutation">("notifications:markRead") as FunctionReference<"mutation", "public", { notificationId: string }, unknown>;
const adminUsersRef = makeFunctionReference<"query">("admin:listUsers") as FunctionReference<"query", "public", EmptyArgs, AdminUser[]>;
const extensionTokenRef = makeFunctionReference<"mutation">("users:createExtensionToken") as FunctionReference<"mutation", "public", EmptyArgs, { token: string }>;

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
    const form = new FormData();
    form.set("flow", "signUp");
    form.set("name", input.name);
    form.set("companyName", input.companyName);
    form.set("email", input.email);
    form.set("password", input.password);
    await authSignIn("password", form);
  }, [authSignIn]);

  const signIn = useCallback(async (email: string, password: string) => {
    const form = new FormData();
    form.set("flow", "signIn");
    form.set("email", email);
    form.set("password", password);
    await authSignIn("password", form);
  }, [authSignIn]);

  const value = useMemo<AppData>(() => ({
    mode: "convex",
    authenticated,
    authLoading,
    signUp,
    signIn,
    signOut: authSignOut,
    getViewer: () => convex.query(viewerRef, {}),
    search: (query, filters = {}) => convex.query(searchRef, { query, ...filters }),
    browseCreators: ({ cursor, numItems, platform, category, location, minFollowers, maxFollowers }) => convex.query(browseRef, { paginationOpts: { cursor, numItems }, platform, category, location, minFollowers, maxFollowers }),
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
  }), [authenticated, authLoading, authSignOut, convex, signIn, signUp]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
