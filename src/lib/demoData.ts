import { normalizeCreatorQuery, rankCreatorMatch } from "./creatorMatching";
import type {
  CreatorContact,
  CreatorDetailData,
  CreatorSearchResult,
  Platform,
  SignUpInput,
  Viewer,
} from "../types";

type DemoCreator = Omit<CreatorSearchResult, "matchScore" | "contactCount"> & {
  normalizedHandle: string;
  contacts: Array<CreatorContact & { accessTier: "basic" | "pro" }>;
};

const verifiedAt = new Date("2026-08-24T10:00:00+05:30").getTime();

const DEMO_CREATORS: DemoCreator[] = [
  {
    id: "maya-creates",
    platform: "instagram",
    handle: "@maya_creates",
    normalizedHandle: "mayacreates",
    displayName: "Maya Kapoor",
    followerCount: 842000,
    location: "Mumbai, India",
    isVerified: true,
    isDemo: true,
    contacts: [
      { id: "maya-direct", contactType: "creator_direct", name: "Maya Kapoor", email: "hello.maya@example.test", contextualNotes: "Email works best for brand briefs.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "basic" },
      { id: "maya-manager", contactType: "manager", name: "Rhea Malhotra", email: "rhea.manager@example.test", contextualNotes: "Share budgets and usage terms in the first note.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "pro" },
    ],
  },
  {
    id: "tech-rishi",
    platform: "youtube",
    handle: "@TheTechRishi",
    normalizedHandle: "techrishi",
    displayName: "Rishi Verma",
    followerCount: 1240000,
    location: "Bengaluru, India",
    isVerified: true,
    isDemo: true,
    contacts: [
      { id: "rishi-direct", contactType: "creator_direct", name: "Rishi Verma", email: "business.rishi@example.test", contextualNotes: "Include the product category in the subject line.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "basic" },
      { id: "rishi-agent", contactType: "agent", name: "Anika Sen", email: "anika.agent@example.test", contextualNotes: "Handles long-term partnerships.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "pro" },
    ],
  },
  {
    id: "fit-aanchal",
    platform: "instagram",
    handle: "@fit.with.aanchal",
    normalizedHandle: "fitwithaanchal",
    displayName: "Aanchal Mehta",
    followerCount: 376000,
    location: "Delhi, India",
    isVerified: false,
    isDemo: true,
    contacts: [
      { id: "aanchal-direct", contactType: "creator_direct", name: "Aanchal Mehta", email: "aanchal.collabs@example.test", contextualNotes: "Prefers wellness and activewear briefs.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "basic" },
    ],
  },
  {
    id: "cook-kabir",
    platform: "youtube",
    handle: "@CookWithKabirOfficial",
    normalizedHandle: "cookwithkabir",
    displayName: "Kabir Arora",
    followerCount: 695000,
    location: "Pune, India",
    isVerified: true,
    isDemo: true,
    contacts: [
      { id: "kabir-manager", contactType: "manager", name: "Dev Iyer", email: "dev.manager@example.test", contextualNotes: "Manager is the only listed campaign contact.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "pro" },
    ],
  },
  {
    id: "travel-noor",
    platform: "instagram",
    handle: "@travelnoor",
    normalizedHandle: "travelnoor",
    displayName: "Noor Khan",
    followerCount: 518000,
    location: "Hyderabad, India",
    isVerified: true,
    isDemo: true,
    contacts: [
      { id: "noor-direct", contactType: "creator_direct", name: "Noor Khan", email: "partnerships.noor@example.test", contextualNotes: "Destination briefs need at least six weeks' notice.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "basic" },
      { id: "noor-assistant", contactType: "assistant", name: "Ira Bose", email: "ira.assistant@example.test", contextualNotes: "Best for scheduling and deliverable follow-up.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "pro" },
    ],
  },
  {
    id: "money-clear",
    platform: "youtube",
    handle: "@MoneyMadeClear",
    normalizedHandle: "moneymadeclear",
    displayName: "Money Made Clear",
    followerCount: 289000,
    location: "Chennai, India",
    isVerified: false,
    isDemo: true,
    contacts: [
      { id: "money-pr", contactType: "pr_rep", name: "Studio North PR", email: "finance.pr@example.test", contextualNotes: "Does not accept high-risk finance products.", verificationStatus: "verified", lastVerifiedAt: verifiedAt, isDemo: true, accessTier: "pro" },
    ],
  },
];

const USER_KEY = "creatorly.demo.user.v1";
const SESSION_KEY = "creatorly.demo.session.v1";
const UNLOCK_KEY = "creatorly.demo.unlocks.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readUser() {
  return readJson<Viewer | null>(USER_KEY, null);
}

function saveUser(user: Viewer) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUnlocks() {
  return readJson<Record<string, number>>(UNLOCK_KEY, {});
}

function latency() {
  return new Promise((resolve) => window.setTimeout(resolve, 180));
}

export const demoData = {
  isAuthenticated() {
    return window.localStorage.getItem(SESSION_KEY) === "active" && Boolean(readUser());
  },
  async signUp(input: SignUpInput) {
    await latency();
    const user: Viewer = {
      id: "demo-user",
      name: input.name,
      email: input.email.trim().toLowerCase(),
      companyName: input.companyName,
      role: "user",
      currentPlanTier: "free",
      creditBalance: 25,
    };
    saveUser(user);
    window.localStorage.setItem(SESSION_KEY, "active");
  },
  async signIn(email: string) {
    await latency();
    const user = readUser();
    if (!user || user.email !== email.trim().toLowerCase()) {
      throw new Error("No demo account matches that email. Create one first.");
    }
    window.localStorage.setItem(SESSION_KEY, "active");
  },
  async signOut() {
    window.localStorage.removeItem(SESSION_KEY);
  },
  async viewer() {
    await latency();
    return readUser();
  },
  async search(query: string, platform?: Platform) {
    await latency();
    return DEMO_CREATORS.flatMap((creator) => {
      if (platform && creator.platform !== platform) return [];
      const matchScore = rankCreatorMatch(query, creator);
      if (matchScore === null) return [];
      return [{
        id: creator.id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        location: creator.location,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
        contactCount: creator.contacts.length,
        matchScore,
      } satisfies CreatorSearchResult];
    }).sort((a, b) => b.matchScore - a.matchScore);
  },
  async detail(creatorId: string): Promise<CreatorDetailData | null> {
    await latency();
    const creator = DEMO_CREATORS.find((item) => item.id === creatorId);
    const user = readUser();
    if (!creator || !user) return null;
    const expiresAt = getUnlocks()[creatorId] ?? null;
    const isUnlocked = Boolean(expiresAt && expiresAt > Date.now());
    const permitted = creator.contacts.filter(
      (contact) => contact.accessTier === "basic" || user.currentPlanTier === "pro",
    );
    return {
      creator: {
        id: creator.id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        location: creator.location,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
      },
      isUnlocked,
      expiresAt: isUnlocked ? expiresAt : null,
      creditBalance: user.creditBalance,
      currentPlanTier: user.currentPlanTier,
      availableContactCount: permitted.length,
      hiddenProContactCount: creator.contacts.length - permitted.length,
      contacts: isUnlocked ? permitted : [],
    };
  },
  async unlock(creatorId: string) {
    await latency();
    const user = readUser();
    if (!user) throw new Error("Sign in to unlock this contact.");
    const unlocks = getUnlocks();
    if (unlocks[creatorId] && unlocks[creatorId] > Date.now()) return;
    if (user.creditBalance < 5) throw new Error("You need 5 credits to unlock this contact.");
    user.creditBalance -= 5;
    unlocks[creatorId] = Date.now() + 30 * 24 * 60 * 60 * 1000;
    saveUser(user);
    window.localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
  },
  normalizeCreatorQuery,
};
