import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name ?? "Creatorly user",
      email: user.email ?? "",
      companyName: user.companyName ?? "Agency",
      role: user.role ?? "user",
      currentPlanTier: user.currentPlanTier ?? "free",
      creditBalance: user.creditBalance ?? 25,
    };
  },
});
