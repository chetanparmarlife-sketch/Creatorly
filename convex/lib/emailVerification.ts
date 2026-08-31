import { ConvexError } from "convex/values";

type EmailVerificationFields = {
  emailVerificationTime?: number;
  isEmailVerified?: boolean;
};

export function isEmailVerified(user: EmailVerificationFields) {
  return Boolean(user.emailVerificationTime ?? user.isEmailVerified);
}

export function requireVerifiedEmail(user: EmailVerificationFields, action: string) {
  if (!isEmailVerified(user)) {
    throw new ConvexError(`Verify your email first, then ${action}.`);
  }
}
