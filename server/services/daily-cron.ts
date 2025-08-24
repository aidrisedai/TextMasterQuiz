import * as cron from 'node-cron';
import { monitoringService } from './monitoring';

export class DailyCronService {
  init() {
    console.log('📅 Initializing daily monitoring cron jobs...');

    // Daily report generation at 1 AM UTC
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('📊 Generating daily monitoring report...');
        
        // Generate report for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const report = await monitoringService.generateDailyReport(yesterday);
        console.log('📋 Daily Report Generated:');
        console.log(report);
        
        // Could send this via email, webhook, etc.
        // For now, just log it
        
      } catch (error) {
        console.error('❌ Daily report generation failed:', error);
      }
    });

    // Synthetic test every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('🧪 Running scheduled synthetic test...');
        const success = await monitoringService.runSyntheticTest();
        
        if (!success) {
          console.log('⚠️ Synthetic test failed - SMS service may have issues');
        }
      } catch (error) {
        console.error('❌ Synthetic test failed:', error);
      }
    });

    // Health summary at noon UTC
    cron.schedule('0 12 * * *', async () => {
      try {
        console.log('🏥 Running midday health check...');
        const health = await monitoringService.performHealthCheck();
        
        if (health.overallHealth !== 'healthy') {
          console.log(`⚠️ ALERT: System health is ${health.overallHealth}`);
          console.log('Issues:', health.issues.join(', '));
        } else {
          console.log('✅ System health: All systems operational');
        }
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    });

    console.log('✅ Daily monitoring cron jobs initialized');
  }
}

export const dailyCronService = new DailyCronService();