/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accountHierarchy from "../accountHierarchy.js";
import type * as admin from "../admin.js";
import type * as adminUsers from "../adminUsers.js";
import type * as auth from "../auth.js";
import type * as cardBuilder from "../cardBuilder.js";
import type * as client from "../client.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as plans from "../plans.js";
import type * as router from "../router.js";
import type * as seed from "../seed.js";
import type * as userManagement from "../userManagement.js";
import type * as users from "../users.js";
import type * as validation from "../validation.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accountHierarchy: typeof accountHierarchy;
  admin: typeof admin;
  adminUsers: typeof adminUsers;
  auth: typeof auth;
  cardBuilder: typeof cardBuilder;
  client: typeof client;
  customers: typeof customers;
  dashboard: typeof dashboard;
  http: typeof http;
  plans: typeof plans;
  router: typeof router;
  seed: typeof seed;
  userManagement: typeof userManagement;
  users: typeof users;
  validation: typeof validation;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
