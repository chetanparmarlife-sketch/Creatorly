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
  ContactRequestInput,
  ContactRequestResult,
  CreatorDetailData,
  CreatorSearchResult,
  DataMode,
  FulfillRequestInput,
  Platform,
  SignUpInput,
  UnlockHistoryItem,
  Viewer,
} from "../types";

type AppData = {
  mode: DataMode;
  authenticated: boolean;
  signUp(input: SignUpInput): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getViewer(): Promise<Viewer | null>;
  search(query: string, platform?: Platform): Promise<CreatorSearchResult[]>;
  getDetail(creatorId: string): Promise<CreatorDetailData | null>;
  getHistory(): Promise<UnlockHistoryItem[]>;
  requestContact(input: ContactRequestInput): Promise<ContactRequestResult>;
  listAdminRequests(): Promise<AdminContactRequest[]>;
  fulfillRequest(input: FulfillRequestInput): Promise<{ creatorId: string; fulfilledCount: number }>;
  unlock(creatorId: string): Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("AppDataProvider is missing.");
  return value;
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(demoData.isAuthenticated);
  const value = useMemo<AppData>(() => ({
    mode: "demo",
    authenticated,
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
    getDetail: demoData.detail,
    getHistory: demoData.history,
    requestContact: demoData.requestContact,
    listAdminRequests: demoData.listAdminRequests,
    fulfillRequest: demoData.fulfillRequest,
    unlock: demoData.unlock,
  }), [authenticated]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

type EmptyArgs = Record<string, never>;
type SearchArgs = { query: string; platform?: Platform };
type DetailArgs = { creatorId: string };

const viewerRef = makeFunctionReference<"query">("users:viewer") as FunctionReference<
  "query", "public", EmptyArgs, Viewer | null
>;
const searchRef = makeFunctionReference<"query">("creators:search") as FunctionReference<
  "query", "public", SearchArgs, CreatorSearchResult[]
>;
const detailRef = makeFunctionReference<"query">("creators:getById") as FunctionReference<
  "query", "public", DetailArgs, CreatorDetailData | null
>;
const unlockRef = makeFunctionReference<"mutation">("unlocks:unlock") as FunctionReference<
  "mutation", "public", DetailArgs, unknown
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

export function ConvexDataProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
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
    signUp,
    signIn,
    signOut: authSignOut,
    getViewer: () => convex.query(viewerRef, {}),
    search: (query, platform) => convex.query(searchRef, { query, platform }),
    getDetail: (creatorId) => convex.query(detailRef, { creatorId }),
    getHistory: () => convex.query(historyRef, {}),
    requestContact: (input) => convex.mutation(requestContactRef, input),
    listAdminRequests: () => convex.query(adminRequestsRef, {}),
    fulfillRequest: (input) => convex.mutation(fulfillRequestRef, input),
    unlock: async (creatorId) => {
      await convex.mutation(unlockRef, { creatorId });
    },
  }), [authenticated, authSignOut, convex, signIn, signUp]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
