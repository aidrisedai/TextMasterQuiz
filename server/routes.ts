import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { geminiService } from "./services/gemini";
// import { schedulerService } from "./services/scheduler"; // OLD BROKEN SCHEDULER - DISABLED  
import { queueScheduler } from "./services/queue-scheduler"; // OLD BATCH SCHEDULER (15-min intervals)
import { precisionScheduler } from "./services/precision-scheduler"; // OLD PRECISION SCHEDULER (individual cron jobs)
import { hourlyScheduler } from "./services/hourly-scheduler"; // NEW HOURLY SCHEDULER (23:30 + hourly)
import { proactiveAlerts } from "./services/proactive-alerts"; // PROACTIVE ALERT SYSTEM
import { adminRoutes } from "./routes-admin.js";
import timezoneTestRoutes from "./routes-test-timezone";
import simpleTestRoutes from "./routes-test-simple";
import testRunnerRoutes from "./routes-test-runner";
import finalTestRoutes from "./routes-test-final";
import scoreTestRoutes from "./routes-test-score";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Extend session type to include adminUser
declare module "express-session" {
  interface SessionData {
    adminUser?: {
      id: number;
      username: string;
      name: string;
      email: string | null;
      isAdmin: boolean;
    };
  }
}

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
  
  // Initialize HOURLY scheduler (23:30 population + hourly delivery - scalable & simple)
  hourlyScheduler.init();
  
  // Initialize PROACTIVE ALERTS (prevent incidents like Aug 27 SMS outage)
  proactiveAlerts.init({
    adminPhoneNumber: '+15153570454', // Your phone number for critical SMS alerts
    enabledChannels: ['sms'] // Start with SMS only, can add email/webhook later
  });
  
  // Start monitoring service
  const { monitoringService } = await import('./services/monitoring.js');
  const { dailyCronService } = await import('./services/daily-cron.js');
  
  monitoringService.startHealthMonitoring();
  dailyCronService.init();
  
  // Queue automatically repopulated - endpoint removed
  
  // Start queue processor for generation jobs
  // DISABLED: Queue processor was continuously generating questions from stuck jobs
  // Uncomment only when you need to run generation or broadcast jobs
  // const { queueProcessor } = await import("./services/queue-processor.js");
  // queueProcessor.start();
  // console.log('Queue processor initialized');
  
  // Ensure default admin user exists
  await ensureDefaultAdmin();

  // User signup
  app.post("/api/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      // Import validation function
      const { validateAndFormatUSAPhone, isTestPhoneNumber } = await import("../shared/phone-validator.js");
      
      // Validate and format the phone number
      const phoneValidation = validateAndFormatUSAPhone(data.phoneNumber);
      
      if (!phoneValidation.isValid) {
        return res.status(400).json({ 
          message: `Invalid phone number: ${phoneValidation.error}`,
          details: phoneValidation
        });
      }
      
      // Warn if it looks like a test number
      if (isTestPhoneNumber(phoneValidation.formatted!)) {
        console.warn(`Warning: Test/fake phone number detected: ${phoneValidation.formatted}`);
        // You could reject these outright if you want:
        // return res.status(400).json({ 
        //   message: "This appears to be a test phone number. Please use a real phone number." 
        // });
      }
      
      // Use the properly formatted phone number
      const formattedPhone = phoneValidation.formatted!;
      
      // Check if user already exists
      const existingUser = await storage.getUserByPhoneNumber(formattedPhone);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this phone number already exists" 
        });
      }

      // Create user with validated phone number
      const user = await storage.createUser({
        phoneNumber: formattedPhone,
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

      // Send immediate welcome quiz question to give users a taste
      await sendWelcomeQuizQuestion(user);

      res.json({ 
        message: "Welcome to Text4Quiz! Check your phone for your welcome message and first trivia question.",
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

      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for existing pending answers before sending
      const userAnswers = await storage.getUserAnswers(user.id, 100);
      const pendingAnswers = userAnswers.filter(answer => answer.userAnswer === null);
      
      if (pendingAnswers.length > 0) {
        return res.status(400).json({ 
          message: `User has ${pendingAnswers.length} pending answer(s). Cannot send duplicate question.` 
        });
      }

      // Use queue scheduler to send question immediately
      await queueScheduler.sendQuestionNow(phoneNumber);
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
    req.session.adminUser = undefined;
    res.json({ message: "Logout successful" });
  });

  // Admin middleware for protected routes
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.adminUser) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    next();
  };

  // Admin Users endpoint
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const usersWithDetails = await Promise.all(allUsers.map(async (user) => {
        // Get the last question/message sent to this user
        const recentAnswers = await storage.getUserAnswers(user.id, 1);
        const lastMessage = recentAnswers.length > 0 ? recentAnswers[0] : null;
        
        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.phoneNumber, // Use phone number as identifier
          categories: user.categoryPreferences || [],
          lastMessageDate: user.lastQuizDate,
          lastMessageContent: lastMessage ? lastMessage.question.questionText : null,
          lastQuestionId: lastMessage ? lastMessage.questionId : null,
          subscriptionStatus: user.subscriptionStatus,
          isActive: user.isActive,
          preferredTime: user.preferredTime,
          timezone: user.timezone,
          currentStreak: user.currentStreak,
          totalScore: user.totalScore,
          questionsAnswered: user.questionsAnswered,
          correctAnswers: user.correctAnswers,
          joinDate: user.joinDate
        };
      }));

      res.json(usersWithDetails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Resend last message endpoint
  app.post("/api/admin/resend-message", requireAdmin, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the last question sent to this user
      const recentAnswers = await storage.getUserAnswers(user.id, 1);
      if (recentAnswers.length === 0) {
        return res.status(400).json({ message: "No previous message found for this user" });
      }

      const lastAnswer = recentAnswers[0];
      const question = lastAnswer.question;
      
      if (!question) {
        return res.status(400).json({ message: "Previous question not found" });
      }

      // Resend the same question using Twilio service
      const questionNumber = user.questionsAnswered;
      await twilioService.sendDailyQuestion(phoneNumber, question, questionNumber);

      res.json({ 
        message: "Previous message resent successfully",
        questionText: question.questionText
      });
    } catch (error: any) {
      console.error("Error resending message:", error);
      res.status(500).json({ message: "Failed to resend message" });
    }
  });

  // Admin routes for question management
  app.use("/api/admin", requireAdmin, adminRoutes);
  
  // Test routes for SMS commands
  const testRoutes = await import('./routes-test.js');
  app.use("/api/test", testRoutes.default);
  
  // Timezone testing routes
  app.use("/api/test", timezoneTestRoutes);
  app.use("/api/test", simpleTestRoutes);
  app.use("/api/test", testRunnerRoutes);
  app.use("/api/test", finalTestRoutes);
  app.use("/api/test", scoreTestRoutes);

  // Helper function to send welcome quiz question immediately after signup
  async function sendWelcomeQuizQuestion(user: any) {
    try {
      console.log(`🎯 Sending welcome quiz question to new user ${user.phoneNumber}`);
      
      // Select first category from user preferences for welcome question
      const userCategories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      const welcomeCategory = userCategories[0];
      
      console.log(`📚 Welcome question category: ${welcomeCategory}`);
      
      // Get a random question from their preferred category
      let question = await storage.getRandomQuestion([welcomeCategory], []);
      
      if (!question) {
        console.log('🤖 No existing questions found, generating new welcome question with AI...');
        // Generate a new question if none available
        const generated = await geminiService.generateQuestion(welcomeCategory, 'medium', []);
        if (generated) {
          question = await storage.createQuestion(generated);
          console.log(`✨ Generated new welcome question: ${question.questionText.substring(0, 50)}...`);
        }
      }

      if (question) {
        await storage.incrementQuestionUsage(question.id);
        
        // Send the welcome question (this is question #1)
        await twilioService.sendDailyQuestion(
          user.phoneNumber,
          question,
          1
        );
        
        // Create a pending answer record
        await storage.recordAnswer({
          userId: user.id,
          questionId: question.id,
          userAnswer: null, // Will be filled when user responds
          isCorrect: false, // Will be updated when user responds
          pointsEarned: 0, // Will be updated when user responds
        });
        
        // Set lastQuizDate to today so scheduler won't send another question today
        // But scheduled delivery will start tomorrow
        await storage.updateUser(user.id, {
          lastQuizDate: new Date()
        });
        
        console.log(`✅ Sent welcome question to new user ${user.phoneNumber}`);
      } else {
        console.log('❌ No welcome question available to send');
      }
    } catch (error) {
      console.error('Error sending welcome quiz question:', error);
      // Don't throw error to avoid breaking signup process
    }
  }

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
