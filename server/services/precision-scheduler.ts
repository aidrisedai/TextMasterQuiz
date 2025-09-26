import * as cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { smsHealthMonitor } from './sms-health-monitor';

export class PrecisionSchedulerService {
  private scheduledJobs = new Map<number, cron.ScheduledTask>();

  init() {
    console.log('🎯 Initializing Precision Delivery Scheduler...');
    
    // Daily queue population at midnight UTC
    cron.schedule('0 0 * * *', async () => {
      console.log('🌅 Running daily queue population...');
      await this.populateTomorrowQueue();
    });
    
    // On startup: schedule existing pending deliveries and populate today's queue
    this.initializePendingDeliveries();
    
    console.log('✅ Precision scheduler initialized');
  }

  private async initializePendingDeliveries() {
    try {
      // Populate today's queue if needed
      const todayStatus = await storage.getTodayDeliveryStatus();
      if (todayStatus.length === 0) {
        console.log('📅 No deliveries scheduled for today, populating queue...');
        const today = new Date();
        const count = await storage.populateDeliveryQueue(today);
        console.log(`✅ Scheduled ${count} deliveries for today`);
      }

      // Schedule all pending deliveries for precise timing
      await this.scheduleAllPendingDeliveries();
      
    } catch (error) {
      console.error('Error initializing pending deliveries:', error);
    }
  }

