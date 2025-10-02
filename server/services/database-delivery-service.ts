import { storage } from '../storage';
import { twilioService } from './twilio';
import { smsHealthMonitor } from './sms-health-monitor';

export class DatabaseDeliveryService {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutes

  init() {
    console.log('🔄 Initializing Database-Driven Delivery Service...');
    console.log(`⏰ Polling every ${this.POLLING_INTERVAL / 60000} minutes`);
    
    // Start polling immediately
    this.startPolling();
    
    // Schedule daily queue population at midnight UTC
    this.scheduleDailyQueuePopulation();
    
    console.log('✅ Database delivery service initialized');
  }

  private startPolling() {
    // Run initial check immediately
    this.processDeliveries();
    
    // Then poll every 15 minutes
    this.intervalId = setInterval(async () => {
      await this.processDeliveries();
    }, this.POLLING_INTERVAL);
  }

  private async processDeliveries() {
    if (this.isProcessing) {
      console.log('🔄 Delivery processing already in progress, skipping');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('🔍 Checking for due deliveries...');

      const now = new Date();
      const windowStart = new Date(now.getTime() - this.POLLING_INTERVAL); // 15 minutes ago
      const windowEnd = new Date(now.getTime() + 60000); // 1 minute buffer

      // Get all deliveries due in this window
      const dueDeliveries = await this.getDueDeliveries(windowStart, windowEnd);
      
      if (dueDeliveries.length === 0) {
        console.log('📭 No deliveries due at this time');
        return;
      }

      console.log(`📬 Found ${dueDeliveries.length} deliveries to process`);

      // Process each delivery with all existing safeguards
      for (const delivery of dueDeliveries) {
        await this.processDelivery(delivery);
        
        // Rate limiting: 1 second between messages (existing logic)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Completed processing ${dueDeliveries.length} deliveries`);

    } catch (error) {
      console.error('❌ Error in delivery processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getDueDeliveries(windowStart: Date, windowEnd: Date) {
    try {
      // Use existing storage method but with time window
      const allPendingDeliveries = await storage.getDeliveriesToSend(windowEnd);
      
      // Filter for deliveries in our time window with single-attempt logic
      return allPendingDeliveries.filter(delivery => 
        delivery.status === 'pending' && 
        delivery.attempts === 0 && // SINGLE-ATTEMPT: Only process never-attempted deliveries
        delivery.scheduledFor >= windowStart && 
        delivery.scheduledFor <= windowEnd
      );
    } catch (error) {
      console.error('❌ Error fetching due deliveries:', error);
      return [];
    }
  }

  private async processDelivery(delivery: any) {
    try {
      console.log(`🎯 Processing delivery ${delivery.id} for user ${delivery.userId}`);

      // Get user details (existing logic)
      const user = await storage.getUser(delivery.userId);
      if (!user) {
        await storage.markDeliveryAsFailed(delivery.id, 'User not found');
        return;
      }

      if (!user.isActive) {
        await storage.markDeliveryAsFailed(delivery.id, 'User is inactive');
        return;
      }

      // Get pre-assigned question (existing logic)
      let question = null;
      if (delivery.questionId) {
        question = await storage.getQuestion(delivery.questionId);
      }

      if (!question) {
        await storage.markDeliveryAsFailed(delivery.id, 'Pre-assigned question not found');
        return;
      }

      // Format message with length optimization (existing logic)
      const questionNumber = user.questionsAnswered + 1;
      let message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
        `A) ${question.optionA}\n` +
        `B) ${question.optionB}\n` +
        `C) ${question.optionC}\n` +
        `D) ${question.optionD}\n\n` +
        `Reply A, B, C, or D`;

      // If message is too long, try shorter format (existing logic)
      if (message.length > 1400) {
        message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
          `A)${question.optionA}\nB)${question.optionB}\nC)${question.optionC}\nD)${question.optionD}\n\nReply A/B/C/D`;
      }

      // Check SMS health before sending (existing logic)
      if (!smsHealthMonitor.isHealthy()) {
        await storage.markDeliveryAsFailed(delivery.id, 'SMS service circuit breaker is open');
        return;
      }

      // Send SMS with SINGLE-ATTEMPT logic (existing logic)
      const smsSuccess = await twilioService.sendSMS({
        to: user.phoneNumber,
        body: message
      });

      if (smsSuccess) {
        smsHealthMonitor.recordSuccess();
        
        // Create pending answer record using atomic method
        const created = await storage.createPendingAnswerIfNone(user.id, question.id);
        if (!created) {
          console.log('⚠️ Failed to create pending answer in delivery service - cleaning up');
          const cleaned = await storage.cleanupOrphanedPendingAnswers();
          console.log(`🧼 Cleaned up ${cleaned} orphaned answers`);
          
          // Single attempt policy - mark as failed if still can't create
          const retryCreated = await storage.createPendingAnswerIfNone(user.id, question.id);
          if (!retryCreated) {
            await storage.markDeliveryAsFailed(delivery.id, 'Failed to create pending answer record');
            return;
          }
        }

        // Update user's last quiz date (existing logic)
        await storage.updateUser(user.id, { 
          lastQuizDate: new Date() 
        });

        // Mark delivery as sent (existing logic)
        await storage.markDeliveryAsSent(delivery.id, question.id);
        
        console.log(`✅ DELIVERY SUCCESS: ${user.phoneNumber} at ${new Date().toISOString()}`);
      } else {
        smsHealthMonitor.recordFailure();
        // SINGLE-ATTEMPT: Mark as failed, no retry (existing logic)
        await storage.markDeliveryAsFailed(delivery.id, 'SMS send failed - single attempt policy');
        console.log(`❌ DELIVERY FAILED: ${user.phoneNumber} (no retry)`);
      }

    } catch (error) {
      console.error(`❌ Error processing delivery ${delivery.id}:`, error);
      await storage.markDeliveryAsFailed(delivery.id, `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private scheduleDailyQueuePopulation() {
    // Use a simple setInterval for daily queue population
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0); // Midnight UTC

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Schedule first population
    setTimeout(async () => {
      await this.populateQueue();
      
      // Then schedule daily
      setInterval(async () => {
        await this.populateQueue();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
      
    }, msUntilMidnight);
  }

  private async populateQueue() {
    try {
      console.log('🌅 Running daily queue population...');
      const today = new Date();
      const count = await storage.populateDeliveryQueue(today);
      console.log(`✅ Scheduled ${count} deliveries for today`);
    } catch (error) {
      console.error('❌ Error in daily queue population:', error);
    }
  }

  // Graceful shutdown
  shutdown() {
    console.log('🛑 Shutting down database delivery service...');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('✅ Database delivery service stopped');
  }

  // Health check method
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      pollingInterval: this.POLLING_INTERVAL,
      lastCheck: new Date().toISOString()
    };
  }
}

export const databaseDeliveryService = new DatabaseDeliveryService();