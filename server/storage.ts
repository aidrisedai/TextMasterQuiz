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
        
        // Create date in user's timezone
        const userDate = new Date(date);
        userDate.setHours(hours, minutes, 0, 0);
        
        // Convert to UTC using proper timezone handling
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: user.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Get the UTC equivalent
        const utcTimestamp = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          hours,
          minutes
        );
        
        // Adjust for timezone offset
        const userOffset = this.getTimezoneOffset(user.timezone, utcTimestamp);
        utcTimestamp.setMinutes(utcTimestamp.getMinutes() - userOffset);
        
        // Check if entry already exists
        const existing = await db
          .select()
          .from(deliveryQueue)
          .where(and(
            eq(deliveryQueue.userId, user.id),
            gte(deliveryQueue.scheduledFor, new Date(date.toDateString())),
            lt(deliveryQueue.scheduledFor, new Date(new Date(date).setDate(date.getDate() + 1)))
          ));
        
        if (existing.length === 0) {
          await db.insert(deliveryQueue).values({
            userId: user.id,
            scheduledFor: utcTimestamp,
            status: 'pending',
            attempts: 0
          });
          count++;
          console.log(`✅ Scheduled ${user.phoneNumber} for ${utcTimestamp.toISOString()}`);
        }
      } catch (error) {
        console.error(`Failed to schedule user ${user.id}:`, error);
      }
    }
    
    return count;
  }
  
  private getTimezoneOffset(timezone: string, date: Date): number {
    // Create two dates - one in UTC and one in the target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    // Return difference in minutes
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
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
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
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
