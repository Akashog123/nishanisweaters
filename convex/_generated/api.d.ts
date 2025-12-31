/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___testUtils from "../__tests__/testUtils.js";
import type * as abandonedCart from "../abandonedCart.js";
import type * as analytics from "../analytics.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as circuitBreakerState from "../circuitBreakerState.js";
import type * as cms from "../cms.js";
import type * as contact from "../contact.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as fileStorage from "../fileStorage.js";
import type * as fileStorageInternal from "../fileStorageInternal.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cachingStrategies from "../lib/cachingStrategies.js";
import type * as lib_cartUtils from "../lib/cartUtils.js";
import type * as lib_circuitBreaker from "../lib/circuitBreaker.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_getSettings from "../lib/getSettings.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_orderService from "../lib/orderService.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_securityLogger from "../lib/securityLogger.js";
import type * as lib_settingsRegistry from "../lib/settingsRegistry.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_webhookHandlers from "../lib/webhookHandlers.js";
import type * as maintenance from "../maintenance.js";
import type * as newsletter from "../newsletter.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as promoCodes from "../promoCodes.js";
import type * as rateLimitInternal from "../rateLimitInternal.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as wholesaleApplications from "../wholesaleApplications.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/testUtils": typeof __tests___testUtils;
  abandonedCart: typeof abandonedCart;
  analytics: typeof analytics;
  cart: typeof cart;
  categories: typeof categories;
  circuitBreakerState: typeof circuitBreakerState;
  cms: typeof cms;
  contact: typeof contact;
  crons: typeof crons;
  emails: typeof emails;
  fileStorage: typeof fileStorage;
  fileStorageInternal: typeof fileStorageInternal;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/cachingStrategies": typeof lib_cachingStrategies;
  "lib/cartUtils": typeof lib_cartUtils;
  "lib/circuitBreaker": typeof lib_circuitBreaker;
  "lib/constants": typeof lib_constants;
  "lib/getSettings": typeof lib_getSettings;
  "lib/logger": typeof lib_logger;
  "lib/orderService": typeof lib_orderService;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/securityLogger": typeof lib_securityLogger;
  "lib/settingsRegistry": typeof lib_settingsRegistry;
  "lib/validation": typeof lib_validation;
  "lib/webhookHandlers": typeof lib_webhookHandlers;
  maintenance: typeof maintenance;
  newsletter: typeof newsletter;
  orders: typeof orders;
  payments: typeof payments;
  products: typeof products;
  promoCodes: typeof promoCodes;
  rateLimitInternal: typeof rateLimitInternal;
  reviews: typeof reviews;
  seed: typeof seed;
  settings: typeof settings;
  users: typeof users;
  wholesaleApplications: typeof wholesaleApplications;
  wishlist: typeof wishlist;
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
