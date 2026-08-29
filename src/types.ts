export type Platform = "instagram" | "youtube";
export type PlanTier = "free" | "basic" | "pro";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  role: "user" | "admin";
  currentPlanTier: PlanTier;
  creditBalance: number;
};

export type CreatorSearchResult = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followerCount: number;
  location?: string;
  isVerified: boolean;
  isDemo: boolean;
  contactCount: number;
  matchScore: number;
};

export type CreatorContact = {
  id: string;
  contactType: "creator_direct" | "manager" | "agent" | "assistant" | "pr_rep";
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contextualNotes?: string;
  verificationStatus: "verified" | "pending_verification" | "unverified";
  lastVerifiedAt: number;
  isDemo: boolean;
};

export type CreatorDetailData = {
  creator: Omit<CreatorSearchResult, "contactCount" | "matchScore">;
  isUnlocked: boolean;
  expiresAt: number | null;
  creditBalance: number;
  currentPlanTier: PlanTier;
  availableContactCount: number;
  hiddenProContactCount: number;
  contacts: CreatorContact[];
};

export type UnlockHistoryItem = {
  id: string;
  creator: Omit<CreatorSearchResult, "contactCount" | "matchScore">;
  unlockedAt: number;
  expiresAt: number;
  creditsSpent: number;
  status: "active" | "expired";
};

export type SignUpInput = {
  name: string;
  companyName: string;
  email: string;
  password: string;
};

export type DataMode = "convex" | "demo";
