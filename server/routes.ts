import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { schedulerService } from "./services/scheduler";
import { adminRoutes } from "./routes-admin.js";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth.js";

const signupSchema = insertUserSchema.extend({
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Initialize scheduler
  schedulerService.init();

  // User signup
  app.post("/api/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByPhoneNumber(data.phoneNumber);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this phone number already exists" 
        });
      }

      // Create user
      const user = await storage.createUser({
        phoneNumber: data.phoneNumber,
        categoryPreferences: data.categoryPreferences || [],
        preferredTime: data.preferredTime,
        timezone: data.timezone,
        subscriptionStatus: "free",
        isActive: true,
      });

      // Send welcome message with timezone-aware time display
      const timeDisplay = new Date(`2000-01-01T${user.preferredTime}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      await twilioService.sendWelcome(user.phoneNumber, `${timeDisplay} (${user.timezone})`);

      res.json({ 
        message: "Successfully signed up for Text4Quiz!",
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          preferredTime: user.preferredTime,
          categoryPreferences: user.categoryPreferences,
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ 
        message: error.message || "Failed to sign up" 
      });
    }
  });

  // Get user stats
  app.get("/api/user/:phoneNumber/stats", async (req, res) => {
    try {
      const user = await storage.getUserByPhoneNumber(req.params.phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getUserStats(user.id);
      const recentAnswers = await storage.getUserAnswers(user.id, 5);

      res.json({
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          preferredTime: user.preferredTime,
          categoryPreferences: user.categoryPreferences,
          subscriptionStatus: user.subscriptionStatus,
          joinDate: user.joinDate,
        },
        stats,
        recentAnswers: recentAnswers.map(answer => ({
          id: answer.id,
          questionText: answer.question?.questionText,
          userAnswer: answer.userAnswer,
          isCorrect: answer.isCorrect,
          answeredAt: answer.answeredAt,
          category: answer.question?.category,
          pointsEarned: answer.pointsEarned,
        }))
      });
    } catch (error: any) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Twilio webhook for incoming SMS
  app.post("/api/webhook/sms", async (req, res) => {
    try {
      console.log('📥 Incoming SMS webhook:', req.body);
      const { From: phoneNumber, Body: message } = req.body;
      
      if (!phoneNumber || !message) {
        console.log('❌ Invalid webhook request - missing phone or message');
        return res.status(400).send('Invalid request');
      }

      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Welcome to Text4Quiz! Please sign up at our website first."
        });
        return res.status(200).send('OK');
      }

      const messageUpper = message.trim().toUpperCase();

      // Handle commands
      let commandHandled = false;
      
      if (messageUpper === 'SCORE') {
        const stats = await storage.getUserStats(user.id);
        await twilioService.sendStats(phoneNumber, stats);
        commandHandled = true;
      } else if (messageUpper === 'HELP') {
        await twilioService.sendHelp(phoneNumber);
        commandHandled = true;
      } else if (messageUpper === 'STOP') {
        await storage.updateUser(user.id, { isActive: false });
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "You've been unsubscribed from Text4Quiz. Text RESTART to resume."
        });
        commandHandled = true;
      } else if (messageUpper === 'RESTART') {
        await storage.updateUser(user.id, { isActive: true });
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Welcome back to Text4Quiz! You'll receive your next question at your scheduled time."
        });
        commandHandled = true;
      } else if (messageUpper === 'MORE' && user.subscriptionStatus === 'premium') {
        // Send bonus question for premium users
        const categories = user.categoryPreferences && user.categoryPreferences.length > 0 
          ? user.categoryPreferences 
          : ['general'];
        
        // TODO: Import geminiService properly
        // const generated = await geminiService.generateBonusQuestion([], categories);
        // if (generated) {
        //   const question = await storage.createQuestion(generated);
        //   await twilioService.sendDailyQuestion(
        //     phoneNumber,
        //     question,
        //     user.questionsAnswered + 1
        //   );
        // }
        commandHandled = true;
      } else if (['A', 'B', 'C', 'D'].includes(messageUpper)) {
        // Handle answer
        await processAnswer(user, messageUpper, phoneNumber);
        commandHandled = true;
      }
      
      if (!commandHandled) {
        // Default response for unrecognized messages
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Thanks for your message! Text HELP for available commands or wait for your next daily question."
        });
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error("SMS webhook error:", error);
      res.status(500).send('Error');
    }
  });

  // Manual question sending (for testing)
  app.post("/api/admin/send-question", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      await schedulerService.sendQuestionNow(phoneNumber);
      res.json({ message: "Question sent successfully" });
    } catch (error: any) {
      console.error("Send question error:", error);
      res.status(500).json({ message: "Failed to send question" });
    }
  });

  // Direct SMS test endpoint
  app.post("/api/test-sms", async (req, res) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ message: "Phone number and message are required" });
      }

      const result = await twilioService.sendSMS({ to, body: message });
      
      if (result) {
        res.json({ message: "SMS sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send SMS" });
      }
    } catch (error: any) {
      console.error("Direct SMS error:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // Admin routes for question management
  app.use("/api/admin", adminRoutes);
  
  // Test routes for SMS commands
  const testRoutes = await import('./routes-test.js');
  app.use("/api/test", testRoutes.default);

  // Helper function to process answers
  async function processAnswer(user: any, answer: string, phoneNumber: string) {
    try {
      // Find the most recent question for this user
      // This is simplified - in production you'd want to track pending questions
      const recentAnswers = await storage.getUserAnswers(user.id, 1);
      
      // For now, we'll generate a sample response
      // In production, you'd match against the actual question
      const isCorrect = Math.random() > 0.3; // 70% chance of being correct for demo
      const pointsEarned = isCorrect ? 10 : 0;
      
      // Record the answer
      await storage.recordAnswer({
        userId: user.id,
        questionId: 1, // This would be the actual question ID
        userAnswer: answer,
        isCorrect,
        pointsEarned,
      });

      // Get updated stats
      const stats = await storage.getUserStats(user.id);

      // Send feedback
      await twilioService.sendAnswerFeedback(
        phoneNumber,
        isCorrect,
        isCorrect ? answer : 'B', // Sample correct answer
        isCorrect 
          ? "Great job! You got it right."
          : "This was a challenging question. The correct answer provides important context about the topic.",
        stats.currentStreak,
        pointsEarned
      );
    } catch (error) {
      console.error("Process answer error:", error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
