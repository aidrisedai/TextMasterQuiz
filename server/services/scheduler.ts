import cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { openaiService } from './openai';

export class SchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

  init() {
    // Run every hour to check for users who need questions
    cron.schedule('0 * * * *', async () => {
      await this.sendDailyQuestions();
    });

    console.log('Scheduler service initialized');
  }

  private async sendDailyQuestions() {
    try {
      console.log('Checking for users who need daily questions...');
      
      // Get current time in different timezones and find matching users
      const now = new Date();
      const users = await this.getUsersForCurrentTime(now);
      
      for (const user of users) {
        try {
          await this.sendQuestionToUser(user);
        } catch (error) {
          console.error(`Failed to send question to user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in sendDailyQuestions:', error);
    }
  }

  private async getUsersForCurrentTime(currentTime: Date) {
    try {
      // This would need to be implemented with proper database queries
      // For now, return empty array but the structure is ready for timezone handling
      
      // The logic would be:
      // 1. For each timezone, calculate what time it is now
      // 2. Find users whose preferredTime matches the current time in their timezone
      // 3. Check if they haven't received a question today
      
      console.log(`Checking for users at ${currentTime.toISOString()}`);
      return [];
    } catch (error) {
      console.error('Error getting users for current time:', error);
      return [];
    }
  }

  private async sendQuestionToUser(user: any) {
    // Check if user already received today's question
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastQuizDate && new Date(user.lastQuizDate) >= today) {
      return; // Already sent today
    }

    // Get user's preferred categories
    const categories = user.categoryPreferences?.length > 0 
      ? user.categoryPreferences 
      : ['general'];

    // Generate or get a question
    let question = await storage.getRandomQuestion(categories);
    
    if (!question) {
      // Generate a new question using AI
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const generated = await openaiService.generateQuestion(randomCategory);
      
      if (generated) {
        question = await storage.createQuestion(generated);
      }
    }

    if (question) {
      await storage.incrementQuestionUsage(question.id);
      
      const questionNumber = user.questionsAnswered + 1;
      await twilioService.sendDailyQuestion(
        user.phoneNumber,
        question,
        questionNumber
      );
      
      console.log(`Sent daily question to user ${user.id}`);
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
