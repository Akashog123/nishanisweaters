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

export default crons;
