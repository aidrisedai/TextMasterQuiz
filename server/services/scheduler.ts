import cron from 'node-cron';
import { storage } from '../storage';
import { twilioService } from './twilio';
import { geminiService } from './gemini';

export class SchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

  init() {
    // Run every hour to check for users who need questions
    cron.schedule('0 * * * *', async () => {
      await this.sendDailyQuestions();
    });
    
    // For testing: run every 5 minutes to test the system
    cron.schedule('*/5 * * * *', async () => {
      console.log('🧪 Testing scheduler - checking for users needing questions...');
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
      console.log(`Checking for users at ${currentTime.toISOString()}`);
      
      // Get all active users
      const allUsers = await storage.getAllUsers();
      const activeUsers = allUsers.filter(user => user.isActive);
      
      const usersToSend = [];
      
      for (const user of activeUsers) {
        try {
          // Parse user's preferred time (format: "HH:MM" like "21:00")
          const [hours, minutes] = user.preferredTime.split(':').map(Number);
          
          // Get current time in user's timezone
          const userTimezone = user.timezone || 'America/Los_Angeles';
          const userCurrentTime = new Date(currentTime.toLocaleString("en-US", { timeZone: userTimezone }));
          
          // Check if current time matches user's preferred time (within current hour)
          if (userCurrentTime.getHours() === hours) {
            // Check if user hasn't received a question today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const userToday = new Date(userCurrentTime);
            userToday.setHours(0, 0, 0, 0);
            
            if (!user.lastQuizDate || new Date(user.lastQuizDate) < userToday) {
              // For testing, only include our test phone number
              if (user.phoneNumber === '+15153570454') {
                console.log(`✅ User ${user.phoneNumber} needs daily question (${user.preferredTime} in ${userTimezone})`);
                usersToSend.push(user);
              } else {
                console.log(`🔕 Skipping user ${user.phoneNumber} (testing mode - only sending to +15153570454)`);
              }
            } else {
              console.log(`⏭️  User ${user.phoneNumber} already received today's question`);
            }
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

  private async sendQuestionToUser(user: any) {
    try {
      console.log(`📤 Sending daily question to user ${user.id} (${user.phoneNumber})`);
      
      // Get questions this user has already answered
      const userAnswers = await storage.getUserAnswers(user.id, 1000);
      const answeredQuestionIds = userAnswers.map(answer => answer.questionId);
      
      // Select categories based on user preferences
      const categories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      
      console.log(`🎯 Using categories: ${categories.join(', ')}`);
      
      // Try to get a question from database that user hasn't answered
      let question = await storage.getRandomQuestion(categories, answeredQuestionIds);
      
      if (!question) {
        console.log('🤖 No unused questions found, generating new question with AI...');
        
        // Get recent questions to avoid duplicates (limited to prevent token overflow)
        const allQuestions = await storage.getAllQuestions();
        const recentQuestions = allQuestions
          .sort((a, b) => b.id - a.id)
          .slice(0, 10)
          .map(q => q.questionText);
        
        // Generate a new question using AI with duplicate prevention
        const category = categories[Math.floor(Math.random() * categories.length)];
        const generated = await geminiService.generateQuestion(category, 'medium', recentQuestions);
        
        if (generated) {
          question = await storage.createQuestion(generated);
          console.log(`✨ Generated new ${category} question: ${question.questionText.substring(0, 50)}...`);
        }
      } else {
        console.log(`📚 Using existing question: ${question.questionText.substring(0, 50)}...`);
      }

      if (question) {
        await storage.incrementQuestionUsage(question.id);
        
        const questionNumber = user.questionsAnswered + 1;
        await twilioService.sendDailyQuestion(
          user.phoneNumber,
          question,
          questionNumber
        );
        
        // Update user's last quiz date
        await storage.updateUser(user.id, { lastQuizDate: new Date().toISOString() });
        
        console.log(`✅ Sent daily question #${questionNumber} to user ${user.id}`);
      } else {
        console.log('❌ No question available to send');
      }
    } catch (error) {
      console.error('Error in sendQuestionToUser:', error);
      
      // Fallback: send a simple test question via SMS
      const fallbackMessage = {
        to: user.phoneNumber,
        body: `🧠 Daily Question: What is the largest planet in our solar system?\n\nA) Earth\nB) Jupiter\nC) Saturn\nD) Mars\n\nReply with A, B, C, or D`
      };
      
      await twilioService.sendSMS(fallbackMessage);
      console.log(`📨 Sent fallback question to user ${user.id}`);
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
