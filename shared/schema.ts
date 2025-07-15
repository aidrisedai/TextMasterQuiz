import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  categoryPreferences: text("category_preferences").array().default([]),
  preferredTime: text("preferred_time").notNull().default("09:00"),
  currentStreak: integer("current_streak").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  lastQuizDate: timestamp("last_quiz_date"),
  lastAnswer: text("last_answer"),
  subscriptionStatus: text("subscription_status").notNull().default("free"), // free, premium
  timezone: text("timezone").notNull().default("America/New_York"),
  joinDate: timestamp("join_date").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(), // A, B, C, or D
  explanation: text("explanation").notNull(),
  category: text("category").notNull(),
  difficultyLevel: text("difficulty_level").notNull().default("medium"), // easy, medium, hard
  usageCount: integer("usage_count").notNull().default(0),
  createdDate: timestamp("created_date").notNull().defaultNow(),
});

export const userAnswers = pgTable("user_answers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  userAnswer: text("user_answer"), // Allow null for pending answers
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
  pointsEarned: integer("points_earned").notNull().default(0),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const usersRelations = relations(users, ({ many }) => ({
  answers: many(userAnswers),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  answers: many(userAnswers),
}));

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  user: one(users, {
    fields: [userAnswers.userId],
    references: [users.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  joinDate: true,
  currentStreak: true,
  totalScore: true,
  questionsAnswered: true,
  correctAnswers: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  usageCount: true,
  createdDate: true,
});

export const insertUserAnswerSchema = createInsertSchema(userAnswers).omit({
  id: true,
  answeredAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertUserAnswer = z.infer<typeof insertUserAnswerSchema>;
export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
