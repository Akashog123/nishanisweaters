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
import type * as lib_emailService from "../lib/emailService.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_emailTemplates_abandonedCart from "../lib/emailTemplates/abandonedCart.js";
import type * as lib_emailTemplates_contactInquiry from "../lib/emailTemplates/contactInquiry.js";
import type * as lib_emailTemplates_disputeAlert from "../lib/emailTemplates/disputeAlert.js";
import type * as lib_emailTemplates_newsletterWelcome from "../lib/emailTemplates/newsletterWelcome.js";
import type * as lib_emailTemplates_orderConfirmation from "../lib/emailTemplates/orderConfirmation.js";
import type * as lib_emailTemplates_orderDelivered from "../lib/emailTemplates/orderDelivered.js";
import type * as lib_emailTemplates_shippingUpdate from "../lib/emailTemplates/shippingUpdate.js";
import type * as lib_emailTemplates_welcomeEmail from "../lib/emailTemplates/welcomeEmail.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_getSettings from "../lib/getSettings.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_orderService from "../lib/orderService.js";
import type * as lib_productConstants from "../lib/productConstants.js";
import type * as lib_productFilters from "../lib/productFilters.js";
import type * as lib_promoCodeService from "../lib/promoCodeService.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_securityLogger from "../lib/securityLogger.js";
import type * as lib_settingsRegistry from "../lib/settingsRegistry.js";
import type * as lib_settingsValidation from "../lib/settingsValidation.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_webhookHandlers from "../lib/webhookHandlers.js";
import type * as maintenance from "../maintenance.js";
import type * as newsletter from "../newsletter.js";
import type * as orders from "../orders.js";
import type * as orders_helpers from "../orders/helpers.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as products_helpers from "../products/helpers.js";
import type * as products_index from "../products/index.js";
import type * as products_inventory from "../products/inventory.js";
import type * as products_mutations from "../products/mutations.js";
import type * as products_queries from "../products/queries.js";
import type * as products_stats from "../products/stats.js";
import type * as promoCodes from "../promoCodes.js";
import type * as rateLimitInternal from "../rateLimitInternal.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as testimonials from "../testimonials.js";
import type * as users from "../users.js";
import type * as webhookEventsInternal from "../webhookEventsInternal.js";
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
  "lib/emailService": typeof lib_emailService;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/emailTemplates/abandonedCart": typeof lib_emailTemplates_abandonedCart;
  "lib/emailTemplates/contactInquiry": typeof lib_emailTemplates_contactInquiry;
  "lib/emailTemplates/disputeAlert": typeof lib_emailTemplates_disputeAlert;
  "lib/emailTemplates/newsletterWelcome": typeof lib_emailTemplates_newsletterWelcome;
  "lib/emailTemplates/orderConfirmation": typeof lib_emailTemplates_orderConfirmation;
  "lib/emailTemplates/orderDelivered": typeof lib_emailTemplates_orderDelivered;
  "lib/emailTemplates/shippingUpdate": typeof lib_emailTemplates_shippingUpdate;
  "lib/emailTemplates/welcomeEmail": typeof lib_emailTemplates_welcomeEmail;
  "lib/errors": typeof lib_errors;
  "lib/getSettings": typeof lib_getSettings;
  "lib/logger": typeof lib_logger;
  "lib/orderService": typeof lib_orderService;
  "lib/productConstants": typeof lib_productConstants;
  "lib/productFilters": typeof lib_productFilters;
  "lib/promoCodeService": typeof lib_promoCodeService;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/securityLogger": typeof lib_securityLogger;
  "lib/settingsRegistry": typeof lib_settingsRegistry;
  "lib/settingsValidation": typeof lib_settingsValidation;
  "lib/types": typeof lib_types;
  "lib/validation": typeof lib_validation;
  "lib/webhookHandlers": typeof lib_webhookHandlers;
  maintenance: typeof maintenance;
  newsletter: typeof newsletter;
  orders: typeof orders;
  "orders/helpers": typeof orders_helpers;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  payments: typeof payments;
  products: typeof products;
  "products/helpers": typeof products_helpers;
  "products/index": typeof products_index;
  "products/inventory": typeof products_inventory;
  "products/mutations": typeof products_mutations;
  "products/queries": typeof products_queries;
  "products/stats": typeof products_stats;
  promoCodes: typeof promoCodes;
  rateLimitInternal: typeof rateLimitInternal;
  reviews: typeof reviews;
  seed: typeof seed;
  settings: typeof settings;
  testimonials: typeof testimonials;
  users: typeof users;
  webhookEventsInternal: typeof webhookEventsInternal;
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
