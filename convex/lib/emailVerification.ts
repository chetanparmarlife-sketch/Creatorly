import { ConvexError } from "convex/values";
import { resolveEmailVerificationMode } from "./authEmail";

type EmailVerificationFields = {
  emailVerificationTime?: number;
  isEmailVerified?: boolean;
};

type EmailVerificationEnvironment = Parameters<typeof resolveEmailVerificationMode>[0];

export function isEmailVerified(user: EmailVerificationFields) {
  return Boolean(user.emailVerificationTime ?? user.isEmailVerified);
}

export function isEmailVerificationBypassed(
  environment: EmailVerificationEnvironment = process.env,
  now = Date.now(),
) {
  try {
    return resolveEmailVerificationMode(environment, now) !== "enabled";
  } catch {
    return false;
  }
}

export function requireVerifiedEmail(
  user: EmailVerificationFields,
  action: string,
  environment: EmailVerificationEnvironment = process.env,
  now = Date.now(),
) {
  if (!isEmailVerified(user) && !isEmailVerificationBypassed(environment, now)) {
    throw new ConvexError(`Verify your email first, then ${action}.`);
  }
}
