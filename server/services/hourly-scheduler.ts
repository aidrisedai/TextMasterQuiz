import * as cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { smsHealthMonitor } from './sms-health-monitor';

export class HourlySchedulerService {
  private isPopulating = false;
  private isProcessing = false;

  init() {
    console.log('⏰ Initializing Hourly Delivery Scheduler...');
    
    // Daily queue population at 23:30 UTC (30 minutes before midnight)
    cron.schedule('30 23 * * *', async () => {
      console.log('🌅 Running daily queue population at 23:30 UTC...');
      await this.populateTomorrowQueue();
    });
    
    // Hourly delivery processing (on the hour: 01:00, 02:00, etc.)
    cron.schedule('0 * * * *', async () => {
      const currentHour = new Date().getUTCHours();
      console.log(`📬 Processing deliveries for hour ${currentHour}:00 UTC...`);
      await this.processHourlyDeliveries();
    });
    
    // On startup, populate today's queue if needed
    this.initializeIfNeeded();
    
    console.log('✅ Hourly scheduler initialized');
  }

  private async initializeIfNeeded() {
    try {
      const todayStatus = await storage.getTodayDeliveryStatus();
      if (todayStatus.length === 0) {
        console.log('📅 No deliveries scheduled for today, populating queue...');
        await this.populateTomorrowQueue();
      } else {
        console.log(`📊 Today's queue already populated with ${todayStatus.length} deliveries`);
      }
    } catch (error) {
      console.error('Error checking today\'s queue:', error);
    }
  }

