import * as cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { geminiService } from './gemini';

export class SchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

  init() {
    // DISABLED - Scheduler needs proper fixing before re-enabling
    // cron.schedule('*/5 * * * *', async () => {
    //   console.log(`📅 Scheduler check at ${new Date().toISOString()}`);
    //   await this.sendDailyQuestions();
    // });
    
    // Daily cleanup of orphaned pending answers (2 AM UTC)
    cron.schedule('0 2 * * *', async () => {
      try {
        const cleaned = await storage.cleanupOrphanedPendingAnswers();
        console.log(`🧹 Cleaned up ${cleaned} orphaned pending answers`);
      } catch (error) {
        console.error('Error in cleanup job:', error);
      }
    });
    
    // Disabled emergency scheduler - reverting to normal operation
    // cron.schedule('* * * * *', async () => {
    //   console.log('🚨 EMERGENCY SCHEDULER - checking for overdue users...');
    //   await this.sendDailyQuestions();
    // });

    console.log('Scheduler service initialized');
  }

  private async sendDailyQuestions() {
    try {
      console.log('🔍 Checking for users who need daily questions...');
      
      // Get current time in different timezones and find matching users
      const now = new Date();
      console.log(`⏰ Current time: ${now.toISOString()}`);
      
      const users = await this.getUsersForCurrentTime(now);
      console.log(`📋 Found ${users.length} users needing questions`);
      
      if (users.length === 0) {
        console.log('ℹ️  No users need questions at this time');
        return;
      }
      
      for (const user of users) {
        try {
          console.log(`📤 Sending question to ${user.phoneNumber}...`);
          await this.sendQuestionToUser(user);
          console.log(`✅ Question sent to ${user.phoneNumber}`);
        } catch (error) {
          console.error(`❌ Failed to send question to user ${user.id}:`, error);
        }
      }
      console.log(`📊 Delivery batch complete: ${users.length} users processed`);
    } catch (error) {
      console.error('💥 Error in sendDailyQuestions:', error);
    }
  }

  private async getUsersForCurrentTime(currentTime: Date) {
    try {
      console.log(`Checking for users at ${currentTime.toISOString()}`);
      
      // Get all active users
      const allUsers = await storage.getAllUsers();
      const activeUsers = allUsers.filter(user => user.isActive);
      
      const usersToSend = [];
      
      for (const user of activeUsers) {
        try {
          const [preferredHour, preferredMinute] = user.preferredTime.split(':').map(Number);
          const userTimezone = user.timezone || 'America/Los_Angeles';
          
          // Get user's current hour in their timezone using proper UTC conversion
          const userCurrentHour = this.getCurrentHourInTimezone(currentTime, userTimezone);
          
          console.log(`🕐 User ${user.phoneNumber}: Current hour in ${userTimezone} is ${userCurrentHour}, preferred hour is ${preferredHour}`);
          
          // Check if user needs a question (current hour matches OR they're overdue)
          const needsQuestion = await this.userNeedsQuestionNow(user, userCurrentHour, preferredHour, currentTime);
          if (needsQuestion) {
            console.log(`✅ User ${user.phoneNumber} needs daily question (${user.preferredTime} in ${userTimezone})`);
            usersToSend.push(user);
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
        }
      }
      
      return usersToSend;
    } catch (error) {
      console.error('Error getting users for current time:', error);
      return [];
    }
  }

  private getCurrentHourInTimezone(date: Date, timezone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false
    });
    
    const hour = formatter.format(date);
    return parseInt(hour, 10);
  }

  private async userNeedsQuestionNow(user: any, currentHour: number, preferredHour: number, currentTime: Date): Promise<boolean> {
    // Send at preferred hour OR if overdue (for reliability)
    const isPreferredHour = currentHour === preferredHour;
    const isPastPreferredHour = currentHour > preferredHour;
    const hasNotReceivedToday = !this.hasReceivedToday(user, currentTime);
    
    if (!isPreferredHour && !(isPastPreferredHour && hasNotReceivedToday)) {
      return false;
    }
    
    // Now check if they should receive a question
    return await this.shouldUserReceiveQuestion(user, currentTime);
  }
  
  private hasReceivedToday(user: any, currentTime: Date): boolean {
    if (!user.lastQuizDate) return false;
    
    const userTimezone = user.timezone || 'America/Los_Angeles';
    const lastQuizInUserTZ = new Date(user.lastQuizDate);
    return this.isSameDayInTimezone(currentTime, lastQuizInUserTZ, userTimezone);
  }

  private async shouldUserReceiveQuestion(user: any, currentTime: Date): Promise<boolean> {
    const userTimezone = user.timezone || 'America/Los_Angeles';
    
    // Check if user joined today - skip if they got welcome question
    const todayInUserTZ = currentTime;
    const joinDateInUserTZ = new Date(user.joinDate);
    
    if (this.isSameDayInTimezone(todayInUserTZ, joinDateInUserTZ, userTimezone)) {
      console.log(`🎯 User ${user.phoneNumber} joined today and already received welcome question. Next question tomorrow.`);
      return false;
    }
    
    // Check if already received today's question
    if (user.lastQuizDate) {
      const lastQuizInUserTZ = new Date(user.lastQuizDate);
      if (this.isSameDayInTimezone(todayInUserTZ, lastQuizInUserTZ, userTimezone)) {
        console.log(`⏭️  User ${user.phoneNumber} already received today's question`);
        return false;
      }
    }
    
    // NOTE: Removed pending answer check - now handled atomically in sendQuestionToUser
    // This prevents race conditions where multiple processes could pass the check
    // but the atomic createPendingAnswerIfNone() ensures only one succeeds
    
    return true;
  }

  private isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
    const format: Intl.DateTimeFormatOptions = { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    return new Intl.DateTimeFormat('en-US', format).format(date1) === 
           new Intl.DateTimeFormat('en-US', format).format(date2);
  }

  private async sendQuestionToUser(user: any) {
    try {
      console.log(`📤 Sending daily question to user ${user.id} (${user.phoneNumber})`);
      
      // Get question selection data
      const userAnswers = await storage.getUserAnswers(user.id, 1000);
      const answeredQuestionIds = userAnswers.map(answer => answer.questionId);
      
      // Select ONE category for today's question (rotate through user preferences)
      const userCategories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      
      // Use the number of questions answered to rotate through categories
      const categoryIndex = user.questionsAnswered % userCategories.length;
      const todayCategory = userCategories[categoryIndex];
      
      console.log(`🎯 Today's category: ${todayCategory} (${categoryIndex + 1}/${userCategories.length})`);
      
      // Try to get a question from database that user hasn't answered from TODAY'S category only
      let question = await storage.getRandomQuestion([todayCategory], answeredQuestionIds);
      
      if (!question) {
        // EMERGENCY STOP: Disable generation in old scheduler too
        console.log(`⚠️ No unused questions found for category ${todayCategory}, using fallback instead of generating`);
        // Use existing questions from any category as fallback
        question = await storage.getRandomQuestion(userCategories, answeredQuestionIds);
        if (!question) {
          // Last resort: use any question from database
          question = await storage.getRandomQuestion([], []);
        }
        // Skip the generation block entirely
      } else {
        console.log(`📚 Using existing ${todayCategory} question: ${question.questionText.substring(0, 50)}...`);
      }

      if (question) {
        // ATOMIC RACE CONDITION FIX: Check and create pending answer atomically
        const canSend = await storage.createPendingAnswerIfNone(user.id, question.id);
        if (!canSend) {
          console.log(`⚠️  User ${user.phoneNumber} already has pending question - race condition prevented duplicate`);
          return;
        }
        
        // Now safe to send SMS - pending answer already created atomically
        await storage.incrementQuestionUsage(question.id);
        
        const questionNumber = user.questionsAnswered + 1;
        await twilioService.sendDailyQuestion(
          user.phoneNumber,
          question,
          questionNumber
        );
        
        // Update user's lastQuizDate to prevent duplicate questions in same day
        await storage.updateUser(user.id, {
          lastQuizDate: new Date()
        });
        
        console.log(`✅ Sent daily question #${questionNumber} to user ${user.id} (race condition protected)`);
      } else {
        console.log('❌ No question available to send');
      }
    } catch (error) {
      console.error('Error in sendQuestionToUser:', error);
      console.log(`❌ Skipping question send to user ${user.id} due to error to prevent duplicates`);
    }
  }

  // Method to manually trigger question sending (for testing)
  async sendQuestionNow(phoneNumber: string) {
    const user = await storage.getUserByPhoneNumber(phoneNumber);
    if (user) {
      await this.sendQuestionToUser(user);
    }
  }
}

export const schedulerService = new SchedulerService();
