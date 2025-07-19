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
    
    // For testing: run every 5 minutes to test the system (disabled in production)
    // cron.schedule('*/5 * * * *', async () => {
    //   console.log('🧪 Testing scheduler - checking for users needing questions...');
    //   await this.sendDailyQuestions();
    // });

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
          
          // Create a proper Date object for user's timezone
          const userCurrentTime = new Date(currentTime.toLocaleString("en-US", { timeZone: userTimezone }));
          const currentHour = userCurrentTime.getHours();
          
          console.log(`🕐 User ${user.phoneNumber}: Current hour in ${userTimezone} is ${currentHour}, preferred hour is ${hours}`);
          
          // Check if current time matches user's preferred time (within current hour)
          if (currentHour === hours) {
            // Check if user hasn't received a question today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const userToday = new Date(userCurrentTime);
            userToday.setHours(0, 0, 0, 0);
            
            // Check if user joined today (same day) - if so, skip because they got welcome question
            const joinDate = new Date(user.joinDate);
            joinDate.setHours(0, 0, 0, 0);
            const isNewUserToday = joinDate.getTime() === userToday.getTime();
            
            if (isNewUserToday) {
              console.log(`🎯 User ${user.phoneNumber} joined today and already received welcome question. Next question tomorrow.`);
            } else if (!user.lastQuizDate || new Date(user.lastQuizDate) < userToday) {
              console.log(`✅ User ${user.phoneNumber} needs daily question (${user.preferredTime} in ${userTimezone})`);
              usersToSend.push(user);
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
      
      // CRITICAL: Check for pending answers first to prevent duplicate questions
      // Use a more robust check by directly querying the database
      const pendingAnswersCount = await storage.getPendingAnswersCount(user.id);
      
      if (pendingAnswersCount > 0) {
        console.log(`⚠️  User ${user.phoneNumber} already has ${pendingAnswersCount} pending answer(s). Skipping question send.`);
        return;
      }
      
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
        console.log('🤖 No unused questions found, generating new question with AI...');
        
        // Get recent questions to avoid duplicates (limited to prevent token overflow)
        const allQuestions = await storage.getAllQuestions();
        const recentQuestions = allQuestions
          .sort((a, b) => b.id - a.id)
          .slice(0, 10)
          .map(q => q.questionText);
        
        // Generate a new question using AI with duplicate prevention for TODAY'S category only
        const generated = await geminiService.generateQuestion(todayCategory, 'medium', recentQuestions);
        
        if (generated) {
          question = await storage.createQuestion(generated);
          console.log(`✨ Generated new ${todayCategory} question: ${question.questionText.substring(0, 50)}...`);
        }
      } else {
        console.log(`📚 Using existing ${todayCategory} question: ${question.questionText.substring(0, 50)}...`);
      }

      if (question) {
        await storage.incrementQuestionUsage(question.id);
        
        const questionNumber = user.questionsAnswered + 1;
        await twilioService.sendDailyQuestion(
          user.phoneNumber,
          question,
          questionNumber
        );
        
        // Create a pending answer record so we can track which question was sent
        await storage.recordAnswer({
          userId: user.id,
          questionId: question.id,
          userAnswer: null, // Will be filled when user responds
          isCorrect: false, // Will be updated when user responds
          pointsEarned: 0, // Will be updated when user responds
        });
        
        // Update user's lastQuizDate to prevent duplicate questions in same day
        await storage.updateUser(user.id, {
          lastQuizDate: new Date()
        });
        
        console.log(`✅ Sent daily question #${questionNumber} to user ${user.id} and created pending answer record`);
      } else {
        console.log('❌ No question available to send');
      }
    } catch (error) {
      console.error('Error in sendQuestionToUser:', error);
      
      // REMOVED: Fallback mechanism to prevent duplicate questions
      // Instead, log the error and skip sending to avoid duplicates
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
