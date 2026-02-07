/**
 * Alerting Configuration
 *
 * Defines alert rules, thresholds, notification channels, and escalation policies
 * for the Nidhi Sweaters e-commerce platform.
 *
 * Compatible with Sentry Alerts, Grafana Alerting, and PagerDuty.
 */


// =============================================================================
// Alert Types and Interfaces
// =============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Alert rule definition
 */
export interface AlertRule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what triggers this alert */
  description: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Metric or query to evaluate */
  metric: string;
  /** Threshold condition */
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    /** Duration the condition must be true */
    duration: string;
  };
  /** Alert grouping key */
  groupBy?: string[];
  /** Labels to attach to the alert */
  labels: Record<string, string>;
  /** Annotations for context */
  annotations: {
    summary: string;
    description: string;
    runbook?: string;
    dashboard?: string;
  };
  /** Notification channels */
  channels: string[];
  /** Time between repeated notifications */
  repeatInterval?: string;
  /** Silence period after resolution */
  silenceAfterResolve?: string;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'slack' | 'pagerduty' | 'email' | 'webhook' | 'sentry';
  config: Record<string, string>;
  /** Severities this channel should receive */
  severities: AlertSeverity[];
  /** Active hours (24h format, e.g., "09:00-18:00") */
  activeHours?: string;
  /** Timezone for active hours */
  timezone?: string;
}

/**
 * Escalation policy definition
 */
export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  /** Steps in the escalation, each with increasing timeout */
  steps: {
    order: number;
    timeoutMinutes: number;
    channels: string[];
    onCallSchedule?: string;
  }[];
}

// =============================================================================
// Notification Channels
// =============================================================================

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'slack-critical',
    name: 'Slack Critical Alerts',
    type: 'slack',
    config: {
      webhook: '${SLACK_CRITICAL_WEBHOOK}',
      channel: '#alerts-critical',
      username: 'Alert Bot',
      iconEmoji: ':rotating_light:',
    },
    severities: ['critical', 'high'],
  },
  {
    id: 'slack-warnings',
    name: 'Slack Warning Alerts',
    type: 'slack',
    config: {
      webhook: '${SLACK_WARNING_WEBHOOK}',
      channel: '#alerts-warnings',
      username: 'Alert Bot',
      iconEmoji: ':warning:',
    },
    severities: ['medium', 'low'],
    activeHours: '06:00-22:00',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'pagerduty-critical',
    name: 'PagerDuty Critical',
    type: 'pagerduty',
    config: {
      integrationKey: '${PAGERDUTY_INTEGRATION_KEY}',
      severity: 'critical',
    },
    severities: ['critical'],
  },
  {
    id: 'pagerduty-high',
    name: 'PagerDuty High Priority',
    type: 'pagerduty',
    config: {
      integrationKey: '${PAGERDUTY_INTEGRATION_KEY}',
      severity: 'error',
    },
    severities: ['high'],
  },
  {
    id: 'email-engineering',
    name: 'Engineering Team Email',
    type: 'email',
    config: {
      recipients: '${ENGINEERING_EMAIL_GROUP}',
      from: 'alerts@nidhi-sweaters.com',
    },
    severities: ['critical', 'high', 'medium'],
  },
  {
    id: 'sentry-issues',
    name: 'Sentry Issue Alerts',
    type: 'sentry',
    config: {
      projectId: '${SENTRY_PROJECT_ID}',
    },
    severities: ['critical', 'high', 'medium', 'low'],
  },
];

// =============================================================================
// Escalation Policies
// =============================================================================

