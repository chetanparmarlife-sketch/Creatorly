export type Platform = "instagram" | "tiktok" | "youtube" | "twitter";
export type SocialPlatform = Platform | "linkedin" | "twitter";
export type PlanTier = "free" | "basic" | "pro";

export type SocialProfile = {
  platform: SocialPlatform;
  handle: string;
  url: string;
  followerCount?: number;
  isVerified?: boolean;
};

export type InstagramMetrics = {
  followingCount?: number;
  postCount?: number;
  highlightReelCount?: number;
  igtvVideoCount?: number;
  averageLikes?: number;
  averageComments?: number;
  averageVideoViews?: number;
  averageReelViews?: number;
  engagementRatePercent?: number;
  minLikes?: number;
  minComments?: number;
  minVideoViews?: number;
  minReelViews?: number;
  maxLikes?: number;
  maxComments?: number;
  maxVideoViews?: number;
  maxReelViews?: number;
  isBusinessAccount?: boolean;
  businessCategoryName?: string;
};

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
  hasDodoCustomer?: boolean;
  onboardingCompleted: boolean;
  onboardingStep: 1 | 2 | 3 | 4 | 5;
  onboardingPlanTier: PlanTier;
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
  socialProfiles?: SocialProfile[];
  contentLanguages?: string[];
  profileType?: string;
  contentQuality?: string;
  managementType?: "self_managed" | "talent_managed";
  profileImageUrl?: string;
  biography?: string;
  gender?: string;
  age?: number;
  instagramAccountId?: string;
  instagramMetrics?: InstagramMetrics;
  sourceLabel?: string;
  lastUpdatedAt?: number;
  metricProvenance?: "supplied" | "live";
  contactCount: number;
  matchScore: number;
};

export type CreatorSearchFilters = {
  platform?: Platform;
  category?: string;
  location?: string;
  verifiedOnly?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  sortField?: "name" | "audience" | "location";
  sortDirection?: "asc" | "desc";
};

export type CreatorSearchPage = {
  page: CreatorSearchResult[];
  continueCursor: string;
  isDone: boolean;
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
  pendingContactCount: number;
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

export type WorkspaceKind = "agency" | "brand" | "talent";
export type WorkspaceRole = "owner" | "admin" | "manager" | "contributor" | "reviewer";
export type WorkspaceOnboardingInput = {
  name: string;
  kind: WorkspaceKind;
  role: WorkspaceRole;
  goals: string[];
};
export type CampaignStage = "discovered" | "shortlisted" | "contacted" | "replied" | "negotiating" | "contracted" | "creating" | "in_review" | "scheduled" | "live" | "paid";
export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type BrandDivisionType = "brand" | "product_line" | "market" | "region";
export type WorkspaceGroup = {
  id: string;
  kind: "client" | "division";
  name: string;
  website?: string;
  divisionType?: BrandDivisionType;
  parentDivisionId?: string;
  status: "active" | "archived";
};
export type GroupCollaboratorRole = "client_reviewer" | "internal_stakeholder" | "agency_collaborator";
export type GroupCollaborator = {
  id: string;
  groupId: string;
  email: string;
  role: GroupCollaboratorRole;
  status: "invited" | "active" | "disabled";
};
export type DeliverableStatus = "planned" | "awaiting_content" | "in_review" | "changes_requested" | "approved" | "scheduled" | "live";
export type ApprovalDecision = "pending" | "approved" | "changes_requested";
export type CampaignTaskStatus = "open" | "done" | "cancelled";

export const CAMPAIGN_STAGES: CampaignStage[] = ["discovered", "shortlisted", "contacted", "replied", "negotiating", "contracted", "creating", "in_review", "scheduled", "live", "paid"];
export const canManageCampaign = (role: WorkspaceRole) => role !== "reviewer";
export const canRevealContacts = (role: WorkspaceRole) => role !== "reviewer";

export type WorkspaceSummary = { id: string; name: string; kind: WorkspaceKind; role: WorkspaceRole; goals?: string[]; defaultCampaignRole?: WorkspaceRole };
export type CreatorSource = "creatorly" | "csv_upload" | "manual" | "extension";
export type PrivateCreatorInput = {
  displayName: string;
  platform?: SocialPlatform;
  handle?: string;
  followerCount?: number;
  location?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  tags?: string[];
};
export type PrivateCreatorContact = Pick<PrivateCreatorInput, "email" | "phone" | "whatsapp">;
export type CreatorImportStatus = "ready" | "duplicate" | "error";
export type CreatorImportPreviewRow = {
  rowNumber: number;
  status: CreatorImportStatus;
  input: PrivateCreatorInput;
  errors: string[];
};
export type CreatorImportPreview = {
  rows: CreatorImportPreviewRow[];
  readyCount: number;
  duplicateCount: number;
  errorCount: number;
};
export type CrmCreatorProfile = {
  id: string;
  displayName: string;
  platform?: SocialPlatform;
  handle?: string;
  followerCount?: number;
  location?: string;
  categories?: string[];
  isVerified?: boolean;
  contactCount?: number;
  sourceLabel?: string;
  lastUpdatedAt?: number;
  metricProvenance?: "supplied" | "live";
};
export type SavedCreator = {
  id: string;
  creator: CrmCreatorProfile;
  source: CreatorSource;
  privateContact?: PrivateCreatorContact;
  relationshipStage: CampaignStage;
  ownerName: string;
  priority: "low" | "normal" | "high";
  tags: string[];
  notes?: string;
  nextAction?: string;
  nextActionAt?: number;
  updatedAt: number;
};
export type CampaignCreator = {
  id: string;
  savedCreatorId: string;
  stage: CampaignStage;
  ownerName: string;
  nextAction?: string;
  nextActionAt?: number;
  agreedFee?: number;
  deliverables: CampaignDeliverable[];
};
export type CampaignApproval = { id: string; decision: ApprovalDecision; note?: string; reviewerName: string; createdAt: number };
export type CampaignDeliverable = {
  id: string;
  campaignCreatorId: string;
  title: string;
  channel: Platform;
  format: string;
  dueAt?: number;
  status: DeliverableStatus;
  submissionUrl?: string;
  liveUrl?: string;
  approvals: CampaignApproval[];
  createdAt: number;
  updatedAt: number;
};
export type CampaignTask = { id: string; campaignCreatorId?: string; title: string; status: CampaignTaskStatus; dueAt?: number; assigneeName: string; createdAt: number; updatedAt: number };
export type Campaign = {
  id: string;
  clientId?: string;
  divisionId?: string;
  groupName?: string;
  name: string;
  goal: string;
  platforms: Platform[];
  status: CampaignStatus;
  ownerName: string;
  currency: string;
  budget?: number;
  startsAt?: number;
  endsAt?: number;
  creators: CampaignCreator[];
  tasks: CampaignTask[];
  createdAt: number;
  updatedAt: number;
};
export type CampaignDraft = Pick<Campaign, "name" | "goal" | "platforms" | "currency" | "budget" | "startsAt" | "endsAt" | "clientId" | "divisionId">;
export type WorkspaceActivity = { id: string; summary: string; entityType: "workspace" | "saved_creator" | "campaign" | "campaign_creator" | "deliverable" | "approval" | "task"; createdAt: number };
