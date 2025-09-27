import { users, questions, userAnswers, adminUsers, generationJobs, broadcasts, broadcastDeliveries, deliveryQueue, type User, type InsertUser, type Question, type InsertQuestion, type UserAnswer, type InsertUserAnswer, type AdminUser, type InsertAdminUser, type GenerationJob, type InsertGenerationJob, type Broadcast, type InsertBroadcast, type BroadcastDelivery, type InsertBroadcastDelivery, type DeliveryQueue, type InsertDeliveryQueue } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lt, isNull, lte, inArray, notInArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Question methods
  getRandomQuestion(categories?: string[], excludeIds?: number[]): Promise<Question | undefined>;
  getAllQuestions(): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  incrementQuestionUsage(id: number): Promise<void>;
  
  // Answer methods
  recordAnswer(answer: InsertUserAnswer): Promise<UserAnswer>;
  updateAnswer(answerId: number, updates: Partial<UserAnswer>): Promise<UserAnswer | undefined>;
  getUserAnswers(userId: number, limit?: number): Promise<(UserAnswer & { question: Question })[]>;
  
  // Stats methods
  getUserStats(userId: number): Promise<{
    currentStreak: number;
    totalScore: number;
    questionsAnswered: number;
    accuracyRate: number;
  }>;
  
  // Admin methods
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  createAdmin(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminLastLogin(id: number): Promise<void>;
  
  // Duplicate prevention methods
  getPendingAnswersCount(userId: number): Promise<number>;
  createPendingAnswerIfNone(userId: number, questionId: number): Promise<boolean>;
  cleanupOrphanedPendingAnswers(): Promise<number>;
  
  // Generation queue methods
  createGenerationJob(job: InsertGenerationJob): Promise<GenerationJob>;
  getGenerationJobs(): Promise<GenerationJob[]>;
  getNextPendingJob(): Promise<GenerationJob | undefined>;
  updateGenerationJob(id: number, updates: Partial<GenerationJob>): Promise<GenerationJob | undefined>;
  deleteGenerationJob(id: number): Promise<void>;
  getActiveGenerationJobs(): Promise<GenerationJob[]>;
  
  // Broadcast methods
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  getBroadcast(id: number): Promise<Broadcast | undefined>;
  getAllBroadcasts(): Promise<Broadcast[]>;
  updateBroadcast(id: number, updates: Partial<Broadcast>): Promise<Broadcast | undefined>;
  getBroadcastEligibleUsers(): Promise<User[]>;
  createBroadcastDelivery(delivery: InsertBroadcastDelivery): Promise<BroadcastDelivery>;
  updateBroadcastDelivery(id: number, updates: Partial<BroadcastDelivery>): Promise<BroadcastDelivery | undefined>;
  getBroadcastDeliveries(broadcastId: number): Promise<(BroadcastDelivery & { user: User })[]>;
  
  // Delivery Queue methods
  populateDeliveryQueue(date: Date): Promise<number>;
  getDeliveriesToSend(currentTime: Date): Promise<DeliveryQueue[]>;
  markDeliveryAsSent(id: number, questionId: number): Promise<void>;
  markDeliveryAsFailed(id: number, error: string): Promise<void>;
  getTodayDeliveryStatus(): Promise<DeliveryQueue[]>;
  
  // Hourly Scheduler methods
  getAllActiveUsers(): Promise<User[]>;
  createDeliveryQueueEntry(entry: InsertDeliveryQueue): Promise<DeliveryQueue>;
  convertToUTC(localDateStr: string, timezone: string): Date;
  getQuestionsForCategory(category: string, limit?: number): Promise<Question[]>;
  getUserAnsweredQuestionIds(userId: number): Promise<number[]>;
  clearPendingDeliveriesForDate(date: Date): Promise<void>;
  getDeliveriesForHour(hour: number): Promise<DeliveryQueue[]>;
  
  // Connection testing
  testConnection(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getRandomQuestion(categories?: string[], excludeIds?: number[]): Promise<Question | undefined> {
    // FIXED: Simpler approach - build conditions array and apply in one query
    const conditions = [];
    
    // Filter by categories if provided
    if (categories && categories.length > 0) {
      conditions.push(inArray(questions.category, categories));
    }
    
    // Exclude questions the user has already answered
    if (excludeIds && excludeIds.length > 0) {
      conditions.push(notInArray(questions.id, excludeIds));
    }
    
    // Build the complete query with all conditions
    const candidateQuestions = conditions.length > 0 
      ? await db.select()
          .from(questions)
          .where(and(...conditions))
          .orderBy(questions.usageCount, sql`RANDOM()`)
          .limit(10)
      : await db.select()
          .from(questions)
          .orderBy(questions.usageCount, sql`RANDOM()`)
          .limit(10);
    
    if (candidateQuestions.length === 0) return undefined;
    
    // Pick randomly from the limited result set
    const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
    return candidateQuestions[randomIndex];
  }

  async getAllQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(insertQuestion)
      .returning();
    return question;
  }

  async incrementQuestionUsage(id: number): Promise<void> {
    await db
      .update(questions)
      .set({ usageCount: sql`${questions.usageCount} + 1` })
      .where(eq(questions.id, id));
  }

  async recordAnswer(insertAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const [answer] = await db
      .insert(userAnswers)
      .values(insertAnswer)
      .returning();
    
    // Only update user stats if this is a completed answer (not a pending one)
    if (insertAnswer.userAnswer) {
      const user = await this.getUser(insertAnswer.userId);
      if (user) {
        const newQuestionsAnswered = user.questionsAnswered + 1;
        const newCorrectAnswers = user.correctAnswers + (insertAnswer.isCorrect ? 1 : 0);
        const newTotalScore = user.totalScore + (insertAnswer.pointsEarned || 0);
        
        // Calculate streak
        let newStreak = user.currentStreak;
        if (insertAnswer.isCorrect) {
          newStreak += 1;
        } else {
          newStreak = 0;
        }
        
        await this.updateUser(insertAnswer.userId, {
          questionsAnswered: newQuestionsAnswered,
          correctAnswers: newCorrectAnswers,
          totalScore: newTotalScore,
          currentStreak: newStreak,
          lastQuizDate: new Date(),
          lastAnswer: insertAnswer.userAnswer,
        });
      }
    }
    
    return answer;
  }

  async updateAnswer(answerId: number, updates: Partial<UserAnswer>): Promise<UserAnswer | undefined> {
    const [answer] = await db
      .update(userAnswers)
      .set(updates)
      .where(eq(userAnswers.id, answerId))
      .returning();
    
    // Update user stats if this is completing an answer
    if (answer && updates.userAnswer) {
      const user = await this.getUser(answer.userId);
      if (user) {
        const newQuestionsAnswered = user.questionsAnswered + 1;
        const newCorrectAnswers = user.correctAnswers + (answer.isCorrect ? 1 : 0);
        const newTotalScore = user.totalScore + (answer.pointsEarned || 0);
        
        // Calculate streak
        let newStreak = user.currentStreak;
        if (answer.isCorrect) {
          newStreak += 1;
        } else {
          newStreak = 0;
        }
        
        await this.updateUser(answer.userId, {
          questionsAnswered: newQuestionsAnswered,
          correctAnswers: newCorrectAnswers,
          totalScore: newTotalScore,
          currentStreak: newStreak,
          lastQuizDate: new Date(),
          lastAnswer: answer.userAnswer,
        });
      }
    }
    
    return answer;
  }

  async getUserAnswers(userId: number, limit = 10): Promise<(UserAnswer & { question: Question })[]> {
    const results = await db
      .select({
        id: userAnswers.id,
        userId: userAnswers.userId,
        questionId: userAnswers.questionId,
        userAnswer: userAnswers.userAnswer,
        isCorrect: userAnswers.isCorrect,
        answeredAt: userAnswers.answeredAt,
        pointsEarned: userAnswers.pointsEarned,
        question: questions,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.questionId, questions.id))
      .where(eq(userAnswers.userId, userId))
      .orderBy(desc(userAnswers.answeredAt))
      .limit(limit);
    
    return results.filter(result => result.question !== null) as (UserAnswer & { question: Question })[];
  }

  async getUserStats(userId: number): Promise<{
    currentStreak: number;
    totalScore: number;
    questionsAnswered: number;
    accuracyRate: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return {
        currentStreak: 0,
        totalScore: 0,
        questionsAnswered: 0,
        accuracyRate: 0,
      };
    }
    
    const accuracyRate = user.questionsAnswered > 0 
      ? Math.round((user.correctAnswers / user.questionsAnswered) * 100)
      : 0;
    
    return {
      currentStreak: user.currentStreak,
      totalScore: user.totalScore,
      questionsAnswered: user.questionsAnswered,
      accuracyRate,
    };
  }

  async getPendingAnswersCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userAnswers)
      .where(
        and(
          eq(userAnswers.userId, userId),
          isNull(userAnswers.userAnswer)
        )
      );
    
    return result[0]?.count || 0;
  }

  // Atomic method to check and create pending answer - prevents race conditions
  async createPendingAnswerIfNone(userId: number, questionId: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // Check for existing pending answers within transaction
        const existing = await tx.select({ count: sql<number>`count(*)` })
          .from(userAnswers)
          .where(and(
            eq(userAnswers.userId, userId),
            isNull(userAnswers.userAnswer)
          ));
        
        if (existing[0].count > 0) {
          return false; // Already has pending answer
        }
        
        // Atomically create pending answer
        await tx.insert(userAnswers).values({
          userId,
          questionId,
          userAnswer: null,
          isCorrect: false,
          pointsEarned: 0,
        });
        
        return true; // Successfully created
      });
    } catch (error) {
      console.error('Error creating pending answer:', error);
      return false;
    }
  }

  // Cleanup orphaned pending answers (for SMS failures)
  async cleanupOrphanedPendingAnswers(): Promise<number> {
    try {
      const result = await db.delete(userAnswers)
        .where(and(
          isNull(userAnswers.userAnswer),
          sql`${userAnswers.answeredAt} < NOW() - INTERVAL '24 hours'`
        ));
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up orphaned pending answers:', error);
      return 0;
    }
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db
      .insert(adminUsers)
      .values(insertAdmin)
      .returning();
    return admin;
  }

  async updateAdminLastLogin(id: number): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, id));
  }

  // Generation queue methods
  async createGenerationJob(insertJob: InsertGenerationJob): Promise<GenerationJob> {
    const [job] = await db
      .insert(generationJobs)
      .values({
        ...insertJob,
        total: insertJob.questionCount, // Set total to the requested count
      })
      .returning();
    return job;
  }

  async getGenerationJobs(): Promise<GenerationJob[]> {
    return await db
      .select()
      .from(generationJobs)
      .orderBy(desc(generationJobs.createdAt));
  }

  async getNextPendingJob(): Promise<GenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.status, "pending"))
      .orderBy(generationJobs.createdAt)
      .limit(1);
    return job || undefined;
  }

  async updateGenerationJob(id: number, updates: Partial<GenerationJob>): Promise<GenerationJob | undefined> {
    const [job] = await db
      .update(generationJobs)
      .set(updates)
      .where(eq(generationJobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteGenerationJob(id: number): Promise<void> {
    await db
      .delete(generationJobs)
      .where(eq(generationJobs.id, id));
  }

  async getActiveGenerationJobs(): Promise<GenerationJob[]> {
    return await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.status, "active"));
  }

  // Broadcast methods
  async createBroadcast(insertBroadcast: InsertBroadcast): Promise<Broadcast> {
    const [broadcast] = await db
      .insert(broadcasts)
      .values(insertBroadcast)
      .returning();
    return broadcast;
  }

  async getBroadcast(id: number): Promise<Broadcast | undefined> {
    const [broadcast] = await db.select().from(broadcasts).where(eq(broadcasts.id, id));
    return broadcast || undefined;
  }

  async getAllBroadcasts(): Promise<Broadcast[]> {
    return await db
      .select()
      .from(broadcasts)
      .orderBy(desc(broadcasts.createdAt));
  }

  async updateBroadcast(id: number, updates: Partial<Broadcast>): Promise<Broadcast | undefined> {
    const [broadcast] = await db
      .update(broadcasts)
      .set(updates)
      .where(eq(broadcasts.id, id))
      .returning();
    return broadcast || undefined;
  }

  async getBroadcastEligibleUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.acceptsBroadcasts, true)
      ));
  }

  async createBroadcastDelivery(insertDelivery: InsertBroadcastDelivery): Promise<BroadcastDelivery> {
    const [delivery] = await db
      .insert(broadcastDeliveries)
      .values(insertDelivery)
      .returning();
    return delivery;
  }

  async updateBroadcastDelivery(id: number, updates: Partial<BroadcastDelivery>): Promise<BroadcastDelivery | undefined> {
    const [delivery] = await db
      .update(broadcastDeliveries)
      .set(updates)
      .where(eq(broadcastDeliveries.id, id))
      .returning();
    return delivery || undefined;
  }

  async getBroadcastDeliveries(broadcastId: number): Promise<(BroadcastDelivery & { user: User })[]> {
    return await db
      .select({
        id: broadcastDeliveries.id,
        broadcastId: broadcastDeliveries.broadcastId,
        userId: broadcastDeliveries.userId,
        status: broadcastDeliveries.status,
        sentAt: broadcastDeliveries.sentAt,
        errorMessage: broadcastDeliveries.errorMessage,
        user: users
      })
      .from(broadcastDeliveries)
      .innerJoin(users, eq(broadcastDeliveries.userId, users.id))
      .where(eq(broadcastDeliveries.broadcastId, broadcastId))
      .orderBy(broadcastDeliveries.id);
  }

  // Delivery Queue Implementation
  async populateDeliveryQueue(date: Date): Promise<number> {
    console.log(`📅 Populating delivery queue for ${date.toISOString()}`);
    
    // Get all active users
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true));
    
    let count = 0;
    
    for (const user of activeUsers) {
      try {
        // Parse preferred time (e.g., "21:00")
        const [hours, minutes] = user.preferredTime.split(':').map(Number);
        
        // Build the date-time string in ISO format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(hours).padStart(2, '0');
        const minute = String(minutes).padStart(2, '0');
        
        const localDateStr = `${year}-${month}-${day}T${hour}:${minute}:00`;
        
        // Use a reliable library-free approach for timezone conversion
        // This creates a date string that JavaScript will interpret in the user's timezone
        const utcTimestamp = this.localTimeToUTC(localDateStr, user.timezone);
        
        // Check if entry already exists for this user and date range
        const dayStart = new Date(date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1); // Cover next day for late night deliveries
        dayEnd.setUTCHours(0, 0, 0, 0);
        
        const existing = await db
          .select()
          .from(deliveryQueue)
          .where(and(
            eq(deliveryQueue.userId, user.id),
            gte(deliveryQueue.scheduledFor, dayStart),
            lt(deliveryQueue.scheduledFor, dayEnd)
          ));
        
        if (existing.length === 0) {
          // Pre-select question for this user to avoid selection during delivery
          const questionId = await this.preSelectQuestionForUser(user);
          
          await db.insert(deliveryQueue).values({
            userId: user.id,
            scheduledFor: utcTimestamp,
            status: 'pending',
            attempts: 0,
            questionId: questionId
          });
          count++;
          console.log(`✅ Scheduled ${user.phoneNumber} for ${utcTimestamp.toISOString()} (${user.preferredTime} ${user.timezone}) with question ${questionId || 'none'}`);
        }
      } catch (error) {
        console.error(`Failed to schedule user ${user.id}:`, error);
      }
    }
    
    return count;
  }
  
  private localTimeToUTC(localDateStr: string, timezone: string): Date {
    // Convert local time to UTC using a much simpler, reliable approach
    // The input localDateStr is like "2025-08-24T21:00:00"
    
    // Parse the input date/time
    const [datePart, timePart] = localDateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Use the standard approach: create a Date in the target timezone
    // then get its UTC equivalent
    try {
      // Create a date string that will be interpreted in the target timezone
      const tempDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000`;
      
      // Create a temp date to get the timezone offset for this specific date/time
      const tempDate = new Date(tempDateStr);
      
      // Get timezone offset in minutes for this specific date (handles DST automatically)
      const offsetStr = tempDate.toLocaleString('sv-SE', { timeZone: timezone, timeZoneName: 'longOffset' });
      const offsetMatch = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
      
      if (!offsetMatch) {
        // Fallback: use a simpler method
        const utcDate = new Date(`${tempDateStr}Z`); // Parse as UTC first
        const localCheck = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        const offset = utcDate.getTime() - localCheck.getTime();
        return new Date(utcDate.getTime() + offset);
      }
      
      const [, sign, offsetHours, offsetMinutes] = offsetMatch;
      const totalOffsetMinutes = (parseInt(offsetHours) * 60 + parseInt(offsetMinutes)) * (sign === '+' ? 1 : -1);
      
      // Create UTC time by subtracting the offset
      const utcTime = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      utcTime.setMinutes(utcTime.getMinutes() - totalOffsetMinutes);
      
      return utcTime;
      
    } catch (error) {
      console.error(`Timezone conversion error for ${localDateStr} ${timezone}:`, error);
      // Fallback: assume UTC (better than crashing)
      return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    }
  }

  async getDeliveriesToSend(currentTime: Date): Promise<DeliveryQueue[]> {
    // PRECISION SCHEDULING: Get deliveries for exact time window
    const windowEnd = new Date(currentTime);
    windowEnd.setMinutes(windowEnd.getMinutes() + 5); // 5 minute window
    
    return await db
      .select()
      .from(deliveryQueue)
      .where(and(
        eq(deliveryQueue.status, 'pending'),
        lte(deliveryQueue.scheduledFor, windowEnd),
        eq(deliveryQueue.attempts, 0) // SINGLE-ATTEMPT: Only process never-attempted deliveries
      ))
      .orderBy(deliveryQueue.scheduledFor);
  }

  async markDeliveryAsSent(id: number, questionId: number): Promise<void> {
    await db
      .update(deliveryQueue)
      .set({
        status: 'sent',
        sentAt: new Date(),
        questionId: questionId
      })
      .where(eq(deliveryQueue.id, id));
  }

  async markDeliveryAsFailed(id: number, error: string): Promise<void> {
    // SINGLE-ATTEMPT: Always mark as failed, no retries
    await db
      .update(deliveryQueue)
      .set({
        status: 'failed',
        attempts: 1,
        errorMessage: error
      })
      .where(eq(deliveryQueue.id, id));
  }

  async getTodayDeliveryStatus(): Promise<DeliveryQueue[]> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);  // Use UTC hours, not local time!
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);  // Use UTC date methods
    
    return await db
      .select()
      .from(deliveryQueue)
      .where(and(
        gte(deliveryQueue.scheduledFor, today),
        lt(deliveryQueue.scheduledFor, tomorrow)
      ))
      .orderBy(deliveryQueue.scheduledFor);
  }

  async getQuestion(questionId: number): Promise<Question | null> {
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    
    return result[0] || null;
  }

  async preSelectQuestionForUser(user: any): Promise<number | null> {
    try {
      // Get user's answered questions
      const userAnswers = await this.getUserAnswers(user.id, 1000);
      const answeredQuestionIds = userAnswers.map(answer => answer.questionId);
      
      // Select category (rotate through user preferences)
      const userCategories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      const categoryIndex = user.questionsAnswered % userCategories.length;
      const todayCategory = userCategories[categoryIndex];
      
      // Try to get existing question from preferred category
      let question = await this.getRandomQuestion([todayCategory], answeredQuestionIds);
      
      if (!question) {
        console.log(`⚠️ No unused questions found for category ${todayCategory} for user ${user.phoneNumber}, using fallback`);
        // Use existing questions from any of user's categories as fallback
        question = await this.getRandomQuestion(userCategories, answeredQuestionIds);
        if (!question) {
          // Last resort: use any question from database 
          question = await this.getRandomQuestion([], []);
        }
      }
      
      if (question) {
        console.log(`🎯 Pre-selected ${todayCategory} question for ${user.phoneNumber}: ${question.questionText.substring(0, 50)}...`);
        return question.id;
      }
      
      console.warn(`❌ No questions available for user ${user.phoneNumber}`);
      return null;
    } catch (error) {
      console.error(`Error pre-selecting question for user ${user.phoneNumber}:`, error);
      return null;
    }
  }

  // Hourly Scheduler methods implementation
  async getAllActiveUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isActive, true));
  }

  async createDeliveryQueueEntry(entry: InsertDeliveryQueue): Promise<DeliveryQueue> {
    const [delivery] = await db
      .insert(deliveryQueue)
      .values(entry)
      .returning();
    return delivery;
  }

  convertToUTC(localDateStr: string, timezone: string): Date {
    // PROPER timezone conversion - convert local time in user's timezone to UTC
    try {
      // Parse the input date string "2025-09-08 21:00:00"
      const [datePart, timePart] = localDateStr.split(' ');
      
      // Create ISO string in user's timezone
      const isoString = `${datePart}T${timePart}`;
      
      // Method 1: Use temporal-polyfill approach (simple and reliable)
      // Create date as if it's in the specified timezone, then adjust to UTC
      const testDate = new Date(`${isoString}Z`); // Parse as UTC first
      
      // Get what this time would be in the user's timezone
      const timeInUserZone = new Date(testDate.toLocaleString("en-US", { timeZone: timezone }));
      const timeInUTC = new Date(testDate.toLocaleString("en-US", { timeZone: "UTC" }));
      
      // Calculate the offset difference
      const offset = timeInUTC.getTime() - timeInUserZone.getTime();
      
      // Apply offset to get correct UTC time
      const correctUTC = new Date(testDate.getTime() + offset);
      
      console.log(`🕘 Timezone conversion: ${localDateStr} ${timezone} → ${correctUTC.toISOString()}`);
      return correctUTC;
      
    } catch (error) {
      console.error(`Timezone conversion error for ${localDateStr} ${timezone}:`, error);
      
      // Fallback: Use a simpler approach with manual offset calculation
      try {
        // For common US timezones, use known offsets (simplified)
        const timezoneOffsets: { [key: string]: number } = {
          'America/Los_Angeles': 8, // PST is UTC-8, PDT is UTC-7 (use average)
          'America/Denver': 7,      // MST is UTC-7, MDT is UTC-6
          'America/Chicago': 6,     // CST is UTC-6, CDT is UTC-5  
          'America/New_York': 5,    // EST is UTC-5, EDT is UTC-4
          'Europe/London': 0,       // GMT is UTC+0, BST is UTC+1
          'UTC': 0
        };
        
        const offsetHours = timezoneOffsets[timezone] || 0;
        
        const [datePart, timePart] = localDateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        
        // Create UTC date with offset applied
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute, second));
        
        console.log(`🕘 Fallback timezone conversion: ${localDateStr} ${timezone} → ${utcDate.toISOString()}`);
        return utcDate;
        
      } catch (fallbackError) {
        console.error('Fallback timezone conversion failed:', fallbackError);
        
        // Last resort: treat as UTC (old broken behavior)
        const [datePart, timePart] = localDateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      }
    }
  }

  async getQuestionsForCategory(category: string, limit = 20): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.category, category))
      .orderBy(questions.usageCount, sql`RANDOM()`)
      .limit(limit);
  }

  async getUserAnsweredQuestionIds(userId: number): Promise<number[]> {
    const results = await db
      .select({ questionId: userAnswers.questionId })
      .from(userAnswers)
      .where(eq(userAnswers.userId, userId));
    return results.map(r => r.questionId);
  }

  async clearPendingDeliveriesForDate(date: Date): Promise<void> {
    const dateStart = new Date(date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setUTCHours(23, 59, 59, 999);

    await db
      .delete(deliveryQueue)
      .where(and(
        gte(deliveryQueue.scheduledFor, dateStart),
        lt(deliveryQueue.scheduledFor, dateEnd),
        eq(deliveryQueue.status, 'pending')
      ));
  }

  async getDeliveriesForHour(hour: number): Promise<DeliveryQueue[]> {
    const now = new Date();
    const startHour = new Date(now);
    startHour.setUTCHours(hour, 0, 0, 0);
    const endHour = new Date(now);
    endHour.setUTCHours(hour, 59, 59, 999);

    return await db
      .select()
      .from(deliveryQueue)
      .where(and(
        eq(deliveryQueue.status, 'pending'),
        gte(deliveryQueue.scheduledFor, startHour),
        lte(deliveryQueue.scheduledFor, endHour),
        eq(deliveryQueue.attempts, 0) // Single attempt
      ))
      .orderBy(deliveryQueue.scheduledFor);
  }

  async testConnection(retries = 3, delay = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Database connection attempt ${attempt}/${retries}...`);
        
        // Test both pool connection and simple query
        const { pool } = await import('./db.js');
        const client = await pool.connect();
        
        try {
          const result = await client.query('SELECT 1 as test, NOW() as timestamp');
          console.log('✅ Database connection test passed');
          console.log(`🕰️ Database time: ${result.rows[0].timestamp}`);
          
          // Check if schema exists and initialize if needed
          await this.ensureSchemaExists(client);
          
          return; // Success, exit the function
        } finally {
          client.release(); // Always release the client back to the pool
        }
        
      } catch (error) {
        console.error(`❌ Database connection attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
        
        if (attempt === retries) {
          console.error('❌ All database connection attempts failed');
          console.error('💡 Please check your DATABASE_URL format:');
          console.error('💡 Should be: postgresql://user:pass@host:port/database');
          console.error('💡 Make sure you\'re using the INTERNAL database URL from Render');
          console.error('💡 Verify SSL configuration and network connectivity');
          throw error;
        }
        
        console.log(`⏱️  Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }

  async ensureSchemaExists(client: any): Promise<void> {
    try {
      console.log('🔍 Checking if database schema exists...');
      
      // Check if admin_users table exists (one of the core tables)
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_users'
        );
      `);
      
      const schemaExists = result.rows[0].exists;
      
      if (!schemaExists) {
        console.log('⚠️  Database schema not found. Initializing schema...');
        
        try {
          // Use drizzle-kit to push schema
          const { execSync } = await import('child_process');
          
          console.log('📋 Running drizzle-kit push...');
          execSync('npx drizzle-kit push --force', { 
            stdio: 'inherit',
            cwd: process.cwd(),
            env: { ...process.env }
          });
          
          console.log('✅ Database schema initialized successfully!');
          
        } catch (error) {
          console.error('❌ Failed to initialize database schema:', error);
          throw new Error('Database schema initialization failed. Please run "npm run db:push" manually.');
        }
      } else {
        console.log('✅ Database schema exists');
      }
      
    } catch (error) {
      console.error('❌ Error checking database schema:', error);
      // Don't throw here - let the app continue and fail gracefully if tables don't exist
    }
  }
}

export const storage = new DatabaseStorage();