export const ESCALATION_POLICIES: EscalationPolicy[] = [
  {
    id: 'p1-critical',
    name: 'P1 Critical Escalation',
    description: 'For critical production issues affecting revenue',
    steps: [
      {
        order: 1,
        timeoutMinutes: 5,
        channels: ['pagerduty-critical', 'slack-critical'],
        onCallSchedule: 'primary-oncall',
      },
      {
        order: 2,
        timeoutMinutes: 15,
        channels: ['pagerduty-critical', 'email-engineering'],
        onCallSchedule: 'secondary-oncall',
      },
      {
        order: 3,
        timeoutMinutes: 30,
        channels: ['pagerduty-critical', 'slack-critical'],
        onCallSchedule: 'engineering-manager',
      },
      {
        order: 4,
        timeoutMinutes: 60,
        channels: ['pagerduty-critical'],
        onCallSchedule: 'cto',
      },
    ],
  },
  {
    id: 'p2-high',
    name: 'P2 High Priority Escalation',
    description: 'For high priority issues requiring prompt attention',
    steps: [
      {
        order: 1,
        timeoutMinutes: 15,
        channels: ['pagerduty-high', 'slack-critical'],
        onCallSchedule: 'primary-oncall',
      },
      {
        order: 2,
        timeoutMinutes: 30,
        channels: ['slack-critical', 'email-engineering'],
        onCallSchedule: 'secondary-oncall',
      },
      {
        order: 3,
        timeoutMinutes: 60,
        channels: ['slack-critical'],
        onCallSchedule: 'engineering-manager',
      },
    ],
  },
  {
    id: 'p3-medium',
    name: 'P3 Medium Priority Escalation',
    description: 'For medium priority issues during business hours',
    steps: [
      {
        order: 1,
        timeoutMinutes: 60,
        channels: ['slack-warnings'],
      },
      {
        order: 2,
        timeoutMinutes: 240,
        channels: ['email-engineering'],
      },
    ],
  },
];

// =============================================================================
// Alert Rules - Payment Related
// =============================================================================

