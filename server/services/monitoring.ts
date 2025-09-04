import { storage } from '../storage';
import { twilioService } from './twilio';
import { smsHealthMonitor } from './sms-health-monitor';

export interface DailyMetrics {
  date: string;
  totalUsers: number;
  scheduledDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  avgResponseTime: number;
  topFailureReasons: string[];
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface HealthCheck {
  timestamp: Date;
  smsService: boolean;
  database: boolean;
  scheduler: boolean;
  overallHealth: 'healthy' | 'degraded' | 'down';
  issues: string[];
}

class MonitoringService {
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private healthCheckTimer?: NodeJS.Timeout;

  async getDailyMetrics(date?: Date): Promise<DailyMetrics> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      // Get all users (active count)
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.filter(u => u.isActive).length;

      // Get today's delivery status for metrics
      const deliveries = await storage.getTodayDeliveryStatus();
      const todayDeliveries = deliveries.filter(d => {
        const deliveryDate = new Date(d.scheduledFor).toISOString().split('T')[0];
        return deliveryDate === dateStr;
      });

      const scheduledDeliveries = todayDeliveries.length;
      const successfulDeliveries = todayDeliveries.filter(d => d.status === 'sent').length;
      const failedDeliveries = todayDeliveries.filter(d => d.status === 'failed').length;
      const deliveryRate = scheduledDeliveries > 0 ? (successfulDeliveries / scheduledDeliveries) * 100 : 0;

      // Get failure reasons
      const failures = todayDeliveries
        .filter(d => d.status === 'failed' && d.errorMessage)
        .reduce((acc: Record<string, number>, d) => {
          const msg = d.errorMessage || 'Unknown';
          acc[msg] = (acc[msg] || 0) + 1;
          return acc;
        }, {});
      
      const topFailureReasons = Object.entries(failures)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([msg]) => msg);

      return {
        date: dateStr,
        totalUsers,
        scheduledDeliveries,
        successfulDeliveries,
        failedDeliveries,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        avgResponseTime: 0, // TODO: Implement response time tracking
        topFailureReasons,
        systemHealth: this.calculateSystemHealth(deliveryRate)
      };
    } catch (error) {
      console.error('Error getting daily metrics:', error);
      return {
        date: dateStr,
        totalUsers: 0,
        scheduledDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        deliveryRate: 0,
        avgResponseTime: 0,
        topFailureReasons: [],
        systemHealth: 'down'
      };
    }
  }

  async performHealthCheck(): Promise<HealthCheck> {
    const timestamp = new Date();
    const issues: string[] = [];
    let smsService = true;
    let database = true;
    let scheduler = true;

    // Check SMS service health
    try {
      const smsStatus = smsHealthMonitor.getStatus();
      if (!smsStatus.healthy) {
        smsService = false;
        issues.push(`SMS service unhealthy: ${smsStatus.consecutiveFailures} consecutive failures`);
      }
    } catch (error) {
      smsService = false;
      issues.push('SMS service check failed');
    }

    // Check database connectivity
    try {
      await (storage as any).db.raw('SELECT 1');
    } catch (error) {
      database = false;
      issues.push('Database connection failed');
    }

    // Check scheduler (recent queue population)
    try {
      const today = new Date();
      const todayDeliveries = await storage.getTodayDeliveryStatus();
      if (todayDeliveries.length === 0) {
        scheduler = false;
        issues.push('No deliveries scheduled for today');
      }
    } catch (error) {
      scheduler = false;
      issues.push('Scheduler check failed');
    }

    const overallHealth = this.calculateOverallHealth(smsService, database, scheduler);

    return {
      timestamp,
      smsService,
      database,
      scheduler,
      overallHealth,
      issues
    };
  }

  async generateDailyReport(date?: Date): Promise<string> {
    const metrics = await this.getDailyMetrics(date);
    const health = await this.performHealthCheck();
    
    const report = `
📊 Text4Quiz Daily Report - ${metrics.date}

🎯 Delivery Performance:
• Users: ${metrics.totalUsers} active
• Scheduled: ${metrics.scheduledDeliveries} messages
• Delivered: ${metrics.successfulDeliveries} (${metrics.deliveryRate}%)
• Failed: ${metrics.failedDeliveries}

🔍 System Health: ${health.overallHealth.toUpperCase()}
• SMS Service: ${health.smsService ? '✅' : '❌'}
• Database: ${health.database ? '✅' : '❌'}  
• Scheduler: ${health.scheduler ? '✅' : '❌'}

${health.issues.length > 0 ? `⚠️ Issues:\n${health.issues.map(i => `• ${i}`).join('\n')}` : '✅ No issues detected'}

${metrics.topFailureReasons.length > 0 ? `🔥 Top Failure Reasons:\n${metrics.topFailureReasons.map(r => `• ${r}`).join('\n')}` : ''}

Generated at: ${new Date().toLocaleString()}
    `.trim();

    return report;
  }

  async runSyntheticTest(): Promise<boolean> {
    // Test with a known test number (non-production)
    const testNumber = process.env.TEST_PHONE_NUMBER;
    if (!testNumber) {
      console.log('⚠️ No test phone number configured for synthetic testing');
      return false;
    }

    try {
      const testMessage = `🧪 Text4Quiz System Test - ${new Date().toLocaleTimeString()}`;
      const success = await twilioService.sendSMS({
        to: testNumber,
        body: testMessage
      });

      console.log(`🧪 Synthetic test ${success ? 'PASSED' : 'FAILED'} for ${testNumber}`);
      return success;
    } catch (error) {
      console.error('Synthetic test failed:', error);
      return false;
    }
  }

  startHealthMonitoring() {
    console.log('🔍 Starting health monitoring...');
    
    this.healthCheckTimer = setInterval(async () => {
      const health = await this.performHealthCheck();
      
      if (health.overallHealth !== 'healthy') {
        console.log(`⚠️ System health: ${health.overallHealth}`);
        console.log('Issues:', health.issues.join(', '));
        
        // Alert logic could go here (email, webhook, etc.)
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      console.log('🔍 Health monitoring stopped');
    }
  }

  private calculateSystemHealth(deliveryRate: number): 'healthy' | 'degraded' | 'down' {
    if (deliveryRate >= 95) return 'healthy';
    if (deliveryRate >= 80) return 'degraded';
    return 'down';
  }

  private calculateOverallHealth(sms: boolean, db: boolean, scheduler: boolean): 'healthy' | 'degraded' | 'down' {
    const healthyComponents = [sms, db, scheduler].filter(Boolean).length;
    
    if (healthyComponents === 3) return 'healthy';
    if (healthyComponents >= 2) return 'degraded';
    return 'down';
  }
}

export const monitoringService = new MonitoringService();