import { twilioService } from './twilio';
import { monitoringService } from './monitoring';
import { smsHealthMonitor } from './sms-health-monitor';

export interface AlertRule {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  condition: () => Promise<boolean>;
  message: (context?: any) => string;
  cooldownMinutes: number;
  channels: ('sms' | 'email' | 'webhook')[];
}

export interface AlertConfig {
  adminPhoneNumber?: string;
  adminEmail?: string;
  webhookUrl?: string;
  enabledChannels: ('sms' | 'email' | 'webhook')[];
}

export interface AlertInstance {
  ruleId: string;
  triggeredAt: Date;
  lastNotificationAt: Date;
  notificationCount: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export class ProactiveAlertService {
  private alertInstances = new Map<string, AlertInstance>();
  private config: AlertConfig = {
    enabledChannels: ['sms'] // Default to SMS only since Twilio is already configured
  };
  
  private alertRules: AlertRule[] = [
    // CRITICAL ALERTS - Immediate SMS notification
    {
      id: 'sms_circuit_breaker',
      name: 'SMS Service Down',
      severity: 'critical',
      condition: async () => {
        const status = smsHealthMonitor.getStatus();
        return status.circuitOpen;
      },
      message: () => '🚨 CRITICAL: SMS service is down (circuit breaker open). User deliveries stopped.',
      cooldownMinutes: 15, // Don't spam, but alert every 15 min if still down
      channels: ['sms', 'email']
    },
    
    {
      id: 'database_failure',
      name: 'Database Connection Failed',
      severity: 'critical',
      condition: async () => {
        const health = await monitoringService.performHealthCheck();
        return !health.database;
      },
      message: () => '🚨 CRITICAL: Database connection failed. System unable to function.',
      cooldownMinutes: 10,
      channels: ['sms', 'email']
    },

    {
      id: 'no_deliveries_scheduled',
      name: 'Queue Population Failed',
      severity: 'critical',
      condition: async () => {
        const health = await monitoringService.performHealthCheck();
        return !health.scheduler;
      },
      message: () => '🚨 CRITICAL: No deliveries scheduled for today. Queue population may have failed.',
      cooldownMinutes: 60, // Only alert once per hour for this
      channels: ['sms', 'email']
    },

    // WARNING ALERTS - Less frequent notification
    {
      id: 'low_delivery_rate',
      name: 'Low Delivery Success Rate',
      severity: 'warning',
      condition: async () => {
        const metrics = await monitoringService.getDailyMetrics();
        return metrics.deliveryRate < 80 && metrics.scheduledDeliveries > 5; // Only if significant volume
      },
      message: (context) => `⚠️ WARNING: Delivery rate dropped to ${context?.deliveryRate}% (${context?.successfulDeliveries}/${context?.scheduledDeliveries} delivered)`,
      cooldownMinutes: 120, // Alert every 2 hours if still low
      channels: ['email']
    },

    {
      id: 'high_failure_rate',
      name: 'High SMS Failure Rate',
      severity: 'warning',
      condition: async () => {
        const status = smsHealthMonitor.getStatus();
        return status.consecutiveFailures >= 3 && !status.circuitOpen;
      },
      message: (context) => `⚠️ WARNING: ${context?.consecutiveFailures} consecutive SMS failures. Service may be degrading.`,
      cooldownMinutes: 30,
      channels: ['email']
    },

    // INFO ALERTS - Daily summaries
    {
      id: 'daily_summary',
      name: 'Daily Operations Summary',
      severity: 'info',
      condition: async () => {
        // Trigger once per day at 23:45 (15 minutes before midnight queue population)
        const now = new Date();
        return now.getUTCHours() === 23 && now.getUTCMinutes() === 45;
      },
      message: (context) => `📊 Daily Summary: ${context?.successfulDeliveries}/${context?.scheduledDeliveries} delivered (${context?.deliveryRate}%), ${context?.totalUsers} active users`,
      cooldownMinutes: 1440, // Once per day
      channels: ['email']
    }
  ];

  init(config?: Partial<AlertConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    console.log('🔔 Initializing Proactive Alert System...');
    
    // Run alert checks every 2 minutes (more frequent than health checks)
    setInterval(async () => {
      await this.checkAllAlerts();
    }, 2 * 60 * 1000);
    
    console.log('✅ Proactive alerts initialized');
  }

  private async checkAllAlerts() {
    for (const rule of this.alertRules) {
      try {
        await this.checkAlert(rule);
      } catch (error) {
        console.error(`Error checking alert ${rule.id}:`, error);
      }
    }
  }

  private async checkAlert(rule: AlertRule) {
    const now = new Date();
    const isTriggered = await rule.condition();
    const alertInstance = this.alertInstances.get(rule.id);

    if (isTriggered) {
      // Alert condition is met
      if (!alertInstance) {
        // New alert - create and send immediately
        const newInstance: AlertInstance = {
          ruleId: rule.id,
          triggeredAt: now,
          lastNotificationAt: now,
          notificationCount: 1,
          resolved: false
        };
        
        this.alertInstances.set(rule.id, newInstance);
        await this.sendAlert(rule, await this.getAlertContext(rule.id));
        console.log(`🔔 New alert triggered: ${rule.name}`);
        
      } else if (!alertInstance.resolved) {
        // Existing alert still active - check cooldown
        const minutesSinceLastNotification = (now.getTime() - alertInstance.lastNotificationAt.getTime()) / (1000 * 60);
        
        if (minutesSinceLastNotification >= rule.cooldownMinutes) {
          // Cooldown expired - send reminder
          alertInstance.lastNotificationAt = now;
          alertInstance.notificationCount++;
          
          await this.sendAlert(rule, await this.getAlertContext(rule.id), true);
          console.log(`🔔 Alert reminder sent: ${rule.name} (${alertInstance.notificationCount}x)`);
        }
      }
    } else {
      // Alert condition is not met
      if (alertInstance && !alertInstance.resolved) {
        // Alert resolved
        alertInstance.resolved = true;
        alertInstance.resolvedAt = now;
        
        // Send resolution notification for critical alerts
        if (rule.severity === 'critical') {
          await this.sendResolutionAlert(rule);
          console.log(`✅ Alert resolved: ${rule.name}`);
        }
      }
    }
  }

  private async getAlertContext(ruleId: string): Promise<any> {
    switch (ruleId) {
      case 'low_delivery_rate':
      case 'daily_summary':
        const metrics = await monitoringService.getDailyMetrics();
        return {
          deliveryRate: metrics.deliveryRate,
          successfulDeliveries: metrics.successfulDeliveries,
          scheduledDeliveries: metrics.scheduledDeliveries,
          totalUsers: metrics.totalUsers
        };
      
      case 'high_failure_rate':
        const status = smsHealthMonitor.getStatus();
        return {
          consecutiveFailures: status.consecutiveFailures,
          totalFailures: status.totalFailures
        };
      
      default:
        return {};
    }
  }

  private async sendAlert(rule: AlertRule, context: any, isReminder = false) {
    const message = rule.message(context);
    const prefix = isReminder ? `[REMINDER ${this.alertInstances.get(rule.id)?.notificationCount}x] ` : '';
    const fullMessage = prefix + message;

    // Send to enabled channels
    for (const channel of rule.channels) {
      if (this.config.enabledChannels.includes(channel)) {
        try {
          await this.sendToChannel(channel, fullMessage, rule.severity);
        } catch (error) {
          console.error(`Failed to send alert to ${channel}:`, error);
        }
      }
    }
  }

  private async sendResolutionAlert(rule: AlertRule) {
    const message = `✅ RESOLVED: ${rule.name} - System has recovered`;
    
    // Send resolution only to critical alert channels
    for (const channel of rule.channels) {
      if (this.config.enabledChannels.includes(channel)) {
        try {
          await this.sendToChannel(channel, message, 'info');
        } catch (error) {
          console.error(`Failed to send resolution alert to ${channel}:`, error);
        }
      }
    }
  }

  private async sendToChannel(channel: 'sms' | 'email' | 'webhook', message: string, severity: string) {
    switch (channel) {
      case 'sms':
        if (this.config.adminPhoneNumber) {
          await this.sendSMSAlert(message);
        }
        break;
        
      case 'email':
        if (this.config.adminEmail) {
          await this.sendEmailAlert(message, severity);
        }
        break;
        
      case 'webhook':
        if (this.config.webhookUrl) {
          await this.sendWebhookAlert(message, severity);
        }
        break;
    }
  }

  private async sendSMSAlert(message: string) {
    if (!this.config.adminPhoneNumber) return;
    
    // Use existing Twilio service
    const success = await twilioService.sendSMS({
      to: this.config.adminPhoneNumber,
      body: `[Text4Quiz Alert]\n\n${message}`
    });
    
    if (!success) {
      console.error('Failed to send SMS alert');
    }
  }

  private async sendEmailAlert(message: string, severity: string) {
    // TODO: Implement email alerts
    // Could use services like SendGrid, AWS SES, or SMTP
    console.log(`📧 Would send email alert (${severity}): ${message}`);
  }

  private async sendWebhookAlert(message: string, severity: string) {
    if (!this.config.webhookUrl) return;
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'Text4Quiz',
          severity,
          message,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error(`Webhook alert failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  // Admin methods for configuration
  updateConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
    console.log('🔧 Alert configuration updated');
  }

  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.alertInstances.values()).filter(alert => !alert.resolved);
  }

  resolveAlert(ruleId: string) {
    const alert = this.alertInstances.get(ruleId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Manually resolved alert: ${ruleId}`);
    }
  }
}

export const proactiveAlerts = new ProactiveAlertService();