export const PAYMENT_ALERTS: AlertRule[] = [
  {
    id: 'payment-success-rate-critical',
    name: 'Payment Success Rate Critical',
    description: 'Payment success rate has dropped below critical threshold',
    severity: 'critical',
    metric: 'ecommerce.payment.success_rate',
    condition: {
      operator: '<',
      value: 95, // Below 95% success rate
      duration: '5m',
    },
    labels: {
      category: 'payment',
      team: 'payments',
      slo: 'payment_success_rate',
    },
    annotations: {
      summary: 'Payment success rate critically low: {{ $value }}%',
      description: 'Payment success rate has fallen below 95% for 5 minutes. This directly impacts revenue.',
      runbook: '/docs/runbooks/payment-failures.md',
      dashboard: '/dashboards/payment-health',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
    repeatInterval: '5m',
  },
  {
    id: 'payment-success-rate-warning',
    name: 'Payment Success Rate Warning',
    description: 'Payment success rate is declining',
    severity: 'high',
    metric: 'ecommerce.payment.success_rate',
    condition: {
      operator: '<',
      value: 98,
      duration: '10m',
    },
    labels: {
      category: 'payment',
      team: 'payments',
      slo: 'payment_success_rate',
    },
    annotations: {
      summary: 'Payment success rate degraded: {{ $value }}%',
      description: 'Payment success rate has fallen below 98% for 10 minutes.',
      runbook: '/docs/runbooks/payment-failures.md',
      dashboard: '/dashboards/payment-health',
    },
    channels: ['slack-critical', 'pagerduty-high'],
    repeatInterval: '15m',
  },
  {
    id: 'payment-failure-spike',
    name: 'Payment Failure Spike',
    description: 'Sudden increase in payment failures',
    severity: 'critical',
    metric: 'increase(ecommerce.payment.failure[5m])',
    condition: {
      operator: '>',
      value: 10, // More than 10 failures in 5 minutes
      duration: '0m',
    },
    labels: {
      category: 'payment',
      team: 'payments',
      type: 'spike',
    },
    annotations: {
      summary: 'Payment failure spike detected: {{ $value }} failures',
      description: 'More than 10 payment failures detected in the last 5 minutes.',
      runbook: '/docs/runbooks/payment-failures.md',
      dashboard: '/dashboards/payment-health',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
  },
  {
    id: 'razorpay-gateway-error',
    name: 'Razorpay Gateway Errors',
    description: 'Razorpay gateway returning errors',
    severity: 'critical',
    metric: 'ecommerce.payment.gateway_error{gateway="razorpay"}',
    condition: {
      operator: '>',
      value: 5,
      duration: '2m',
    },
    labels: {
      category: 'payment',
      team: 'payments',
      vendor: 'razorpay',
    },
    annotations: {
      summary: 'Razorpay gateway errors: {{ $value }} in 2 minutes',
      description: 'Multiple Razorpay gateway errors detected. Check Razorpay status page and API connectivity.',
      runbook: '/docs/runbooks/razorpay-issues.md',
      dashboard: '/dashboards/payment-health',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
  },
  {
    id: 'payment-verification-failures',
    name: 'Payment Verification Failures',
    description: 'Payment signature verification failures',
    severity: 'high',
    metric: 'ecommerce.payment.verification_failure',
    condition: {
      operator: '>',
      value: 3,
      duration: '5m',
    },
    labels: {
      category: 'payment',
      team: 'security',
      type: 'verification',
    },
    annotations: {
      summary: 'Payment verification failures: {{ $value }}',
      description: 'Multiple payment signature verification failures. This could indicate a security issue or misconfiguration.',
      runbook: '/docs/runbooks/payment-security.md',
      dashboard: '/dashboards/security',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
  },
];

// =============================================================================
// Alert Rules - Performance Related
// =============================================================================

export const PERFORMANCE_ALERTS: AlertRule[] = [
  {
    id: 'lcp-critical',
    name: 'LCP Critical Degradation',
    description: 'Largest Contentful Paint exceeds critical threshold',
    severity: 'high',
    metric: 'web_vitals.lcp.p75',
    condition: {
      operator: '>',
      value: 4000, // 4 seconds - "poor" threshold
      duration: '10m',
    },
    labels: {
      category: 'performance',
      team: 'frontend',
      metric: 'lcp',
    },
    annotations: {
      summary: 'LCP critical: {{ $value }}ms (threshold: 4000ms)',
      description: 'Page load performance has degraded significantly. Users are experiencing slow page loads.',
      runbook: '/docs/runbooks/performance-lcp.md',
      dashboard: '/dashboards/web-vitals',
    },
    channels: ['slack-critical', 'pagerduty-high'],
    repeatInterval: '30m',
  },
  {
    id: 'lcp-warning',
    name: 'LCP Warning',
    description: 'LCP exceeds good threshold',
    severity: 'medium',
    metric: 'web_vitals.lcp.p75',
    condition: {
      operator: '>',
      value: 2500, // 2.5 seconds - "good" threshold
      duration: '15m',
    },
    labels: {
      category: 'performance',
      team: 'frontend',
      metric: 'lcp',
    },
    annotations: {
      summary: 'LCP degraded: {{ $value }}ms (threshold: 2500ms)',
      description: 'Page load performance is below optimal levels.',
      runbook: '/docs/runbooks/performance-lcp.md',
      dashboard: '/dashboards/web-vitals',
    },
    channels: ['slack-warnings'],
    repeatInterval: '1h',
  },
  {
    id: 'inp-critical',
    name: 'INP Critical',
    description: 'Interaction to Next Paint exceeds critical threshold',
    severity: 'high',
    metric: 'web_vitals.inp.p75',
    condition: {
      operator: '>',
      value: 500, // 500ms - "poor" threshold
      duration: '10m',
    },
    labels: {
      category: 'performance',
      team: 'frontend',
      metric: 'inp',
    },
    annotations: {
      summary: 'INP critical: {{ $value }}ms (threshold: 500ms)',
      description: 'Page interactivity is severely degraded. User interactions feel sluggish.',
      runbook: '/docs/runbooks/performance-inp.md',
      dashboard: '/dashboards/web-vitals',
    },
    channels: ['slack-critical'],
    repeatInterval: '30m',
  },
  {
    id: 'cls-critical',
    name: 'CLS Critical',
    description: 'Cumulative Layout Shift exceeds critical threshold',
    severity: 'medium',
    metric: 'web_vitals.cls.p75',
    condition: {
      operator: '>',
      value: 0.25, // "poor" threshold
      duration: '15m',
    },
    labels: {
      category: 'performance',
      team: 'frontend',
      metric: 'cls',
    },
    annotations: {
      summary: 'CLS critical: {{ $value }} (threshold: 0.25)',
      description: 'Visual stability is poor. Users are experiencing layout shifts.',
      runbook: '/docs/runbooks/performance-cls.md',
      dashboard: '/dashboards/web-vitals',
    },
    channels: ['slack-warnings'],
    repeatInterval: '1h',
  },
  {
    id: 'api-latency-critical',
    name: 'API Latency Critical',
    description: 'API response times exceed critical threshold',
    severity: 'high',
    metric: 'convex.api.latency.p95',
    condition: {
      operator: '>',
      value: 2000, // 2 seconds
      duration: '5m',
    },
    labels: {
      category: 'performance',
      team: 'backend',
      metric: 'latency',
    },
    annotations: {
      summary: 'API latency critical: {{ $value }}ms (threshold: 2000ms)',
      description: 'Backend API response times are critically high.',
      runbook: '/docs/runbooks/api-latency.md',
      dashboard: '/dashboards/api-performance',
    },
    channels: ['slack-critical', 'pagerduty-high'],
    repeatInterval: '15m',
  },
];

// =============================================================================
// Alert Rules - Error Rate Related
// =============================================================================

export const ERROR_ALERTS: AlertRule[] = [
  {
    id: 'error-rate-critical',
    name: 'Error Rate Critical',
    description: 'JavaScript error rate exceeds critical threshold',
    severity: 'high',
    metric: 'sentry.error_rate',
    condition: {
      operator: '>',
      value: 5, // 5% of sessions
      duration: '5m',
    },
    labels: {
      category: 'errors',
      team: 'frontend',
    },
    annotations: {
      summary: 'Error rate critical: {{ $value }}% of sessions',
      description: 'A significant percentage of user sessions are encountering errors.',
      runbook: '/docs/runbooks/error-investigation.md',
      dashboard: '/dashboards/errors',
    },
    channels: ['slack-critical', 'pagerduty-high'],
    repeatInterval: '15m',
  },
  {
    id: 'error-rate-warning',
    name: 'Error Rate Warning',
    description: 'Error rate above normal levels',
    severity: 'medium',
    metric: 'sentry.error_rate',
    condition: {
      operator: '>',
      value: 2,
      duration: '10m',
    },
    labels: {
      category: 'errors',
      team: 'frontend',
    },
    annotations: {
      summary: 'Error rate elevated: {{ $value }}% of sessions',
      description: 'Error rate is above normal levels.',
      runbook: '/docs/runbooks/error-investigation.md',
      dashboard: '/dashboards/errors',
    },
    channels: ['slack-warnings'],
    repeatInterval: '30m',
  },
  {
    id: 'new-error-type',
    name: 'New Error Type Detected',
    description: 'A new type of error has been detected',
    severity: 'medium',
    metric: 'sentry.new_issue',
    condition: {
      operator: '>=',
      value: 1,
      duration: '0m',
    },
    groupBy: ['error_type', 'error_message'],
    labels: {
      category: 'errors',
      team: 'frontend',
      type: 'new_issue',
    },
    annotations: {
      summary: 'New error type: {{ $labels.error_type }}',
      description: 'A new type of error has been detected: {{ $labels.error_message }}',
      runbook: '/docs/runbooks/new-error-triage.md',
      dashboard: '/dashboards/errors',
    },
    channels: ['slack-warnings', 'sentry-issues'],
  },
  {
    id: 'checkout-error-spike',
    name: 'Checkout Error Spike',
    description: 'Errors in checkout flow have spiked',
    severity: 'critical',
    metric: 'sentry.errors{page="/checkout"}',
    condition: {
      operator: '>',
      value: 5,
      duration: '3m',
    },
    labels: {
      category: 'errors',
      team: 'platform',
      flow: 'checkout',
    },
    annotations: {
      summary: 'Checkout errors spiking: {{ $value }} in 3 minutes',
      description: 'Multiple errors detected in the checkout flow. This directly impacts conversions.',
      runbook: '/docs/runbooks/checkout-errors.md',
      dashboard: '/dashboards/checkout',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
  },
];

// =============================================================================
// Alert Rules - Availability Related
// =============================================================================

export const AVAILABILITY_ALERTS: AlertRule[] = [
  {
    id: 'checkout-availability-critical',
    name: 'Checkout Availability Critical',
    description: 'Checkout flow availability has dropped',
    severity: 'critical',
    metric: 'ecommerce.checkout.availability',
    condition: {
      operator: '<',
      value: 99,
      duration: '3m',
    },
    labels: {
      category: 'availability',
      team: 'platform',
      flow: 'checkout',
    },
    annotations: {
      summary: 'Checkout availability: {{ $value }}% (target: 99.9%)',
      description: 'Checkout flow availability has dropped below critical threshold. Users cannot complete purchases.',
      runbook: '/docs/runbooks/checkout-availability.md',
      dashboard: '/dashboards/checkout',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
    repeatInterval: '5m',
  },
  {
    id: 'api-availability-critical',
    name: 'API Availability Critical',
    description: 'API availability has dropped',
    severity: 'critical',
    metric: 'convex.api.availability',
    condition: {
      operator: '<',
      value: 99,
      duration: '3m',
    },
    labels: {
      category: 'availability',
      team: 'backend',
    },
    annotations: {
      summary: 'API availability: {{ $value }}% (target: 99.9%)',
      description: 'Backend API availability has dropped. Multiple API endpoints may be failing.',
      runbook: '/docs/runbooks/api-availability.md',
      dashboard: '/dashboards/api-health',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
    repeatInterval: '5m',
  },
  {
    id: 'convex-connection-failure',
    name: 'Convex Connection Failures',
    description: 'Connection failures to Convex backend',
    severity: 'critical',
    metric: 'convex.connection.failures',
    condition: {
      operator: '>',
      value: 10,
      duration: '2m',
    },
    labels: {
      category: 'availability',
      team: 'backend',
      vendor: 'convex',
    },
    annotations: {
      summary: 'Convex connection failures: {{ $value }}',
      description: 'Multiple connection failures to Convex backend detected.',
      runbook: '/docs/runbooks/convex-issues.md',
      dashboard: '/dashboards/infrastructure',
    },
    channels: ['pagerduty-critical', 'slack-critical'],
  },
];

// =============================================================================
// Alert Rules - Business Metrics
// =============================================================================

export const BUSINESS_ALERTS: AlertRule[] = [
  {
    id: 'cart-abandonment-spike',
    name: 'Cart Abandonment Spike',
    description: 'Cart abandonment rate has increased significantly',
    severity: 'medium',
    metric: 'ecommerce.cart.abandonment_rate',
    condition: {
      operator: '>',
      value: 80, // 80% abandonment rate
      duration: '1h',
    },
    labels: {
      category: 'business',
      team: 'product',
    },
    annotations: {
      summary: 'Cart abandonment rate: {{ $value }}%',
      description: 'Cart abandonment rate has spiked above normal levels. Investigate checkout friction.',
      runbook: '/docs/runbooks/cart-abandonment.md',
      dashboard: '/dashboards/conversion',
    },
    channels: ['slack-warnings'],
    repeatInterval: '2h',
  },
  {
    id: 'zero-orders',
    name: 'No Orders Received',
    description: 'No orders received in expected timeframe',
    severity: 'high',
    metric: 'ecommerce.orders.count',
    condition: {
      operator: '==',
      value: 0,
      duration: '1h',
    },
    labels: {
      category: 'business',
      team: 'platform',
      type: 'revenue',
    },
    annotations: {
      summary: 'No orders received in the last hour',
      description: 'No orders have been placed in the last hour during normal business hours. This may indicate a critical issue.',
      runbook: '/docs/runbooks/no-orders.md',
      dashboard: '/dashboards/orders',
    },
    channels: ['slack-critical', 'pagerduty-high'],
  },
  {
    id: 'funnel-dropoff-spike',
    name: 'Checkout Funnel Drop-off Spike',
    description: 'Unusual drop-off in checkout funnel',
    severity: 'medium',
    metric: 'ecommerce.funnel.drop_off_rate{step="payment_init"}',
    condition: {
      operator: '>',
      value: 50, // 50% drop-off at payment step
      duration: '30m',
    },
    labels: {
      category: 'business',
      team: 'platform',
    },
    annotations: {
      summary: 'Checkout funnel drop-off at payment: {{ $value }}%',
      description: 'High drop-off rate at payment step. Users may be encountering issues with the payment flow.',
      runbook: '/docs/runbooks/checkout-funnel.md',
      dashboard: '/dashboards/conversion',
    },
    channels: ['slack-warnings'],
    repeatInterval: '1h',
  },
];

// =============================================================================
// Combined Alert Rules Export
// =============================================================================

export const ALL_ALERT_RULES: AlertRule[] = [
  ...PAYMENT_ALERTS,
  ...PERFORMANCE_ALERTS,
  ...ERROR_ALERTS,
  ...AVAILABILITY_ALERTS,
  ...BUSINESS_ALERTS,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: AlertSeverity): AlertRule[] {
  return ALL_ALERT_RULES.filter(alert => alert.severity === severity);
}

/**
 * Get alerts by category
 */
export function getAlertsByCategory(category: string): AlertRule[] {
  return ALL_ALERT_RULES.filter(alert => alert.labels.category === category);
}

/**
 * Get alerts by team
 */
export function getAlertsByTeam(team: string): AlertRule[] {
  return ALL_ALERT_RULES.filter(alert => alert.labels.team === team);
}

/**
 * Get escalation policy for an alert
 */
export function getEscalationPolicyForAlert(alert: AlertRule): EscalationPolicy | undefined {
  switch (alert.severity) {
    case 'critical':
      return ESCALATION_POLICIES.find(p => p.id === 'p1-critical');
    case 'high':
      return ESCALATION_POLICIES.find(p => p.id === 'p2-high');
    case 'medium':
    case 'low':
      return ESCALATION_POLICIES.find(p => p.id === 'p3-medium');
    default:
      return undefined;
  }
}

/**
 * Generate Sentry alert configuration
 */
export function generateSentryAlertConfig(alert: AlertRule): object {
  return {
    name: alert.name,
    conditions: [
      {
        id: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition',
        value: alert.condition.value,
        comparisonType: alert.condition.operator === '>' ? 'count' : 'percent',
        interval: alert.condition.duration,
      },
    ],
    actions: alert.channels.map(channel => {
      const ch = NOTIFICATION_CHANNELS.find(c => c.id === channel);
      if (!ch) return null;

      switch (ch.type) {
        case 'slack':
          return {
            id: 'sentry.integrations.slack.notify_action.SlackNotifyServiceAction',
            workspace: 'default',
            channel: ch.config.channel,
          };
        case 'pagerduty':
          return {
            id: 'sentry.integrations.pagerduty.notify_action.PagerDutyNotifyServiceAction',
            service: ch.config.integrationKey,
          };
        case 'email':
          return {
            id: 'sentry.mail.actions.NotifyEmailAction',
            targetType: 'Team',
          };
        default:
          return null;
      }
    }).filter(Boolean),
    actionMatch: 'all',
    frequency: parseInt(alert.repeatInterval || '30m') * 60,
    environment: 'production',
  };
}
