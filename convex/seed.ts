import { internalMutation } from "./_generated/server";

const creators = [
  {
    platform: "instagram" as const,
    handle: "@maya_creates",
    normalizedHandle: "mayacreates",
    displayName: "Maya Kapoor",
    followerCount: 842000,
    location: "Mumbai, India",
    isVerified: true,
    contacts: [
      ["creator_direct", "Maya Kapoor", "hello.maya@example.test", "basic", "Email works best for brand briefs."],
      ["manager", "Rhea Malhotra", "rhea.manager@example.test", "pro", "Share budgets and usage terms in the first note."],
    ],
  },
  {
    platform: "youtube" as const,
    handle: "@TheTechRishi",
    normalizedHandle: "techrishi",
    displayName: "Rishi Verma",
    followerCount: 1240000,
    location: "Bengaluru, India",
    isVerified: true,
    contacts: [
      ["creator_direct", "Rishi Verma", "business.rishi@example.test", "basic", "Include the product category in the subject line."],
      ["agent", "Anika Sen", "anika.agent@example.test", "pro", "Handles long-term partnerships."],
    ],
  },
  {
    platform: "instagram" as const,
    handle: "@fit.with.aanchal",
    normalizedHandle: "fitwithaanchal",
    displayName: "Aanchal Mehta",
    followerCount: 376000,
    location: "Delhi, India",
    isVerified: false,
    contacts: [
      ["creator_direct", "Aanchal Mehta", "aanchal.collabs@example.test", "basic", "Prefers wellness and activewear briefs."],
    ],
  },
  {
    platform: "youtube" as const,
    handle: "@CookWithKabirOfficial",
    normalizedHandle: "cookwithkabir",
    displayName: "Kabir Arora",
    followerCount: 695000,
    location: "Pune, India",
    isVerified: true,
    contacts: [
      ["manager", "Dev Iyer", "dev.manager@example.test", "pro", "Manager is the only listed campaign contact."],
    ],
  },
  {
    platform: "instagram" as const,
    handle: "@travelnoor",
    normalizedHandle: "travelnoor",
    displayName: "Noor Khan",
    followerCount: 518000,
    location: "Hyderabad, India",
    isVerified: true,
    contacts: [
      ["creator_direct", "Noor Khan", "partnerships.noor@example.test", "basic", "Destination briefs need at least six weeks' notice."],
      ["assistant", "Ira Bose", "ira.assistant@example.test", "pro", "Best for scheduling and deliverable follow-up."],
    ],
  },
  {
    platform: "youtube" as const,
    handle: "@MoneyMadeClear",
    normalizedHandle: "moneymadeclear",
    displayName: "Money Made Clear",
    followerCount: 289000,
    location: "Chennai, India",
    isVerified: false,
    contacts: [
      ["pr_rep", "Studio North PR", "finance.pr@example.test", "pro", "Does not accept high-risk finance products."],
    ],
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("creators").first();
    if (existing) return { inserted: 0, message: "Seed data already exists." };

    const now = Date.now();
    let inserted = 0;
    for (const item of creators) {
      const creatorId = await ctx.db.insert("creators", {
        platform: item.platform,
        handle: item.handle,
        normalizedHandle: item.normalizedHandle,
        displayName: item.displayName,
        followerCount: item.followerCount,
        location: item.location,
        isVerified: item.isVerified,
        isDemo: true,
        addedToRepositoryAt: now,
        lastUpdatedAt: now,
      });
      for (const [contactType, name, email, accessTier, contextualNotes] of item.contacts) {
        await ctx.db.insert("contacts", {
          creatorId,
          contactType: contactType as "creator_direct" | "manager" | "agent" | "assistant" | "pr_rep",
          name,
          email,
          contextualNotes,
          verificationStatus: "verified",
          lastVerifiedAt: now,
          isActive: true,
          accessTier: accessTier as "basic" | "pro",
          isDemo: true,
        });
      }
      inserted += 1;
    }
    return { inserted, message: "Demo creators seeded." };
  },
});
