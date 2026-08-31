import { Email } from "@convex-dev/auth/providers/Email";

const VERIFICATION_CODE_MAX = 1_000_000;
const VERIFICATION_CODE_TTL_SECONDS = 15 * 60;
const TEMPORARY_BYPASS_MAX_MS = 72 * 60 * 60 * 1000;

type AuthEmailEnvironment = {
  RESEND_API_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  CREATORLY_ENVIRONMENT?: string;
  AUTH_EMAIL_ALLOW_UNCONFIGURED_DEVELOPMENT?: string;
  AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL?: string;
};

export function isEmailVerificationConfigured(
  environment: AuthEmailEnvironment = process.env,
) {
  return Boolean(environment.RESEND_API_KEY?.trim() && environment.AUTH_EMAIL_FROM?.trim());
}

export function resolveEmailVerificationMode(
  environment: AuthEmailEnvironment = process.env,
  now = Date.now(),
): "enabled" | "development_skipped" | "temporary_bypass" {
  const temporaryBypassUntil = Date.parse(environment.AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL?.trim() ?? "");
  if (isEmailVerificationConfigured(environment)) return "enabled";
  if (Number.isFinite(temporaryBypassUntil) && temporaryBypassUntil - now > TEMPORARY_BYPASS_MAX_MS) {
    throw new Error("AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL cannot be more than 72 hours in the future.");
  }
  const temporaryBypassAllowed = environment.CREATORLY_ENVIRONMENT?.trim().toLowerCase() === "production"
    && Number.isFinite(temporaryBypassUntil)
    && now < temporaryBypassUntil;
  if (temporaryBypassAllowed) return "temporary_bypass";
  const developmentSkipAllowed = environment.CREATORLY_ENVIRONMENT?.trim().toLowerCase() === "development"
    && environment.AUTH_EMAIL_ALLOW_UNCONFIGURED_DEVELOPMENT?.trim().toLowerCase() === "true";
  if (developmentSkipAllowed) return "development_skipped";

  const missing = [
    !environment.RESEND_API_KEY?.trim() ? "RESEND_API_KEY" : null,
    !environment.AUTH_EMAIL_FROM?.trim() ? "AUTH_EMAIL_FROM" : null,
  ].filter((value): value is string => value !== null);
  throw new Error(`Creatorly email verification is not configured. Add ${missing.join(" and ")} to Convex.`);
}

export function warnTemporaryBypassSignup(
  environment: AuthEmailEnvironment = process.env,
  warn: (message: string) => void = console.warn,
) {
  const expiry = environment.AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL?.trim();
  warn(`Creatorly email verification temporary bypass is active for this signup until ${expiry}.`);
}

export function generateEmailVerificationCode() {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return String(randomValue[0] % VERIFICATION_CODE_MAX).padStart(6, "0");
}

function requireEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  resolveEmailVerificationMode();
  return { apiKey: apiKey!, from: from! };
}

export const creatorlyEmailVerification = Email({
  id: "creatorly-email-verification",
  from: process.env.AUTH_EMAIL_FROM ?? "Creatorly <verification@creatorly.invalid>",
  maxAge: VERIFICATION_CODE_TTL_SECONDS,
  generateVerificationToken: async () => generateEmailVerificationCode(),
  sendVerificationRequest: async ({ identifier, token }) => {
    const { apiKey, from } = requireEmailConfiguration();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [identifier],
        subject: `${token} is your Creatorly verification code`,
        text: `Your Creatorly verification code is ${token}. It expires in 15 minutes. If you did not create this account, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0a0a0b;line-height:1.5"><p>Verify your Creatorly account with this code:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;margin:20px 0">${token}</p><p>This code expires in 15 minutes. If you did not create this account, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) {
      throw new Error(`Creatorly could not send the verification email (HTTP ${response.status}).`);
    }
  },
});
