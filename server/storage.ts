import { users, questions, userAnswers, adminUsers, generationJobs, broadcasts, broadcastDeliveries, deliveryQueue, type User, type InsertUser, type Question, type InsertQuestion, type UserAnswer, type InsertUserAnswer, type AdminUser, type InsertAdminUser, type GenerationJob, type InsertGenerationJob, type Broadcast, type InsertBroadcast, type BroadcastDelivery, type InsertBroadcastDelivery, type DeliveryQueue, type InsertDeliveryQueue } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lt, isNull, lte } from "drizzle-orm";

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
    // Get all questions first, then filter in memory for now
    const allQuestions = await db.select().from(questions);
    
    let filteredQuestions = allQuestions;
    
    // Filter by categories if provided
    if (categories && categories.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        categories.includes(q.category)
      );
    }
    
    // Exclude questions the user has already answered
    if (excludeIds && excludeIds.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        !excludeIds.includes(q.id)
      );
    }
    
    if (filteredQuestions.length === 0) return undefined;
    
    // Sort by usage count (ascending) to prefer less-used questions
    filteredQuestions.sort((a, b) => a.usageCount - b.usageCount);
    
    // Take the 10 least used questions and pick randomly from them
    const leastUsed = filteredQuestions.slice(0, Math.min(10, filteredQuestions.length));
    const randomIndex = Math.floor(Math.random() * leastUsed.length);
    
    return leastUsed[randomIndex];
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
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 2); // Cover next day for late night deliveries
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
          await db.insert(deliveryQueue).values({
            userId: user.id,
            scheduledFor: utcTimestamp,
            status: 'pending',
            attempts: 0
          });
          count++;
          console.log(`✅ Scheduled ${user.phoneNumber} for ${utcTimestamp.toISOString()} (${user.preferredTime} ${user.timezone})`);
        }
      } catch (error) {
        console.error(`Failed to schedule user ${user.id}:`, error);
      }
    }
    
    return count;
  }
  
  private localTimeToUTC(localDateStr: string, timezone: string): Date {
    // Convert local time to UTC using a simpler approach
    // The input localDateStr is like "2025-08-20T21:00:00"
    
    // Parse the date components
    const [datePart, timePart] = localDateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Create a base date at midnight UTC for the target day
    const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    
    // Get the offset for this timezone on this date
    // We need to check what the offset is for this specific date (handles DST)
    const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    
    // Format the test date in the target timezone to see what local time it represents
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Binary search for the correct UTC time
    // We know it's within 24 hours of our test date
    let low = testDate.getTime() - 24 * 60 * 60 * 1000;
    let high = testDate.getTime() + 24 * 60 * 60 * 1000;
    
    while (high - low > 60000) { // Search until we're within 1 minute
      const mid = Math.floor((low + high) / 2);
      const midDate = new Date(mid);
      
      const formatted = formatter.format(midDate);
      // Parse formatted string "MM/DD/YYYY, HH:MM"
      const [datePart, timePart] = formatted.split(', ');
      const [formHour, formMinute] = timePart.split(':').map(Number);
      
      if (formHour < hour || (formHour === hour && formMinute < minute)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    // Return the found UTC time
    const result = new Date(Math.floor((low + high) / 2));
    
    // Verify the result
    const check = formatter.format(result);
    const [checkDate, checkTime] = check.split(', ');
    const [checkHour, checkMinute] = checkTime.split(':').map(Number);
    
    if (checkHour !== hour || checkMinute !== minute) {
      console.warn(`Warning: Time conversion mismatch for ${localDateStr} ${timezone}`);
      console.warn(`Wanted ${hour}:${minute}, got ${checkHour}:${checkMinute}`);
    }
    
    return result;
  }

  async getDeliveriesToSend(currentTime: Date): Promise<DeliveryQueue[]> {
    // Get deliveries scheduled for now or earlier that haven't been sent
    const windowEnd = new Date(currentTime);
    windowEnd.setMinutes(windowEnd.getMinutes() + 5); // 5 minute window
    
    return await db
      .select()
      .from(deliveryQueue)
      .where(and(
        eq(deliveryQueue.status, 'pending'),
        lte(deliveryQueue.scheduledFor, windowEnd),
        lt(deliveryQueue.attempts, 3) // Max 3 attempts
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
    const [current] = await db
      .select()
      .from(deliveryQueue)
      .where(eq(deliveryQueue.id, id));
    
    if (current) {
      await db
        .update(deliveryQueue)
        .set({
          status: current.attempts >= 2 ? 'failed' : 'pending',
          attempts: current.attempts + 1,
          errorMessage: error
        })
        .where(eq(deliveryQueue.id, id));
    }
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
}

export const storage = new DatabaseStorage();
