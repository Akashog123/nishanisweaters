/**
 * Convex Cron Jobs
 *
 * Scheduled background tasks for maintenance and cleanup.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cart cleanup every 6 hours to remove expired guest carts
// This prevents database bloat from abandoned guest sessions
crons.interval(
  "cleanup expired guest carts",
  { hours: 6 },
  internal.cart.cleanupExpiredCarts
);

// Run daily at 3 AM UTC to clean up old inventory logs (older than 90 days)
// Keeps the inventoryLogs table manageable
crons.daily(
  "cleanup old inventory logs",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.cleanupOldInventoryLogs
);

// Run every 6 hours to process abandoned cart reminders
// Sends reminder emails to users who left items in their cart
crons.interval(
  "process abandoned cart reminders",
  { hours: 6 },
  internal.abandonedCart.processAbandonedCarts
);

// Run every hour to cleanup expired rate limit records
// Prevents database bloat from stale rate limiting data
crons.interval(
  "cleanup expired rate limits",
  { hours: 1 },
  internal.maintenance.cleanupExpiredRateLimits
);

// Run daily at 4 AM UTC to cleanup old security events
// Keeps 90 days of non-critical events, 1 year for critical
crons.daily(
  "cleanup old security events",
  { hourUTC: 4, minuteUTC: 0 },
  internal.maintenance.cleanupOldSecurityEvents
);

export default crons;
