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
      
      // This is a simplified version - in production you'd want to handle timezones properly
      const currentHour = new Date().getHours().toString().padStart(2, '0') + ':00';
      
      // Get all active users who should receive questions at this time
      // Note: This would need to be implemented with proper timezone handling
      const users = await this.getUsersForScheduledTime(currentHour);
      
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

  private async getUsersForScheduledTime(time: string) {
    // This is a simplified implementation
    // In production, you'd query the database for users with matching preferred times
    // accounting for their timezones
    return [];
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
