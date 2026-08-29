import { normalizeCreatorQuery, rankCreatorMatch } from "./creatorMatching";
import type {
  AdminContactRequest,
  ContactRequestInput,
  ContactRequestResult,
  CreatorContact,
  CreatorDetailData,
  CreatorSearchResult,
  FulfillRequestInput,
  Platform,
  SignUpInput,
  UnlockHistoryItem,
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
const REQUEST_KEY = "creatorly.demo.requests.v1";
const CUSTOM_CREATORS_KEY = "creatorly.demo.custom-creators.v1";

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

type DemoRequest = AdminContactRequest & {
  userId: string;
  normalizedHandle: string;
  status: "pending" | "fulfilled";
};

function getRequests() {
  return readJson<DemoRequest[]>(REQUEST_KEY, []);
}

function getCustomCreators() {
  return readJson<DemoCreator[]>(CUSTOM_CREATORS_KEY, []);
}

function allCreators() {
  return [...DEMO_CREATORS, ...getCustomCreators()];
}

type DemoUnlockRecord = {
  unlockedAt: number;
  expiresAt: number;
  creditsSpent: number;
};

function getUnlocks(): Record<string, DemoUnlockRecord> {
  const stored = readJson<Record<string, number | DemoUnlockRecord>>(UNLOCK_KEY, {});
  return Object.fromEntries(Object.entries(stored).map(([creatorId, value]) => [
    creatorId,
    typeof value === "number"
      ? { unlockedAt: value - 30 * 24 * 60 * 60 * 1000, expiresAt: value, creditsSpent: 5 }
      : value,
  ]));
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
      role: input.email.trim().toLowerCase() === "admin@creatorly.test" ? "admin" : "user",
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
    return allCreators().flatMap((creator) => {
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
    const creator = allCreators().find((item) => item.id === creatorId);
    const user = readUser();
    if (!creator || !user) return null;
    const expiresAt = getUnlocks()[creatorId]?.expiresAt ?? null;
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
    if (unlocks[creatorId] && unlocks[creatorId].expiresAt > Date.now()) return;
    if (user.creditBalance < 5) throw new Error("You need 5 credits to unlock this contact.");
    const unlockedAt = Date.now();
    user.creditBalance -= 5;
    unlocks[creatorId] = {
      unlockedAt,
      expiresAt: unlockedAt + 30 * 24 * 60 * 60 * 1000,
      creditsSpent: 5,
    };
    saveUser(user);
    window.localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
  },
  async history(): Promise<UnlockHistoryItem[]> {
    await latency();
    const now = Date.now();
    return Object.entries(getUnlocks())
      .flatMap(([creatorId, record]) => {
        const creator = allCreators().find((item) => item.id === creatorId);
        if (!creator) return [];
        return [{
          id: `demo-${creatorId}-${record.unlockedAt}`,
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
          ...record,
          status: record.expiresAt > now ? "active" as const : "expired" as const,
        }];
      })
      .sort((a, b) => b.unlockedAt - a.unlockedAt);
  },
  async requestContact(input: ContactRequestInput): Promise<ContactRequestResult> {
    await latency();
    const user = readUser();
    if (!user) throw new Error("Sign in to request a contact.");
    const handle = input.handle.trim().replace(/^@+/, "");
    const normalizedHandle = normalizeCreatorQuery(handle);
    if (normalizedHandle.length < 2) throw new Error("Enter a valid creator handle.");
    const requests = getRequests();
    const existing = requests.find((request) =>
      request.userId === user.id
      && request.status === "pending"
      && request.requestedPlatform === input.platform
      && request.normalizedHandle === normalizedHandle
    );
    if (existing) return { status: "already_pending", requestId: existing.id };
    const request: DemoRequest = {
      id: `request-${Date.now()}`,
      userId: user.id,
      normalizedHandle,
      requestedHandle: `@${handle}`,
      requestedPlatform: input.platform,
      notes: input.notes?.trim() || undefined,
      requestDate: Date.now(),
      requester: { name: user.name, email: user.email, companyName: user.companyName },
      status: "pending",
    };
    window.localStorage.setItem(REQUEST_KEY, JSON.stringify([request, ...requests]));
    return { status: "created", requestId: request.id };
  },
  async listAdminRequests(): Promise<AdminContactRequest[]> {
    await latency();
    const user = readUser();
    if (!user || user.role !== "admin") throw new Error("Admin access required.");
    return getRequests()
      .filter((request) => request.status === "pending")
      .sort((a, b) => b.requestDate - a.requestDate);
  },
  async fulfillRequest(input: FulfillRequestInput): Promise<{ creatorId: string; fulfilledCount: number }> {
    await latency();
    const user = readUser();
    if (!user || user.role !== "admin") throw new Error("Admin access required.");
    const requests = getRequests();
    const selected = requests.find((request) => request.id === input.requestId && request.status === "pending");
    if (!selected) throw new Error("Pending request not found.");
    const normalizedHandle = normalizeCreatorQuery(input.creator.handle);
    if (selected.requestedPlatform !== input.creator.platform || selected.normalizedHandle !== normalizedHandle) {
      throw new Error("Creator platform and handle must match the request.");
    }
    const existing = allCreators().find((creator) =>
      creator.platform === input.creator.platform && creator.normalizedHandle === normalizedHandle
    );
    const creatorId = existing?.id ?? `custom-${normalizedHandle}`;
    if (!existing) {
      const customCreator: DemoCreator = {
        id: creatorId,
        platform: input.creator.platform,
        handle: input.creator.handle.startsWith("@") ? input.creator.handle : `@${input.creator.handle}`,
        normalizedHandle,
        displayName: input.creator.displayName,
        followerCount: input.creator.followerCount,
        location: input.creator.location,
        isVerified: input.creator.isVerified,
        isDemo: true,
        contacts: [{
          id: `contact-${Date.now()}`,
          contactType: input.contact.contactType,
          name: input.contact.name,
          email: input.contact.email,
          phone: input.contact.phone,
          whatsapp: input.contact.whatsapp,
          contextualNotes: input.contact.contextualNotes,
          verificationStatus: "verified",
          lastVerifiedAt: Date.now(),
          isDemo: true,
          accessTier: input.contact.accessTier,
        }],
      };
      window.localStorage.setItem(CUSTOM_CREATORS_KEY, JSON.stringify([...getCustomCreators(), customCreator]));
    }
    let fulfilledCount = 0;
    const updated = requests.map((request) => {
      if (request.status === "pending" && request.requestedPlatform === input.creator.platform && request.normalizedHandle === normalizedHandle) {
        fulfilledCount += 1;
        return { ...request, status: "fulfilled" as const };
      }
      return request;
    });
    window.localStorage.setItem(REQUEST_KEY, JSON.stringify(updated));
    return { creatorId, fulfilledCount };
  },
  normalizeCreatorQuery,
};
