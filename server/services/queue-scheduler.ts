import * as cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { geminiService } from './gemini';
import { smsHealthMonitor } from './sms-health-monitor';

export class QueueSchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

  init() {
    console.log('🚀 Initializing Queue-Based Scheduler...');
    
    // Daily queue population at midnight UTC
    cron.schedule('0 0 * * *', async () => {
      console.log('🌅 Running daily queue population...');
      await this.populateTomorrowQueue();
    });
    
    // Process queue every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ Processing delivery queue...');
      await this.processDeliveryQueue();
    });
    
    // On startup, populate today's queue if needed
    this.populateTodayQueueIfNeeded();
    
    console.log('✅ Queue-based scheduler initialized');
  }
  
  private async populateTodayQueueIfNeeded() {
    try {
      const todayStatus = await storage.getTodayDeliveryStatus();
      if (todayStatus.length === 0) {
        console.log('📅 No deliveries scheduled for today, populating queue...');
        const today = new Date();
        const count = await storage.populateDeliveryQueue(today);
        console.log(`✅ Scheduled ${count} deliveries for today`);
      } else {
        console.log(`📊 Today's queue already populated with ${todayStatus.length} deliveries`);
      }
    } catch (error) {
      console.error('Error checking today\'s queue:', error);
    }
  }
  
  private async populateTomorrowQueue() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const count = await storage.populateDeliveryQueue(tomorrow);
      console.log(`✅ Scheduled ${count} deliveries for tomorrow`);
    } catch (error) {
      console.error('Error populating tomorrow\'s queue:', error);
    }
  }
  
  private async processDeliveryQueue() {
    try {
      const now = new Date();
      const deliveries = await storage.getDeliveriesToSend(now);
      
      console.log(`📬 Found ${deliveries.length} deliveries to process`);
      
      // Rate limiting: process max 10 deliveries per batch
      const batchSize = Math.min(deliveries.length, 10);
      const batch = deliveries.slice(0, batchSize);
      
      if (deliveries.length > batchSize) {
        console.log(`⚠️ Rate limiting: processing ${batchSize} of ${deliveries.length} deliveries`);
      }
      
      for (const delivery of batch) {
        try {
          await this.sendScheduledDelivery(delivery);
          // Small delay between sends to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to process delivery ${delivery.id}:`, error);
          await storage.markDeliveryAsFailed(
            delivery.id, 
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } catch (error) {
      console.error('Error processing delivery queue:', error);
    }
  }
  
  private async sendScheduledDelivery(delivery: any) {
    console.log(`📤 Processing delivery ${delivery.id} for user ${delivery.userId}`);
    
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
      
      // Mark delivery as sent
      await storage.markDeliveryAsSent(delivery.id, question.id);
      
      console.log(`✅ Sent question to ${user.phoneNumber}`);
    } else {
      smsHealthMonitor.recordFailure();
      throw new Error('SMS send failed');
    }
  }
  
  // REMOVED: getQuestionForUser method no longer needed
  // Questions are now pre-selected during queue population for better performance
}

export const queueScheduler = new QueueSchedulerService();