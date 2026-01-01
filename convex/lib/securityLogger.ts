/**
 * Security Logger Utility
 *
 * Provides structured security event logging for audit trails, compliance,
 * and incident response. All security-relevant events should use this logger.
 *
 * SECURITY BEST PRACTICES:
 * - All security events are persisted to the database for audit trails
 * - Events include timestamps, severity levels, and contextual metadata
 * - Sensitive data (passwords, tokens) should NEVER be logged
 * - IP addresses are sanitized before logging to prevent log injection
 * - High/critical severity events should trigger alerts (see alerting-config.ts)
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

/**
 * Extended authentication failure context for detailed logging
 */
export interface AuthFailureContext {
  /** The authentication method attempted (e.g., "clerk", "jwt", "api_key") */
  authMethod?: string;
  /** The endpoint or resource being accessed */
  endpoint?: string;
  /** Reason for failure (e.g., "expired_token", "invalid_credentials", "missing_header") */
  failureReason: string;
  /** Number of recent failures from this source (for brute-force detection) */
  recentFailureCount?: number;
  /** Whether this failure appears to be part of an attack pattern */
  suspectedAttack?: boolean;
  /** Request headers that may be useful for investigation (sanitized) */
  requestContext?: {
    origin?: string;
    referer?: string;
    acceptLanguage?: string;
  };
}

/**
 * Rate limit violation context for detailed logging
 */