  private async populateTomorrowQueue() {
    if (this.isPopulating) {
      console.log('⚠️ Queue population already in progress, skipping...');
      return;
    }

    this.isPopulating = true;
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Clear any existing pending deliveries for tomorrow
      await this.clearPendingDeliveries(tomorrow);
      
      // Get all active users
      const activeUsers = await storage.getAllActiveUsers();
      console.log(`👥 Processing ${activeUsers.length} active users for queue population...`);
      
      let scheduledCount = 0;
      
      for (const user of activeUsers) {
        try {
          await this.scheduleUserDelivery(user, tomorrow);
          scheduledCount++;
        } catch (error) {
          console.error(`Error scheduling delivery for user ${user.id}:`, error);
        }
      }
      
      console.log(`✅ Scheduled ${scheduledCount} deliveries for tomorrow`);
      
    } catch (error) {
      console.error('Error populating tomorrow\'s queue:', error);
    } finally {
      this.isPopulating = false;
    }
  }

  private async scheduleUserDelivery(user: any, targetDate: Date) {
    // Calculate user's delivery time in UTC
    const userDeliveryTime = this.calculateUserDeliveryTime(user, targetDate);
    
    // Get next category for this user (rotation logic)
    const category = this.getNextCategoryForUser(user);
    
    // Find best available question for this user in this category
    const question = await this.findBestQuestionForUser(user, category);
    
    if (!question) {
      console.log(`⚠️ No available questions for user ${user.id} in category ${category}, skipping...`);
      return;
    }
    
    // Create delivery queue entry
    await storage.createDeliveryQueueEntry({
      userId: user.id,
      scheduledFor: userDeliveryTime,
      questionId: question.id,
      status: 'pending',
      attempts: 0
    });
    
    // Update user's category index for next time
    await this.updateUserCategoryIndex(user);
    
    console.log(`📍 Scheduled ${category} question for user ${user.id} at ${userDeliveryTime.toISOString()}`);
  }

  private calculateUserDeliveryTime(user: any, targetDate: Date): Date {
    // Convert user's preferred time to UTC on target date
    const [hours, minutes] = user.preferredTime.split(':').map(Number);
    
    // Create date in user's timezone, then convert to UTC
    // This reuses the existing timezone conversion logic from storage
    const localTimeStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    return storage.convertToUTC(localTimeStr, user.timezone);
  }

  private getNextCategoryForUser(user: any): string {
    const categories = user.categoryPreferences || ['general'];
    if (categories.length === 0) return 'general';
    
    const currentIndex = user.currentCategoryIndex || 0;
    return categories[currentIndex % categories.length];
  }

  private async findBestQuestionForUser(user: any, category: string) {
    // Option A: Get least-used questions first, then filter for user
    const candidateQuestions = await storage.getQuestionsForCategory(category, 20);
    
    if (candidateQuestions.length === 0) {
      console.log(`⚠️ No questions available for category ${category}`);
      return null;
    }
    
    // Get questions user has already answered
    const userAnsweredQuestions = await storage.getUserAnsweredQuestionIds(user.id);
    
    // Find first unused question
    const unusedQuestion = candidateQuestions.find((q: any) => !userAnsweredQuestions.includes(q.id));
    
    if (unusedQuestion) {
      return unusedQuestion;
    }
    
    // If no unused questions, trigger question generation or use fallback
    console.log(`⚠️ User ${user.id} has seen all questions in ${category}, using fallback...`);
    
    // Fallback: use least-used question anyway (they'll see it again)
    return candidateQuestions[0];
  }

  private async updateUserCategoryIndex(user: any) {
    const categories = user.categoryPreferences || ['general'];
    const nextIndex = (user.currentCategoryIndex + 1) % categories.length;
    
    await storage.updateUser(user.id, {
      currentCategoryIndex: nextIndex
    });
  }

  private async clearPendingDeliveries(date: Date) {
    // Clear existing pending deliveries for the target date
    await storage.clearPendingDeliveriesForDate(date);
  }

  private async processHourlyDeliveries() {
    if (this.isProcessing) {
      console.log('⚠️ Hourly processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      const now = new Date();
      const currentHour = now.getUTCHours();
      
      // Get all deliveries scheduled for this hour
      const deliveries = await storage.getDeliveriesForHour(currentHour);
      
      console.log(`📬 Found ${deliveries.length} deliveries to process for hour ${currentHour}`);
      
      if (deliveries.length === 0) {
        console.log('✅ No deliveries to process this hour');
        return;
      }
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each delivery
      for (const delivery of deliveries) {
        try {
          const success = await this.executeDelivery(delivery);
          if (success) {
            successCount++;
          } else {
            failureCount++;
          }
          
          // Small delay between sends to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to process delivery ${delivery.id}:`, error);
          await storage.markDeliveryAsFailed(
            delivery.id, 
            error instanceof Error ? error.message : 'Unknown error'
          );
          failureCount++;
        }
      }
      
      console.log(`✅ Hourly processing complete: ${successCount} sent, ${failureCount} failed`);
      
    } catch (error) {
      console.error('Error processing hourly deliveries:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeDelivery(delivery: any): Promise<boolean> {
    // Test Environment Protection
    if (process.env.NODE_ENV === 'test') {
      console.log(`🧪 TEST MODE: Would send delivery ${delivery.id}`);
      await storage.markDeliveryAsSent(delivery.id, delivery.questionId);
      return true;
    }

    // Get user details
    const user = await storage.getUser(delivery.userId);
    if (!user) {
      await storage.markDeliveryAsFailed(delivery.id, 'User not found');
      return false;
    }

    if (!user.isActive) {
      await storage.markDeliveryAsFailed(delivery.id, 'User is inactive');
      return false;
    }

    // Get the pre-assigned question
    const question = await storage.getQuestion(delivery.questionId);
    if (!question) {
      await storage.markDeliveryAsFailed(delivery.id, 'Question not found');
      return false;
    }

    // Check SMS health before sending
    if (!smsHealthMonitor.isHealthy()) {
      await storage.markDeliveryAsFailed(delivery.id, 'SMS service circuit breaker is open');
      return false;
    }

    // Format message
    const questionNumber = user.questionsAnswered + 1;
    let message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
      `A) ${question.optionA}\n` +
      `B) ${question.optionB}\n` +
      `C) ${question.optionC}\n` +
      `D) ${question.optionD}\n\n` +
      `Reply A, B, C, or D`;

    // If message is too long, use shorter format
    if (message.length > 1400) {
      message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
        `A)${question.optionA}\nB)${question.optionB}\nC)${question.optionC}\nD)${question.optionD}\n\nReply A/B/C/D`;
    }

    // Send SMS (single attempt)
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
      
      console.log(`✅ Successfully delivered to ${user.phoneNumber}`);
      return true;
      
    } else {
      smsHealthMonitor.recordFailure();
      
      // Single attempt - mark as failed
      await storage.markDeliveryAsFailed(delivery.id, 'SMS send failed - single attempt');
      console.log(`❌ Failed to deliver to ${user.phoneNumber}`);
      return false;
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

    // Check SMS health
    if (!smsHealthMonitor.isHealthy()) {
      throw new Error('SMS service circuit breaker is open');
    }

    // Get current category for user
    const category = this.getNextCategoryForUser(user);
    const question = await this.findBestQuestionForUser(user, category);
    
    if (!question) {
      throw new Error('No questions available');
    }

    // Format and send message (same logic as executeDelivery)
    const questionNumber = user.questionsAnswered + 1;
    let message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
      `A) ${question.optionA}\n` +
      `B) ${question.optionB}\n` +
      `C) ${question.optionC}\n` +
      `D) ${question.optionD}\n\n` +
      `Reply A, B, C, or D`;

    if (message.length > 1400) {
      message = `🧠 Q#${questionNumber}: ${question.questionText}\n\n` +
        `A)${question.optionA}\nB)${question.optionB}\nC)${question.optionC}\nD)${question.optionD}\n\nReply A/B/C/D`;
    }

    const smsSuccess = await twilioService.sendSMS({
      to: user.phoneNumber,
      body: message
    });

    if (smsSuccess) {
      smsHealthMonitor.recordSuccess();
      
      await storage.recordAnswer({
        userId: user.id,
        questionId: question.id,
        userAnswer: null,
        isCorrect: false,
        pointsEarned: 0
      });
      
      await storage.updateUser(user.id, { 
        lastQuizDate: new Date() 
      });
      
      console.log(`✅ Sent manual question to ${user.phoneNumber}`);
    } else {
      smsHealthMonitor.recordFailure();
      throw new Error('SMS send failed');
    }
  }
}

export const hourlyScheduler = new HourlySchedulerService();