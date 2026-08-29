import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const name = String(params.name ?? "").trim();
        const companyName = String(params.companyName ?? "").trim();

        if (!email) throw new Error("Enter a work email address.");
        if (params.flow === "signUp" && (!name || !companyName)) {
          throw new Error("Enter your name and agency name.");
        }

        return {
          email,
          name: name || undefined,
          companyName: companyName || undefined,
          role: "user" as const,
          currentPlanTier: "free" as const,
          subscriptionStatus: "active" as const,
          creditBalance: 25,
          monthlyCreditsIncluded: 0,
          notificationPreferences: {
            requestFulfilled: true,
            lowBalance: true,
            expirationWarning: true,
            weeklySummary: false,
          },
          isEmailVerified: true,
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return;
      await ctx.db.insert("creditTransactions", {
        userId,
        amount: 25,
        transactionType: "signup_bonus",
        description: "Free plan starter credits",
        createdAt: Date.now(),
      });
    },
  },
});
