import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { schedulerService } from "./services/scheduler";
import { adminRoutes } from "./routes-admin.js";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const signupSchema = insertUserSchema.extend({
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
});

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Create default admin user if it doesn't exist
async function ensureDefaultAdmin() {
  const existingAdmin = await storage.getAdminByUsername("adminadmin123");
  if (!existingAdmin) {
    const hashedPassword = await hashPassword("YaallaH100%.");
    await storage.createAdmin({
      username: "adminadmin123",
      password: hashedPassword,
      name: "Administrator",
      email: "admin@text4quiz.com",
      isActive: true,
    });
    console.log("Default admin user created");
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware (no Google OAuth)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to false to ensure it works in all environments
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    }
  }));
  
  // Initialize scheduler
  schedulerService.init();
  
  // Ensure default admin user exists
  await ensureDefaultAdmin();

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

  // Admin authentication routes
  app.get("/api/auth/status", (req, res) => {
    const adminUser = req.session?.adminUser;
    if (adminUser) {
      res.json({
        authenticated: true,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          isAdmin: true,
        }
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const admin = await storage.getAdminByUsername(username);
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePasswords(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateAdminLastLogin(admin.id);

      // Store admin in session
      req.session.adminUser = {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        isAdmin: true,
      };

      res.json({
        message: "Login successful",
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          isAdmin: true,
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.adminUser = null;
    res.json({ message: "Logout successful" });
  });

  // Admin middleware for protected routes
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.adminUser) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    next();
  };

  // Admin routes for question management
  app.use("/api/admin", requireAdmin, adminRoutes);
  
  // Test routes for SMS commands
  const testRoutes = await import('./routes-test.js');
  app.use("/api/test", testRoutes.default);

  // Helper function to process answers
  async function processAnswer(user: any, answer: string, phoneNumber: string) {
    try {
      console.log(`🔍 Processing answer "${answer}" for user ${user.phoneNumber}`);
      
      // Find the most recent question this user was sent
      const recentAnswers = await storage.getUserAnswers(user.id, 1);
      
      if (recentAnswers.length === 0) {
        console.log(`❌ No recent questions found for user ${user.phoneNumber}`);
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "No recent question found. Please wait for your next daily question."
        });
        return;
      }
      
      const lastAnswer = recentAnswers[0];
      const question = lastAnswer.question;
      
      if (!question) {
        console.log(`❌ Question not found for user ${user.phoneNumber}`);
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Question not found. Please wait for your next daily question."
        });
        return;
      }
      
      // Check if user already answered this question
      if (lastAnswer.userAnswer) {
        console.log(`⚠️  User ${user.phoneNumber} already answered question ${question.id}`);
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "You've already answered this question. Wait for your next daily question!"
        });
        return;
      }
      
      // Validate the answer against the correct answer
      const isCorrect = question.correctAnswer.toUpperCase() === answer.toUpperCase();
      const pointsEarned = isCorrect ? 10 : 0;
      
      console.log(`✅ Answer validation: User answered "${answer}", correct answer is "${question.correctAnswer}", isCorrect: ${isCorrect}`);
      
      // Update the existing pending answer record
      await storage.updateAnswer(lastAnswer.id, {
        userAnswer: answer,
        isCorrect,
        pointsEarned,
      });

      // Get updated stats
      const stats = await storage.getUserStats(user.id);

      // Send feedback with actual question data
      await twilioService.sendAnswerFeedback(
        phoneNumber,
        isCorrect,
        question.correctAnswer,
        question.explanation,
        stats.currentStreak,
        pointsEarned
      );
      
      console.log(`📤 Sent feedback to ${user.phoneNumber}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
      
    } catch (error) {
      console.error("Process answer error:", error);
      await twilioService.sendSMS({
        to: phoneNumber,
        body: "Error processing your answer. Please try again later."
      });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
