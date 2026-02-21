/**
 * Alert Configuration
 * 
 * This file defines alert thresholds for monitoring.
 * These thresholds should be configured in Prometheus AlertManager
 * or your monitoring system of choice.
 */

export const alertThresholds = {
  // Error rate threshold (errors per minute)
  errorRate: {
    warning: 10,
    critical: 50,
    description: 'Alert when error rate exceeds threshold',
  },

  // API response time threshold (seconds)
  apiResponseTime: {
    warning: 0.5,
    critical: 2.0,
    description: 'Alert when API response time exceeds threshold',
  },

  // Database query time threshold (seconds)
  databaseQueryTime: {
    warning: 0.1,
    critical: 1.0,
    description: 'Alert when database query time exceeds threshold',
  },

  // Database connection failures
  databaseConnectionFailures: {
    warning: 3,
    critical: 10,
    description: 'Alert when database connection failures exceed threshold',
  },

  // Optimization processing time (seconds)
  optimizationTime: {
    warning: 1.0,
    critical: 5.0,
    description: 'Alert when optimization processing time exceeds threshold',
  },

  // Queue size threshold
  queueSize: {
    warning: 100,
    critical: 500,
    description: 'Alert when job queue size exceeds threshold',
  },

  // Memory usage threshold (percentage)
  memoryUsage: {
    warning: 80,
    critical: 95,
    description: 'Alert when memory usage exceeds threshold',
  },

  // CPU usage threshold (percentage)
  cpuUsage: {
    warning: 80,
    critical: 95,
    description: 'Alert when CPU usage exceeds threshold',
  },
}

/**
 * Prometheus AlertManager rules (YAML format)
 * 
 * Save this to prometheus/alerts.yml and configure in Prometheus
 */
export const prometheusAlertRules = `
groups:
  - name: packaging_optimizer_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > ${alertThresholds.errorRate.warning}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/min (threshold: ${alertThresholds.errorRate.warning})"

      - alert: CriticalErrorRate
        expr: rate(errors_total[5m]) > ${alertThresholds.errorRate.critical}
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical error rate detected"
          description: "Error rate is {{ $value }} errors/min (threshold: ${alertThresholds.errorRate.critical})"

      # Slow API responses
      - alert: SlowAPIResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > ${alertThresholds.apiResponseTime.warning}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time degradation"
          description: "95th percentile response time is {{ $value }}s (threshold: ${alertThresholds.apiResponseTime.warning}s)"

      - alert: CriticalAPIResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > ${alertThresholds.apiResponseTime.critical}
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical API response time degradation"
          description: "95th percentile response time is {{ $value }}s (threshold: ${alertThresholds.apiResponseTime.critical}s)"

      # Database connection failures
      - alert: DatabaseConnectionFailures
        expr: rate(database_connection_errors_total[5m]) > ${alertThresholds.databaseConnectionFailures.warning}
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection failures detected"
          description: "Database connection failure rate is {{ $value }}/min"

      - alert: CriticalDatabaseFailures
        expr: rate(database_connection_errors_total[5m]) > ${alertThresholds.databaseConnectionFailures.critical}
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical database connection failures"
          description: "Database connection failure rate is {{ $value }}/min"

      # Slow database queries
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > ${alertThresholds.databaseQueryTime.warning}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query time is {{ $value }}s"

      # High queue size
      - alert: HighQueueSize
        expr: job_queue_size > ${alertThresholds.queueSize.warning}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Job queue size is high"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} jobs pending"

      - alert: CriticalQueueSize
        expr: job_queue_size > ${alertThresholds.queueSize.critical}
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Job queue size is critical"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} jobs pending"

      # Service health
      - alert: ServiceDown
        expr: up{job="packaging-optimizer"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Packaging optimizer service is not responding"
`

/**
 * Example notification channels configuration
 * Configure these in your monitoring system
 */
export const notificationChannels = {
  email: {
    enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
  },
  slack: {
    enabled: process.env.ALERT_SLACK_ENABLED === 'true',
    webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL,
  },
  pagerduty: {
    enabled: process.env.ALERT_PAGERDUTY_ENABLED === 'true',
    serviceKey: process.env.ALERT_PAGERDUTY_SERVICE_KEY,
  },
}


