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
import type * as campaigns from "../campaigns.js";
import type * as contactFlags from "../contactFlags.js";
import type * as contactRequests from "../contactRequests.js";
import type * as creators from "../creators.js";
import type * as extensionApi from "../extensionApi.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as importCreators from "../importCreators.js";
import type * as lib_matching from "../lib/matching.js";
import type * as lib_workspaceAuth from "../lib/workspaceAuth.js";
import type * as notifications from "../notifications.js";
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
  campaigns: typeof campaigns;
  contactFlags: typeof contactFlags;
  contactRequests: typeof contactRequests;
  creators: typeof creators;
  extensionApi: typeof extensionApi;
  home: typeof home;
  http: typeof http;
  importCreators: typeof importCreators;
  "lib/matching": typeof lib_matching;
  "lib/workspaceAuth": typeof lib_workspaceAuth;
  notifications: typeof notifications;
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

export declare const components: {};
