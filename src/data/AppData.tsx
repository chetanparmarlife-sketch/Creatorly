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
  CreatorDetailData,
  CreatorSearchResult,
  DataMode,
  Platform,
  SignUpInput,
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
    unlock: async (creatorId) => {
      await convex.mutation(unlockRef, { creatorId });
    },
  }), [authenticated, authSignOut, convex, signIn, signUp]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
