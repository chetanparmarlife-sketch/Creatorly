/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billingCustomers from "../billingCustomers.js";
import type * as billingWebhooks from "../billingWebhooks.js";
import type * as campaignExecution from "../campaignExecution.js";
import type * as campaigns from "../campaigns.js";
import type * as contactFlags from "../contactFlags.js";
import type * as contactRequests from "../contactRequests.js";
import type * as creatorClaims from "../creatorClaims.js";
import type * as creators from "../creators.js";
import type * as dodo from "../dodo.js";
import type * as extensionApi from "../extensionApi.js";
import type * as groupOperations from "../groupOperations.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as importCreators from "../importCreators.js";
import type * as lib_apifyClaim from "../lib/apifyClaim.js";
import type * as lib_authEmail from "../lib/authEmail.js";
import type * as lib_creatorImportMapping from "../lib/creatorImportMapping.js";
import type * as lib_creditPolicy from "../lib/creditPolicy.js";
import type * as lib_dodoCatalog from "../lib/dodoCatalog.js";
import type * as lib_emailVerification from "../lib/emailVerification.js";
import type * as lib_engagement from "../lib/engagement.js";
import type * as lib_extensionCrm from "../lib/extensionCrm.js";
import type * as lib_matching from "../lib/matching.js";
import type * as lib_profileImagePolicy from "../lib/profileImagePolicy.js";
import type * as lib_repositoryPolicy from "../lib/repositoryPolicy.js";
import type * as lib_workspaceAuth from "../lib/workspaceAuth.js";
import type * as notifications from "../notifications.js";
import type * as profileImageMigration from "../profileImageMigration.js";
import type * as repositoryMaintenance from "../repositoryMaintenance.js";
import type * as savedCreators from "../savedCreators.js";
import type * as seed from "../seed.js";
import type * as unlocks from "../unlocks.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  billing: typeof billing;
  billingCustomers: typeof billingCustomers;
  billingWebhooks: typeof billingWebhooks;
  campaignExecution: typeof campaignExecution;
  campaigns: typeof campaigns;
  contactFlags: typeof contactFlags;
  contactRequests: typeof contactRequests;
  creatorClaims: typeof creatorClaims;
  creators: typeof creators;
  dodo: typeof dodo;
  extensionApi: typeof extensionApi;
  groupOperations: typeof groupOperations;
  home: typeof home;
  http: typeof http;
  importCreators: typeof importCreators;
  "lib/apifyClaim": typeof lib_apifyClaim;
  "lib/authEmail": typeof lib_authEmail;
  "lib/creatorImportMapping": typeof lib_creatorImportMapping;
  "lib/creditPolicy": typeof lib_creditPolicy;
  "lib/dodoCatalog": typeof lib_dodoCatalog;
  "lib/emailVerification": typeof lib_emailVerification;
  "lib/engagement": typeof lib_engagement;
  "lib/extensionCrm": typeof lib_extensionCrm;
  "lib/matching": typeof lib_matching;
  "lib/profileImagePolicy": typeof lib_profileImagePolicy;
  "lib/repositoryPolicy": typeof lib_repositoryPolicy;
  "lib/workspaceAuth": typeof lib_workspaceAuth;
  notifications: typeof notifications;
  profileImageMigration: typeof profileImageMigration;
  repositoryMaintenance: typeof repositoryMaintenance;
  savedCreators: typeof savedCreators;
  seed: typeof seed;
  unlocks: typeof unlocks;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  dodopayments: import("@dodopayments/convex/_generated/component.js").ComponentApi<"dodopayments">;
};
