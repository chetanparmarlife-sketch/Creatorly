export type Platform = "instagram" | "youtube";
export type PlanTier = "free" | "basic" | "pro";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  role: "user" | "admin";
  currentPlanTier: PlanTier;
  creditBalance: number;
  subscriptionStatus: "active" | "past_due" | "cancelled" | "trial";
  subscriptionRenewalDate?: number;
  cancellationRequestedAt?: number;
  onboardingCompleted: boolean;
  isEmailVerified: boolean;
  notificationPreferences: NotificationPreferences;
};

export type NotificationPreferences = {
  requestFulfilled: boolean;
  lowBalance: boolean;
  expirationWarning: boolean;
  weeklySummary: boolean;
};

export type CreditTransaction = {
  _id: string;
  amount: number;
  transactionType: "signup_bonus" | "subscription_allocation" | "purchase" | "unlock_usage" | "admin_adjustment" | "refund";
  description: string;
  referenceId?: string;
  createdAt: number;
};

export type AppNotification = {
  _id: string;
  type: "request_fulfilled" | "low_balance" | "expiration_warning" | "weekly_summary" | "payment" | "system";
  title: string;
  message: string;
  href?: string;
  readAt?: number;
  createdAt: number;
};

export type AdminUser = Pick<Viewer, "id" | "name" | "email" | "companyName" | "role" | "currentPlanTier" | "creditBalance" | "subscriptionStatus">;

export type CreatorSearchResult = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followerCount: number;
  location?: string;
  categories?: string[];
  isVerified: boolean;
  isDemo: boolean;
  contactCount: number;
  matchScore: number;
};

export type FollowerBand = "any" | "not_reported" | "under_1k" | "1k_5k" | "5k_10k";

export type CreatorSearchFilters = {
  platform?: Platform;
  followerBand?: FollowerBand;
  category?: string;
  location?: string;
  verifiedOnly?: boolean;
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

export type ContactRequestInput = {
  platform: Platform;
  handle: string;
  notes?: string;
};

export type ContactRequestResult = {
  status: "created" | "already_pending";
  requestId: string;
};

export type AdminContactRequest = {
  id: string;
  requestedHandle: string;
  requestedPlatform: Platform;
  notes?: string;
  requestDate: number;
  requester: { name: string; email: string; companyName: string };
};

export type FulfillRequestInput = {
  requestId: string;
  creator: {
    platform: Platform;
    handle: string;
    displayName: string;
    followerCount: number;
    location?: string;
    isVerified: boolean;
  };
  contact: {
    contactType: CreatorContact["contactType"];
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    contextualNotes?: string;
    accessTier: "basic" | "pro";
  };
};

export type DataMode = "convex" | "demo";
