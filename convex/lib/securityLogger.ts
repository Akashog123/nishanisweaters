/**
 * Security Logger Utility
 *
 * Provides structured security event logging for audit trails, compliance,
 * and incident response. All security-relevant events should use this logger.
 */

import { MutationCtx } from "../_generated/server";

// ============================================
// TYPES
// ============================================

export type SecurityEventType =
  | "admin_action"
  | "rate_limit_violation"
  | "invalid_signature"
  | "auth_failure"
  | "unauthorized_access"
  | "suspicious_activity";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEventData {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  action: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// SECURITY LOGGER
// ============================================

/**
 * Log a security event to the database for audit trail.
 *
 * @example
 * await logSecurityEvent(ctx, {
 *   eventType: "unauthorized_access",
 *   severity: "high",
 *   action: "access_admin_panel",
 *   userId: "user123",
 *   details: "Non-admin user attempted to access admin panel",
 * });
 */
export async function logSecurityEvent(
  ctx: MutationCtx,
  event: SecurityEventData
): Promise<void> {
  await ctx.db.insert("securityEvents", {
    eventType: event.eventType,
    severity: event.severity,
    userId: event.userId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    action: event.action,
    resource: event.resource,
    details: event.details,
    metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
    timestamp: Date.now(),
  });
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Log an admin action for audit purposes.
 */
export async function logAdminAction(
  ctx: MutationCtx,
  action: string,
  userId: string,
  details?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "admin_action",
    severity: "low",
    action,
    userId,
    details,
    metadata,
  });
}

/**
 * Log a rate limit violation.
 */
export async function logRateLimitViolation(
  ctx: MutationCtx,
  identifier: string,
  category: string,
  ipAddress?: string
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "rate_limit_violation",
    severity: "medium",
    action: `rate_limit_exceeded:${category}`,
    ipAddress,
    details: `Rate limit exceeded for identifier: ${identifier}`,
    metadata: { identifier, category },
  });
}

/**
 * Log an invalid signature attempt (e.g., webhook tampering).
 */
export async function logInvalidSignature(
  ctx: MutationCtx,
  source: string,
  ipAddress?: string,
  details?: string
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "invalid_signature",
    severity: "high",
    action: `invalid_signature:${source}`,
    ipAddress,
    details: details || `Invalid signature detected from ${source}`,
  });
}

/**
 * Log an authentication failure.
 */
export async function logAuthFailure(
  ctx: MutationCtx,
  action: string,
  userId?: string,
  details?: string
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "auth_failure",
    severity: "medium",
    action,
    userId,
    details,
  });
}

/**
 * Log an unauthorized access attempt.
 */
export async function logUnauthorizedAccess(
  ctx: MutationCtx,
  action: string,
  userId: string,
  resource: string,
  requiredRole?: string
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "unauthorized_access",
    severity: "high",
    action,
    userId,
    resource,
    details: requiredRole
      ? `User attempted to access ${resource} without ${requiredRole} role`
      : `User attempted unauthorized access to ${resource}`,
    metadata: { requiredRole },
  });
}

/**
 * Log suspicious activity that may warrant investigation.
 */
export async function logSuspiciousActivity(
  ctx: MutationCtx,
  action: string,
  severity: SecuritySeverity,
  details: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent(ctx, {
    eventType: "suspicious_activity",
    severity,
    action,
    details,
    metadata,
  });
}
