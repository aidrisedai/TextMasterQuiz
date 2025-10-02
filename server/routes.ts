import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { geminiService } from "./services/gemini";
import { databaseDeliveryService } from "./services/database-delivery-service"; // DATABASE-DRIVEN DELIVERY (polling every 15 minutes)
import { proactiveAlerts } from "./services/proactive-alerts"; // PROACTIVE ALERT SYSTEM
import { adminRoutes } from "./routes-admin.js";
// Test routes only loaded in development/test environments
let timezoneTestRoutes: any = null;
let simpleTestRoutes: any = null;
let testRunnerRoutes: any = null;
let finalTestRoutes: any = null;
let scoreTestRoutes: any = null;
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { calculatePoints, getPointsBreakdown } from "./utils/scoring.js";
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
  // Only create admin if environment variables are provided
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminUsername || !adminPassword || !adminEmail) {
    console.log('⚠️  Default admin creation skipped - set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL env vars to create default admin');
    return;
  }
  
  const existingAdmin = await storage.getAdminByUsername(adminUsername);
  if (!existingAdmin) {
    const hashedPassword = await hashPassword(adminPassword);
    await storage.createAdmin({
      username: adminUsername,
      password: hashedPassword,
      name: "Administrator",
      email: adminEmail,
      isActive: true,
    });
    console.log(`✅ Default admin user '${adminUsername}' created`);
  } else {
    console.log(`ℹ️  Admin user '${adminUsername}' already exists`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Load test routes only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    timezoneTestRoutes = (await import("./routes-test-timezone")).default;
    simpleTestRoutes = (await import("./routes-test-simple")).default;
    testRunnerRoutes = (await import("./routes-test-runner")).default;
    finalTestRoutes = (await import("./routes-test-final")).default;
    scoreTestRoutes = (await import("./routes-test-score")).default;
  }

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
  
  // Initialize DATABASE-DRIVEN delivery service (polling every 15 minutes + all existing safeguards)
  databaseDeliveryService.init();
  
  // Initialize PROACTIVE ALERTS (prevent incidents like Aug 27 SMS outage)
  proactiveAlerts.init({
    adminPhoneNumber: '+15153570454', // Your phone number for critical SMS alerts
    enabledChannels: [] // SMS alerts disabled to avoid costs - user will login to check dashboard manually
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
      console.log('=== SMS WEBHOOK RECEIVED ===');
      console.log('📥 Full Twilio webhook body:', JSON.stringify(req.body, null, 2));
      console.log('📥 Request headers:', JSON.stringify(req.headers, null, 2));
      
      const { From: phoneNumber, Body: message } = req.body;
      console.log(`📱 From: ${phoneNumber}`);
      console.log(`💬 Message: "${message}"`);
      
      if (!phoneNumber || !message) {
        console.log('❌ Invalid webhook request - missing phone or message');
        console.log(`phoneNumber present: ${!!phoneNumber}, message present: ${!!message}`);
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
      console.log(`🔍 Processing message: "${messageUpper}" for user ${user.phoneNumber}`);

      // Handle commands
      let commandHandled = false;
      
      if (messageUpper === 'SCORE') {
        console.log('📊 Processing SCORE command');
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
        console.log(`✅ Processing answer: ${messageUpper}`);
        // Handle answer
        await processAnswer(user, messageUpper, phoneNumber);
        commandHandled = true;
      }
      
      if (!commandHandled) {
        console.log(`❓ Unrecognized command: "${messageUpper}"`);
        // Default response for unrecognized messages
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Thanks for your message! Text HELP for available commands or wait for your next daily question."
        });
      }
      
      console.log(`✅ SMS webhook processed successfully for ${phoneNumber}`);
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('❌ SMS webhook error:', error);
      console.error('Error details:', {
        phone: req.body?.From,
        message: req.body?.Body,
        stack: error.stack
      });
      res.status(500).send('Error');
    }
  });

  // Manual question sending (WORKING VERSION)
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

      // Check for pending answers
      const pendingAnswers = await storage.getPendingUserAnswers(user.id);
      
      if (pendingAnswers.length > 0) {
        return res.status(400).json({ 
          message: `User has ${pendingAnswers.length} pending answer(s). Cannot send duplicate question.` 
        });
      }

      // Get a random question from database
      const question = await storage.getRandomQuestion(['general', 'science', 'history'], []);
      
      if (!question) {
        return res.status(400).json({ message: "No questions available" });
      }

      // Send SMS with proper formatting
      await twilioService.sendDailyQuestion(
        phoneNumber,
        question,
        user.questionsAnswered + 1
      );
      
      // CRITICAL: Create pending answer record
      await storage.recordAnswer({
        userId: user.id,
        questionId: question.id,
        userAnswer: null, // This makes it pending
        isCorrect: false,
        pointsEarned: 0,
      });
      
      console.log(`✅ Question sent and pending answer created for ${phoneNumber}`);
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
  
  // Create pending answer for testing
  app.post("/api/test/create-pending-answer", async (req, res) => {
    try {
      const { phoneNumber, questionId } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const user = await storage.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Use a default question ID from database if not provided
      let qId = questionId;
      if (!qId) {
        const questions = await storage.getAllQuestions();
        if (questions.length > 0) {
          qId = questions[0].id;
        } else {
          return res.status(400).json({ message: "No questions available" });
        }
      }
      
      // Create pending answer record
      await storage.recordAnswer({
        userId: user.id,
        questionId: qId,
        userAnswer: null, // This makes it pending
        isCorrect: false,
        pointsEarned: 0,
      });
      
      console.log(`✅ Created pending answer for ${phoneNumber} with question ${qId}`);
      res.json({ 
        message: "Pending answer created successfully",
        userId: user.id,
        questionId: qId
      });
      
    } catch (error: any) {
      console.error("Create pending answer error:", error);
      res.status(500).json({ message: "Failed to create pending answer" });
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
      
      // Input validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: "Invalid input format" });
      }
      
      if (username.length > 100 || password.length > 200) {
        return res.status(400).json({ message: "Input too long" });
      }
      
      // Rate limiting for login attempts per IP
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const loginAttemptKey = `login_${clientIP}`;
      
      // Simple in-memory rate limiting for login attempts
      if (!(global as any).loginAttempts) {
        (global as any).loginAttempts = new Map();
      }
      
      const now = Date.now();
      const attempts = (global as any).loginAttempts.get(loginAttemptKey) || [];
      const recentAttempts = attempts.filter((time: number) => now - time < 15 * 60 * 1000); // 15 minutes
      
      if (recentAttempts.length >= 5) {
        return res.status(429).json({ message: "Too many login attempts. Please try again later." });
      }
      
      recentAttempts.push(now);
      (global as any).loginAttempts.set(loginAttemptKey, recentAttempts);

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
    if (req.session) {
      req.session.adminUser = undefined;
    }
    res.json({ message: "Logout successful" });
  });

  // Health check endpoint for Render
  app.get("/api/health", async (req, res) => {
    try {
      // Basic health check
      const health: any = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0"
      };
      
      // Optional: Add database check
      try {
        await storage.getAllUsers();
        health.database = "connected";
      } catch (error) {
        health.database = "disconnected";
      }
      
      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
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

  // Leaderboard routes (public)
  app.get("/api/leaderboards/total-score", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topUsers = await storage.getTopUsersByTotalScore(limit);
      
      const leaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        phoneNumber: `****${user.phoneNumber.slice(-4)}`, // Show only last 4 digits
        totalScore: user.totalScore,
        questionsAnswered: user.questionsAnswered,
        accuracyRate: user.questionsAnswered > 0 
          ? Math.round((user.correctAnswers / user.questionsAnswered) * 100)
          : 0,
        joinDate: user.joinDate
      }));
      
      res.json({
        type: 'totalScore',
        title: '🏆 Total Points Leaders',
        description: 'Top quiz masters by total points earned',
        leaderboard
      });
    } catch (error: any) {
      console.error('Error fetching total score leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });
  
  app.get("/api/leaderboards/play-streak", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      let topUsers;
      
      try {
        topUsers = await storage.getTopUsersByPlayStreak(limit);
      } catch (dbError: any) {
        // If play_streak column doesn't exist, fall back to current_streak
        if (dbError.message?.includes('play_streak') || dbError.message?.includes('column')) {
          console.log('Falling back to current_streak for play streak leaderboard');
          topUsers = await storage.getTopUsersByTotalScore(limit); // Use total score as fallback
        } else {
          throw dbError;
        }
      }
      
      const leaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        phoneNumber: `****${user.phoneNumber.slice(-4)}`,
        playStreak: user.playStreak || user.currentStreak || 0, // Fallback to currentStreak for migration
        totalScore: user.totalScore,
        questionsAnswered: user.questionsAnswered,
        joinDate: user.joinDate
      }));
      
      res.json({
        type: 'playStreak',
        title: '🎯 Daily Champions',
        description: 'Most consistent daily players',
        leaderboard
      });
    } catch (error: any) {
      console.error('Error fetching play streak leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });
  
  app.get("/api/leaderboards/winning-streak", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      let topUsers;
      
      try {
        topUsers = await storage.getTopUsersByWinningStreak(limit);
      } catch (dbError: any) {
        // If winning_streak column doesn't exist, fall back to current_streak
        if (dbError.message?.includes('winning_streak') || dbError.message?.includes('column')) {
          console.log('Falling back to current_streak for winning streak leaderboard');
          topUsers = await storage.getTopUsersByTotalScore(limit); // Use total score as fallback
        } else {
          throw dbError;
        }
      }
      
      const leaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        phoneNumber: `****${user.phoneNumber.slice(-4)}`,
        winningStreak: user.winningStreak || user.currentStreak || 0, // Fallback to currentStreak
        totalScore: user.totalScore,
        accuracyRate: user.questionsAnswered > 0 
          ? Math.round((user.correctAnswers / user.questionsAnswered) * 100)
          : 0,
        joinDate: user.joinDate
      }));
      
      res.json({
        type: 'winningStreak',
        title: '🔥 Winning Legends',
        description: 'Longest consecutive correct streaks',
        leaderboard
      });
    } catch (error: any) {
      console.error('Error fetching winning streak leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });
  
  // Get user's position on all leaderboards
  app.get("/api/user/:phoneNumber/leaderboard-position", async (req, res) => {
    try {
      const user = await storage.getUserByPhoneNumber(req.params.phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [totalScoreRank, playStreakRank, winningStreakRank] = await Promise.all([
        storage.getUserRank(user.id, 'totalScore'),
        storage.getUserRank(user.id, 'playStreak'),
        storage.getUserRank(user.id, 'winningStreak')
      ]);

      res.json({
        userId: user.id,
        phoneNumber: `****${user.phoneNumber.slice(-4)}`,
        positions: {
          totalScore: {
            rank: totalScoreRank,
            value: user.totalScore,
            title: 'Total Points'
          },
          playStreak: {
            rank: playStreakRank,
            value: user.playStreak || user.currentStreak || 0,
            title: 'Play Streak'
          },
          winningStreak: {
            rank: winningStreakRank,
            value: user.winningStreak || 0,
            title: 'Winning Streak'
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching user leaderboard position:', error);
      res.status(500).json({ message: 'Failed to fetch user position' });
    }
  });
  
  // Admin routes for question management
  app.use("/api/admin", requireAdmin, adminRoutes);
  
  // Test routes only in development/test environments
  if (process.env.NODE_ENV !== 'production') {
    // Test routes for SMS commands
    const testRoutes = await import('./routes-test.js');
    app.use("/api/test", testRoutes.default);
    
    // Timezone testing routes
    if (timezoneTestRoutes) app.use("/api/test", timezoneTestRoutes);
    if (simpleTestRoutes) app.use("/api/test", simpleTestRoutes);
    if (testRunnerRoutes) app.use("/api/test", testRunnerRoutes);
    if (finalTestRoutes) app.use("/api/test", finalTestRoutes);
    if (scoreTestRoutes) app.use("/api/test", scoreTestRoutes);
  }

  // Helper function to send question to any user (not just new signups)
  async function sendQuestionToUser(user: any) {
    try {
      console.log(`🎯 Sending question to user ${user.phoneNumber}`);
      
      // Select category from user preferences for question
      const userCategories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      const category = userCategories[Math.floor(Math.random() * userCategories.length)];
      
      console.log(`📚 Question category: ${category}`);
      
      // Get user's answered questions to avoid duplicates
      const answeredQuestionIds = await storage.getUserAnsweredQuestionIds(user.id);
      
      // Get a random question from their preferred category that they haven't answered
      let question = await storage.getRandomQuestion([category], answeredQuestionIds);
      
      if (!question) {
        console.log('🔄 No unused questions found in preferred category, trying any category...');
        // Try any category as fallback
        question = await storage.getRandomQuestion([], answeredQuestionIds);
      }
      
      if (!question) {
        console.log('🤖 No existing questions found, generating new question with AI...');
        // Generate a new question if none available
        const generated = await geminiService.generateQuestion(category, 'medium', []);
        if (generated) {
          question = await storage.createQuestion(generated);
          console.log(`✨ Generated new question: ${question.questionText.substring(0, 50)}...`);
        }
      }

      if (question) {
        await storage.incrementQuestionUsage(question.id);
        
        // Send the question
        await twilioService.sendDailyQuestion(
          user.phoneNumber,
          question,
          user.questionsAnswered + 1
        );
        
        // CRITICAL: Create a pending answer record so webhook can find it
        await storage.recordAnswer({
          userId: user.id,
          questionId: question.id,
          userAnswer: null, // This makes it pending
          isCorrect: false, // Will be updated when user responds
          pointsEarned: 0, // Will be updated when user responds
        });
        
        console.log(`✅ Sent question to user ${user.phoneNumber} and created pending answer record`);
        console.log(`📝 Question: "${question.questionText.substring(0, 50)}..."`);
        console.log(`🔑 Correct answer: ${question.correctAnswer}`);
      } else {
        console.log('❌ No question available to send');
        throw new Error('No questions available');
      }
    } catch (error) {
      console.error('Error sending question to user:', error);
      throw error; // Re-throw to let caller handle it
    }
  }
  
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
      
      // FIXED: Find pending answers (where userAnswer is null) with question data
      const pendingAnswers = await storage.getPendingUserAnswers(user.id);
      console.log(`📋 Found ${pendingAnswers.length} pending answer(s) for user ${user.phoneNumber}`);
      
      if (pendingAnswers.length === 0) {
        console.log(`❌ No pending questions found for user ${user.phoneNumber}`);
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "No recent question found. Please wait for your next daily question."
        });
        return;
      }
      
      // Get the most recent pending answer
      const pendingAnswer = pendingAnswers[0];
      
      const question = pendingAnswer.question;
      
      if (!question) {
        console.log(`❌ Question not found for pending answer for user ${user.phoneNumber}`);
        await twilioService.sendSMS({
          to: phoneNumber,
          body: "Question not found. Please wait for your next daily question."
        });
        return;
      }
      
      console.log(`✅ Found pending question ${question.id} for user ${user.phoneNumber}: "${question.questionText.substring(0, 50)}..."`);
      
      // Validate the answer against the correct answer
      const isCorrect = question.correctAnswer.toUpperCase() === answer.toUpperCase();
      
      // Calculate points with dual streak bonus system
      const currentStats = await storage.getUserStats(user.id);
      const pointsEarned = calculatePoints(isCorrect, currentStats.winningStreak, currentStats.playStreak);
      
      console.log(`✅ Answer validation: User answered "${answer}", correct answer is "${question.correctAnswer}", isCorrect: ${isCorrect}`);
      console.log(`📈 Current streaks: Play=${currentStats.playStreak}, Winning=${currentStats.winningStreak}`);
      
      // Update the existing pending answer record
      await storage.updateAnswer(pendingAnswer.id, {
        userAnswer: answer,
        isCorrect,
        pointsEarned,
      });
      
      console.log(`✅ Updated pending answer ${pendingAnswer.id} for user ${user.phoneNumber}`);

      // Get updated stats (after the streak updates in storage)
      const stats = await storage.getUserStats(user.id);
      
      // Get the enhanced scoring message with breakdown using dual streaks
      const scoreBreakdown = getPointsBreakdown(isCorrect, stats.winningStreak, stats.playStreak);

      // Send feedback with actual question data and enhanced scoring
      await twilioService.sendAnswerFeedback(
        phoneNumber,
        isCorrect,
        question.correctAnswer,
        question.explanation,
        stats.winningStreak, // Use winning streak for traditional streak messaging
        pointsEarned,
        scoreBreakdown.message
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
