import * as cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { geminiService } from './gemini';

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
      
      for (const delivery of deliveries) {
        try {
          await this.sendScheduledDelivery(delivery);
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
    
    // Format message
    const questionNumber = user.questionsAnswered + 1;
    const message = `🧠 Question #${questionNumber}: ${question.questionText}\n\n` +
      `A) ${question.optionA}\n` +
      `B) ${question.optionB}\n` +
      `C) ${question.optionC}\n` +
      `D) ${question.optionD}\n\n` +
      `Reply with A, B, C, or D`;
    
    // Send SMS
    const smsSuccess = await twilioService.sendSMS({
      to: user.phoneNumber,
      body: message
    });
    
    if (smsSuccess) {
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
      throw new Error('SMS send failed');
    }
  }
  
  // REMOVED: getQuestionForUser method no longer needed
  // Questions are now pre-selected during queue population for better performance
}

export const queueScheduler = new QueueSchedulerService();