  private async scheduleAllPendingDeliveries() {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
      
      const pendingDeliveries = await this.getPendingDeliveriesInRange(now, futureTime);
      console.log(`🕐 Found ${pendingDeliveries.length} pending deliveries to schedule precisely`);
      
      for (const delivery of pendingDeliveries) {
        this.scheduleDelivery(delivery);
      }
      
    } catch (error) {
      console.error('Error scheduling pending deliveries:', error);
    }
  }

  private async getPendingDeliveriesInRange(start: Date, end: Date) {
    // Get pending deliveries with single-attempt logic (attempts = 0 only)
    const deliveries = await storage.getDeliveriesToSend(end);
    return deliveries.filter(d => 
      d.status === 'pending' && 
      d.attempts === 0 && // SINGLE-ATTEMPT: Only process never-attempted deliveries
      d.scheduledFor >= start && 
      d.scheduledFor <= end
    );
  }

  private scheduleDelivery(delivery: any) {
    const deliveryTime = new Date(delivery.scheduledFor);
    const now = new Date();
    
    // Skip if delivery time has passed by more than 5 minutes (missed window)
    if (deliveryTime.getTime() < now.getTime() - 5 * 60 * 1000) {
      console.log(`⏰ Skipping missed delivery ${delivery.id} (scheduled for ${deliveryTime.toISOString()})`);
      storage.markDeliveryAsFailed(delivery.id, 'Missed delivery window');
      return;
    }

    // If already scheduled, skip
    if (this.scheduledJobs.has(delivery.id)) {
      return;
    }

    // Convert to cron format for precision timing
    const cronExpression = this.dateToCronExpression(deliveryTime);
    console.log(`📍 Precision scheduling delivery ${delivery.id} for ${deliveryTime.toISOString()} (${cronExpression})`);

    // Schedule the exact delivery time
    const job = cron.schedule(cronExpression, async () => {
      console.log(`🎯 PRECISE DELIVERY: Processing delivery ${delivery.id} at exact time`);
      await this.executePreciseDelivery(delivery);
      
      // Clean up the job after execution
      this.scheduledJobs.delete(delivery.id);
      job.stop();
    }, {
      timezone: 'UTC'
    });

    this.scheduledJobs.set(delivery.id, job);
  }

  private dateToCronExpression(date: Date): string {
    const minute = date.getUTCMinutes();
    const hour = date.getUTCHours();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    
    // Create cron expression: "minute hour day month *"
    return `${minute} ${hour} ${day} ${month} *`;
  }

  private async executePreciseDelivery(delivery: any) {
    try {
      // Test Environment Protection
      if (process.env.NODE_ENV === 'test') {
        console.log('🧪 TEST MODE: Skipping real SMS delivery');
        await storage.markDeliveryAsSent(delivery.id, delivery.questionId || 0);
        return;
      }

      // Get user details
      const user = await storage.getUser(delivery.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        await storage.markDeliveryAsFailed(delivery.id, 'User is inactive');
        return;
      }

      // Get pre-assigned question
      let question = null;
      if (delivery.questionId) {
        question = await storage.getQuestion(delivery.questionId);
      }

      if (!question) {
        await storage.markDeliveryAsFailed(delivery.id, 'Pre-assigned question not found');
        return;
      }

      // Format message with length optimization
      const questionNumber = user.questionsAnswered + 1;
      let message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
        `A) ${question.optionA}\n` +
        `B) ${question.optionB}\n` +
        `C) ${question.optionC}\n` +
        `D) ${question.optionD}\n\n` +
        `Reply A, B, C, or D`;

      // If message is too long, try shorter format
      if (message.length > 1400) {
        message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
          `A)${question.optionA}\nB)${question.optionB}\nC)${question.optionC}\nD)${question.optionD}\n\nReply A/B/C/D`;
      }

      // Check SMS health before sending
      if (!smsHealthMonitor.isHealthy()) {
        throw new Error('SMS service circuit breaker is open');
      }

      // Send SMS with SINGLE-ATTEMPT logic
      const smsSuccess = await twilioService.sendSMS({
        to: user.phoneNumber,
        body: message
      });

      if (smsSuccess) {
        smsHealthMonitor.recordSuccess();
        
        // Create pending answer record
        await storage.recordAnswer({
          userId: user.id,
          questionId: question.id,
          userAnswer: null,
          isCorrect: false,
          pointsEarned: 0
        });

        // Update user's last quiz date
        await storage.updateUser(user.id, { 
          lastQuizDate: new Date() 
        });

        // Mark delivery as sent (SINGLE-ATTEMPT: No retry on success)
        await storage.markDeliveryAsSent(delivery.id, question.id);
        
        console.log(`✅ PRECISION DELIVERY SUCCESS: ${user.phoneNumber} at ${new Date().toISOString()}`);
      } else {
        smsHealthMonitor.recordFailure();
        // SINGLE-ATTEMPT: Mark as failed, no retry
        await storage.markDeliveryAsFailed(delivery.id, 'SMS send failed - single attempt policy');
        console.log(`❌ PRECISION DELIVERY FAILED: ${user.phoneNumber} (no retry)`);
      }
      
    } catch (error) {
      console.error(`Precision delivery error for ${delivery.id}:`, error);
      // SINGLE-ATTEMPT: Mark as failed, no retry
      await storage.markDeliveryAsFailed(
        delivery.id, 
        `Delivery failed: ${error instanceof Error ? error.message : 'Unknown error'} - single attempt policy`
      );
    }
  }

  private async populateTomorrowQueue() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const count = await storage.populateDeliveryQueue(tomorrow);
      console.log(`✅ Scheduled ${count} deliveries for tomorrow`);
      
      // Schedule the new deliveries for precision timing
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setUTCHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setUTCHours(23, 59, 59, 999);
      
      const tomorrowDeliveries = await this.getPendingDeliveriesInRange(tomorrowStart, tomorrowEnd);
      for (const delivery of tomorrowDeliveries) {
        this.scheduleDelivery(delivery);
      }
      
    } catch (error) {
      console.error('Error populating tomorrow\'s queue:', error);
    }
  }

  // Manual question sending (for admin testing)
  async sendQuestionNow(phoneNumber: string): Promise<void> {
    const user = await storage.getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User is inactive');
    }

    // Test Environment Protection
    if (process.env.NODE_ENV === 'test') {
      console.log('🧪 TEST MODE: Would send question to', phoneNumber);
      return;
    }

    // Check SMS health before sending
    if (!smsHealthMonitor.isHealthy()) {
      throw new Error('SMS service circuit breaker is open');
    }

    // Get a random question for the user's categories
    const question = await storage.getRandomQuestion(user.categoryPreferences || undefined);
    if (!question) {
      throw new Error('No questions available');
    }

    // Format message
    const questionNumber = user.questionsAnswered + 1;
    let message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
      `A) ${question.optionA}\n` +
      `B) ${question.optionB}\n` +
      `C) ${question.optionC}\n` +
      `D) ${question.optionD}\n\n` +
      `Reply A, B, C, or D`;

    // If message is too long, try shorter format
    if (message.length > 1400) {
      message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
        `A)${question.optionA}\nB)${question.optionB}\nC)${question.optionC}\nD)${question.optionD}\n\nReply A/B/C/D`;
    }

    // Send SMS
    const smsSuccess = await twilioService.sendSMS({
      to: user.phoneNumber,
      body: message
    });

    if (smsSuccess) {
      smsHealthMonitor.recordSuccess();
      
      // Create pending answer record
      await storage.recordAnswer({
        userId: user.id,
        questionId: question.id,
        userAnswer: null,
        isCorrect: false,
        pointsEarned: 0
      });
      
      // Update user's last quiz date
      await storage.updateUser(user.id, { 
        lastQuizDate: new Date() 
      });
      
      console.log(`✅ Sent manual question to ${user.phoneNumber}`);
    } else {
      smsHealthMonitor.recordFailure();
      throw new Error('SMS send failed');
    }
  }

  // Get scheduling status for monitoring
  getSchedulingStatus() {
    return {
      activeJobs: this.scheduledJobs.size,
      scheduledDeliveries: Array.from(this.scheduledJobs.keys())
    };
  }
}

export const precisionScheduler = new PrecisionSchedulerService();
export const precisionSchedulerService = precisionScheduler; // For backward compatibility