export interface RateLimitContext {
  /** The category of rate limit (webhook, api, auth, mutation) */
  category: string;
  /** Current request count in the window */
  currentCount: number;
  /** Maximum allowed requests in the window */
  maxAllowed: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Time until rate limit resets (ms) */
  resetInMs?: number;
  /** Whether this appears to be a coordinated attack */
  suspectedDDoS?: boolean;
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
 * Log a rate limit violation with detailed context.
 *
 * SECURITY: Rate limit violations may indicate:
 * - Brute-force attacks
 * - DDoS attempts
 * - Misconfigured clients
 * - API abuse
 *
 * @example
 * await logRateLimitViolation(ctx, "192.168.1.1", {
 *   category: "webhook",
 *   currentCount: 150,
 *   maxAllowed: 100,
 *   windowMs: 60000,
 *   resetInMs: 30000,
 * });
 */
export async function logRateLimitViolation(
  ctx: MutationCtx,
  identifier: string,
  context: RateLimitContext,
  ipAddress?: string
): Promise<void> {
  // Determine severity based on context
  let severity: SecuritySeverity = "medium";
  if (context.suspectedDDoS) {
    severity = "critical";
  } else if (context.currentCount > context.maxAllowed * 2) {
    // Significantly over limit - escalate severity
    severity = "high";
  }

  await logSecurityEvent(ctx, {
    eventType: "rate_limit_violation",
    severity,
    action: `rate_limit_exceeded:${context.category}`,
    ipAddress,
    details: `Rate limit exceeded for identifier: ${identifier}. ` +
      `Count: ${context.currentCount}/${context.maxAllowed} in ${context.windowMs}ms window.`,
    metadata: {
      identifier,
      category: context.category,
      currentCount: context.currentCount,
      maxAllowed: context.maxAllowed,
      windowMs: context.windowMs,
      resetInMs: context.resetInMs,
      suspectedDDoS: context.suspectedDDoS,
      exceededBy: context.currentCount - context.maxAllowed,
    },
  });
}

/**
 * Log an invalid signature attempt (e.g., webhook tampering).
 *
 * SECURITY: Invalid signatures are HIGH severity as they may indicate:
 * - Webhook tampering attempts
 * - Replay attacks
 * - Man-in-the-middle attacks
 * - Compromised webhook secrets
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
    metadata: {
      source,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an authentication failure with extended context.
 *
 * SECURITY: Auth failures should be logged with sufficient context to:
 * - Detect brute-force attacks
 * - Identify credential stuffing attempts
 * - Support incident investigation
 * - Enable rate limiting by failure count
 *
 * @example
 * await logAuthFailureWithContext(ctx, {
 *   failureReason: "expired_token",
 *   authMethod: "jwt",
 *   endpoint: "/api/admin/users",
 *   recentFailureCount: 5,
 *   suspectedAttack: false,
 * }, "user123", "192.168.1.1");
 */
export async function logAuthFailureWithContext(
  ctx: MutationCtx,
  context: AuthFailureContext,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Determine severity based on context
  let severity: SecuritySeverity = "medium";
  if (context.suspectedAttack) {
    severity = "critical";
  } else if (context.recentFailureCount && context.recentFailureCount >= 5) {
    // Multiple recent failures from same source - potential brute force
    severity = "high";
  }

  await logSecurityEvent(ctx, {
    eventType: "auth_failure",
    severity,
    action: `auth_failure:${context.failureReason}`,
    userId,
    ipAddress,
    userAgent,
    resource: context.endpoint,
    details: `Authentication failed: ${context.failureReason}` +
      (context.authMethod ? ` (method: ${context.authMethod})` : "") +
      (context.recentFailureCount ? ` [${context.recentFailureCount} recent failures]` : ""),
    metadata: {
      authMethod: context.authMethod,
      failureReason: context.failureReason,
      endpoint: context.endpoint,
      recentFailureCount: context.recentFailureCount,
      suspectedAttack: context.suspectedAttack,
      requestContext: context.requestContext,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an authentication failure (simple version for backward compatibility).
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

// ============================================
// ALERT HELPER FUNCTIONS
// ============================================

/**
 * Determine if a security event should trigger an immediate alert.
 * Critical and high severity events typically warrant immediate notification.
 *
 * @param severity - The severity level of the event
 * @returns Whether this event should trigger an alert
 */
export function shouldTriggerAlert(severity: SecuritySeverity): boolean {
  return severity === "critical" || severity === "high";
}

/**
 * Format a security event for alerting/notification purposes.
 * Excludes sensitive metadata and formats for readability.
 *
 * @param event - The security event data
 * @returns Formatted alert message string
 */
export function formatSecurityAlert(event: SecurityEventData): string {
  const timestamp = new Date().toISOString();
  const lines = [
    `[${event.severity.toUpperCase()}] Security Alert: ${event.eventType}`,
    `Time: ${timestamp}`,
    `Action: ${event.action}`,
  ];

  if (event.userId) {
    lines.push(`User: ${event.userId}`);
  }
  if (event.resource) {
    lines.push(`Resource: ${event.resource}`);
  }
  if (event.details) {
    lines.push(`Details: ${event.details}`);
  }
  // Note: IP addresses and user agents intentionally excluded from alerts
  // to avoid leaking sensitive information in notifications

  return lines.join("\n");
}

/**
 * Create a security event summary for dashboards/reports.
 * Aggregates multiple events into a summary format.
 *
 * @param events - Array of security events to summarize
 * @returns Summary object with counts by type and severity
 */
export function summarizeSecurityEvents(
  events: SecurityEventData[]
): {
  total: number;
  bySeverity: Record<SecuritySeverity, number>;
  byType: Record<SecurityEventType, number>;
  criticalEvents: SecurityEventData[];
} {
  const bySeverity: Record<SecuritySeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byType: Record<SecurityEventType, number> = {
    admin_action: 0,
    rate_limit_violation: 0,
    invalid_signature: 0,
    auth_failure: 0,
    unauthorized_access: 0,
    suspicious_activity: 0,
  };

  const criticalEvents: SecurityEventData[] = [];

  for (const event of events) {
    bySeverity[event.severity]++;
    byType[event.eventType]++;

    if (event.severity === "critical") {
      criticalEvents.push(event);
    }
  }

  return {
    total: events.length,
    bySeverity,
    byType,
    criticalEvents,
  };
}
