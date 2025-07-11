import { users, questions, userAnswers, type User, type InsertUser, type Question, type InsertQuestion, type UserAnswer, type InsertUserAnswer } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";

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
  getUserAnswers(userId: number, limit?: number): Promise<(UserAnswer & { question: Question })[]>;
  
  // Stats methods
  getUserStats(userId: number): Promise<{
    currentStreak: number;
    totalScore: number;
    questionsAnswered: number;
    accuracyRate: number;
  }>;
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
    
    // Update user stats
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
}

export const storage = new DatabaseStorage();
