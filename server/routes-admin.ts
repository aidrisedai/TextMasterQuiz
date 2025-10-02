// Admin routes for managing questions and system
import { Router } from 'express';
import { twilioService } from './services/twilio.js';
import { storage } from './storage.js';
import { generateQuestionsForCategory } from './scripts/generate-questions.js';
import { geminiService } from './services/gemini.js';
import { broadcastService } from './services/broadcast.js';
import { insertGenerationJobSchema, insertBroadcastSchema } from '@shared/schema';
import { z } from 'zod';
import { generationManager } from './services/generation-manager.js';
import { monitoringService } from './services/monitoring.js';

const router = Router();

// Monitoring endpoints
router.get('/monitoring/health', async (req, res) => {
  try {
    const health = await monitoringService.performHealthCheck();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/monitoring/daily/:date?', async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : undefined;
    const metrics = await monitoringService.getDailyMetrics(date);
    res.json(metrics);
  } catch (error) {
    console.error('Daily metrics error:', error);
    res.status(500).json({ error: 'Failed to get daily metrics' });
  }
});

router.get('/monitoring/report/:date?', async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : undefined;
    const report = await monitoringService.generateDailyReport(date);
    res.type('text/plain').send(report);
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

router.post('/monitoring/synthetic-test', async (req, res) => {
  try {
    const success = await monitoringService.runSyntheticTest();
    res.json({ 
      success, 
      message: success ? 'Synthetic test passed' : 'Synthetic test failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Synthetic test error:', error);
    res.status(500).json({ error: 'Synthetic test failed' });
  }
});

// Note: Admin authentication middleware is applied at the app level in routes.ts

// Get generation status
router.get('/generation-status', async (req, res) => {
  const state = generationManager.getState();
  res.json(state);
});

// Cancel generation
router.post('/cancel-generation', async (req, res) => {
  generationManager.cancelGeneration();
  res.json({ message: 'Generation cancellation requested' });
});

// Generate questions for all categories
router.post('/generate-questions', async (req, res) => {
  try {
    // Check if generation is already in progress
    if (generationManager.isGenerating()) {
      return res.status(409).json({ 
        error: 'Generation already in progress',
        state: generationManager.getState()
      });
    }
    
    console.log('Starting controlled bulk question generation...');
    
    // Run generation in background with manager
    generationManager.generateAllQuestions().catch(error => {
      console.error('Background generation error:', error);
    });
    
    res.json({ 
      message: 'Question generation started',
      note: 'Check /api/admin/generation-status for progress. This will take several minutes.',
      state: generationManager.getState()
    });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to start question generation' });
  }
});

// Generate questions for specific category
router.post('/generate-questions/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { count = 20 } = req.body;
    
    // Check if generation is already in progress
    if (generationManager.isGenerating()) {
      return res.status(409).json({ 
        error: 'Generation already in progress',
        state: generationManager.getState()
      });
    }
    
    console.log(`Generating ${count} questions for category: ${category}`);
    
    // Run generation in background with manager
    generationManager.generateForCategory(category, count).catch(error => {
      console.error('Background category generation error:', error);
    });
    
    res.json({ 
      message: `Generating ${count} questions for ${category}`,
      note: 'Check /api/admin/generation-status for progress',
      state: generationManager.getState()
    });
  } catch (error) {
    console.error('Category question generation error:', error);
    res.status(500).json({ error: 'Failed to generate category questions' });
  }
});

// Generate a single question for immediate use
router.post('/generate-single/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log(`Generating single question for category: ${category}`);
    
    const existingQuestions = await storage.getAllQuestions();
    const categoryQuestions = existingQuestions
      .filter(q => q.category === category)
      .map(q => q.questionText);
    
    const question = await geminiService.generateQuestion(
      category, 
      'medium', 
      categoryQuestions.slice(-5)
    );
    
    if (question) {
      const savedQuestion = await storage.createQuestion({
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        category: question.category,
        difficultyLevel: question.difficultyLevel
      });
      
      res.json({ 
        message: `Question generated successfully for ${category}`,
        question: savedQuestion
      });
    } else {
      res.status(500).json({ error: 'Failed to generate question' });
    }
  } catch (error) {
    console.error('Single question generation error:', error);
    res.status(500).json({ error: 'Failed to generate single question' });
  }
});

// Get all questions with pagination
router.get('/questions', async (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const questions = await storage.getAllQuestions();
    
    // Filter by category if specified
    const filteredQuestions = category 
      ? questions.filter(q => q.category === category)
      : questions;
    
    // Simple pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);
    
    // Get category summary
    const categoryStats: Record<string, number> = {};
    questions.forEach(q => {
      categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
    });
    
    res.json({
      questions: paginatedQuestions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredQuestions.length,
        totalPages: Math.ceil(filteredQuestions.length / Number(limit))
      },
      stats: {
        totalQuestions: questions.length,
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Delete a question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Note: This would require implementing delete in storage
    // For now, return not implemented
    res.status(501).json({ error: 'Delete not implemented yet' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Test SMS delivery with detailed monitoring
router.post('/test-delivery', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const testMessage = {
      to: phoneNumber,
      body: 'Text4Quiz delivery test - reply RECEIVED if you get this message'
    };

    const sent = await twilioService.sendSMS(testMessage);
    
    res.json({ 
      message: 'Test message sent', 
      sent,
      note: 'Check server logs for delivery status in 3-5 seconds'
    });
  } catch (error) {
    console.error('Test delivery error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// Fix delivery for affected users - Reset lastQuizDate for users stuck with old dates
router.post('/fix-delivery', async (req, res) => {
  try {
    console.log('🔧 Starting delivery fix for affected users...');
    
    // Find users with old lastQuizDate (before yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const affectedUsers = await storage.getAllUsers();
    const usersToFix = affectedUsers.filter(user => 
      user.isActive && 
      user.lastQuizDate && 
      new Date(user.lastQuizDate) < yesterday
    );
    
    console.log(`Found ${usersToFix.length} users needing delivery fix`);
    
    // Reset lastQuizDate for these users to make them eligible for delivery
    const fixedUsers = [];
    for (const user of usersToFix) {
      await storage.updateUser(user.id, { lastQuizDate: null });
      fixedUsers.push({
        phoneNumber: user.phoneNumber,
        oldLastQuizDate: user.lastQuizDate,
        streak: user.currentStreak
      });
      console.log(`✅ Fixed delivery for ${user.phoneNumber} (was stuck at ${user.lastQuizDate})`);
    }
    
    // Clean up any orphaned pending answers
    const cleanedUp = await storage.cleanupOrphanedPendingAnswers();
    console.log(`🧹 Cleaned up ${cleanedUp} orphaned pending answers`);
    
    res.json({ 
      message: `Fixed delivery for ${fixedUsers.length} affected users`,
      fixedUsers,
      cleanedUpRecords: cleanedUp
    });
    
  } catch (error) {
    console.error('Fix delivery error:', error);
    res.status(500).json({ error: 'Failed to fix delivery' });
  }
});

// Manual question delivery for specific user (bypass time restrictions)
router.post('/manual-question-delivery', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    console.log(`🎯 Manual question delivery to ${phoneNumber}`);
    
    // Import precision scheduler service dynamically
    const { precisionSchedulerService } = await import('./services/precision-scheduler.js');
    
    // Get user and send question directly
    const user = await storage.getUserByPhoneNumber(phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Send question now using precision scheduler
    await precisionSchedulerService.sendQuestionNow(user.phoneNumber);
    
    res.json({ 
      message: 'Question sent successfully',
      user: {
        phoneNumber: user.phoneNumber,
        questionsAnswered: user.questionsAnswered + 1
      }
    });
    
  } catch (error) {
    console.error('Manual question sending error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send question manually' });
  }
});

// Queue management endpoints
router.post('/queue-generation', async (req, res) => {
  try {
    const validatedData = insertGenerationJobSchema.parse(req.body);
    
    // Check for duplicate pending jobs for same category
    const existingJobs = await storage.getGenerationJobs();
    const pendingJob = existingJobs.find(job => 
      job.category === validatedData.category && 
      job.status === 'pending'
    );
    
    if (pendingJob) {
      return res.status(400).json({ 
        error: `A generation job for "${validatedData.category}" is already queued` 
      });
    }
    
    const job = await storage.createGenerationJob(validatedData);
    res.json({ 
      message: `Added ${validatedData.questionCount} questions for "${validatedData.category}" to queue`,
      job 
    });
  } catch (error) {
    console.error('Queue generation error:', error);
    res.status(500).json({ error: 'Failed to add job to queue' });
  }
});

router.get('/generation-queue', async (req, res) => {
  try {
    const jobs = await storage.getGenerationJobs();
    res.json({ jobs });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Failed to get generation queue' });
  }
});

router.delete('/generation-queue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteGenerationJob(Number(id));
    res.json({ message: 'Job removed from queue' });
  } catch (error) {
    console.error('Delete queue job error:', error);
    res.status(500).json({ error: 'Failed to remove job from queue' });
  }
});

// Phone validation endpoints
router.post('/validate-phones', async (req, res) => {
  try {
    const { validatePhoneList } = await import('../shared/phone-validator.js');
    
    // Get all users
    const users = await storage.getAllUsers();
    const phoneNumbers = users.map(u => u.phoneNumber);
    
    // Validate all phone numbers
    const validationResults = validatePhoneList(phoneNumbers);
    
    // Categorize results
    const valid: string[] = [];
    const invalid: { phone: string; error: string }[] = [];
    const testNumbers: string[] = [];
    
    validationResults.forEach((result, phone) => {
      if (result.isValid) {
        if (phone.includes('555') || /(\d)\1{6,}/.test(phone)) {
          testNumbers.push(phone);
        } else {
          valid.push(phone);
        }
      } else {
        invalid.push({ phone, error: result.error || 'Unknown error' });
      }
    });
    
    res.json({
      summary: {
        total: phoneNumbers.length,
        valid: valid.length,
        invalid: invalid.length,
        testNumbers: testNumbers.length
      },
      invalid,
      testNumbers,
      recommendation: invalid.length > 0 ? 
        'Some users have invalid phone numbers that will fail SMS delivery. Consider deactivating them.' : 
        'All phone numbers are properly formatted!'
    });
  } catch (error) {
    console.error('Phone validation error:', error);
    res.status(500).json({ error: 'Failed to validate phone numbers' });
  }
});

// Fix invalid phone numbers
router.post('/fix-phones', async (req, res) => {
  try {
    const { validateAndFormatUSAPhone } = await import('../shared/phone-validator.js');
    const { phoneNumbers } = req.body;
    
    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'phoneNumbers must be an array' });
    }
    
    const results: any[] = [];
    
    for (const phone of phoneNumbers) {
      const user = await storage.getUserByPhoneNumber(phone);
      if (!user) {
        results.push({ phone, status: 'not_found' });
        continue;
      }
      
      const validation = validateAndFormatUSAPhone(phone);
      
      if (validation.isValid && validation.formatted !== phone) {
        // Update user with corrected phone number
        await storage.updateUser(user.id, {
          phoneNumber: validation.formatted
        });
        results.push({ 
          phone, 
          status: 'fixed', 
          newPhone: validation.formatted 
        });
      } else if (!validation.isValid) {
        // Deactivate users with unfixable numbers
        await storage.updateUser(user.id, {
          isActive: false
        });
        results.push({ 
          phone, 
          status: 'deactivated', 
          reason: validation.error 
        });
      } else {
        results.push({ phone, status: 'already_valid' });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Phone fix error:', error);
    res.status(500).json({ error: 'Failed to fix phone numbers' });
  }
});

// Broadcast management endpoints
const broadcastMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1500, 'Message too long'),
});

const testBroadcastSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1500, 'Message too long'),
  testMode: z.boolean().default(false),
  testPhoneNumbers: z.array(z.string()).optional(),
});

// Preview broadcast
router.post('/broadcast/preview', async (req, res) => {
  try {
    const { message } = broadcastMessageSchema.parse(req.body);
    const preview = await broadcastService.previewBroadcast(message);
    res.json(preview);
  } catch (error) {
    console.error('Broadcast preview error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// Create broadcast
router.post('/broadcast/create', async (req, res) => {
  try {
    const { message } = broadcastMessageSchema.parse(req.body);
    
    // Check for recent broadcasts (cooldown)
    const recentBroadcasts = await storage.getAllBroadcasts();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentBroadcast = recentBroadcasts.find(b => 
      new Date(b.createdAt) > oneHourAgo && b.status !== 'failed'
    );
    
    if (recentBroadcast) {
      return res.status(429).json({ 
        error: 'Please wait at least 1 hour between broadcasts',
        nextAllowedAt: new Date(new Date(recentBroadcast.createdAt).getTime() + 60 * 60 * 1000)
      });
    }

    // Get admin username from session (assuming it's set in middleware)
    const adminUsername = (req as any).user?.username || 'admin';
    
    const broadcast = await storage.createBroadcast({
      message,
      createdBy: adminUsername,
      status: 'pending',
    });

    res.json({ 
      message: 'Broadcast created and queued for processing',
      broadcast 
    });
  } catch (error) {
    console.error('Broadcast creation error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// Get broadcast status and details
router.get('/broadcast/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await storage.getBroadcast(Number(id));
    
    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    const deliveries = await storage.getBroadcastDeliveries(Number(id));
    
    res.json({
      broadcast,
      deliveries,
      stats: {
        total: deliveries.length,
        sent: deliveries.filter(d => d.status === 'sent').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        pending: deliveries.filter(d => d.status === 'pending').length,
      }
    });
  } catch (error) {
    console.error('Get broadcast error:', error);
    res.status(500).json({ error: 'Failed to get broadcast details' });
  }
});

// Get all broadcasts
router.get('/broadcasts', async (req, res) => {
  try {
    const broadcasts = await storage.getAllBroadcasts();
    res.json({ broadcasts });
  } catch (error) {
    console.error('Get broadcasts error:', error);
    res.status(500).json({ error: 'Failed to get broadcasts' });
  }
});

// Cancel pending broadcast
router.delete('/broadcast/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await storage.getBroadcast(Number(id));
    
    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }
    
    if (broadcast.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending broadcasts' });
    }

    await storage.updateBroadcast(Number(id), {
      status: 'cancelled',
      completedAt: new Date(),
    });

    res.json({ message: 'Broadcast cancelled successfully' });
  } catch (error) {
    console.error('Cancel broadcast error:', error);
    res.status(500).json({ error: 'Failed to cancel broadcast' });
  }
});

// Test broadcast endpoints
router.post('/broadcast/test-preview', async (req, res) => {
  try {
    const { message, testPhoneNumbers } = testBroadcastSchema.parse(req.body);
    
    // If specific test phone numbers are provided, use those
    let recipientCount = 0;
    if (testPhoneNumbers && testPhoneNumbers.length > 0) {
      recipientCount = testPhoneNumbers.length;
    } else {
      // Otherwise, get actual eligible users count but won't send to them
      const eligibleUsers = await storage.getBroadcastEligibleUsers();
      recipientCount = eligibleUsers.length;
    }
    
    const fullMessage = `[TEST MODE] ${message}\n\nReply STOP to unsubscribe from broadcasts.`;
    
    res.json({
      recipientCount,
      estimatedDuration: Math.ceil(recipientCount * 0.1), // 100ms per message in test mode
      characterCount: fullMessage.length,
      messagePreview: fullMessage,
      testMode: true,
      testPhoneNumbers: testPhoneNumbers || [],
    });
  } catch (error) {
    console.error('Test broadcast preview error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

router.post('/broadcast/test-send', async (req, res) => {
  try {
    const { message, testPhoneNumbers } = testBroadcastSchema.parse(req.body);
    
    let recipients: string[] = [];
    if (testPhoneNumbers && testPhoneNumbers.length > 0) {
      recipients = testPhoneNumbers;
    } else {
      // Use a default test phone number or admin's number
      recipients = ['+15153570454']; // Your test number
    }
    
    const adminUsername = (req as any).user?.username || 'admin';
    const testMessage = `[TEST MODE] ${message}\n\nThis is a test broadcast. No real users received this message.`;
    
    // Create a test broadcast record
    const broadcast = await storage.createBroadcast({
      message: `[TEST] ${message}`,
      createdBy: adminUsername,
      status: 'completed', // Mark as completed immediately for test
      totalRecipients: recipients.length,
      sentCount: recipients.length,
      failedCount: 0,
    });

    // Send test messages to specified numbers only
    const results = [];
    for (const phoneNumber of recipients) {
      try {
        const success = await twilioService.sendSMS({
          to: phoneNumber,
          body: testMessage,
        });
        
        results.push({
          phoneNumber,
          status: success ? 'sent' : 'failed',
          message: success ? 'Test message sent successfully' : 'Failed to send test message'
        });
        
        // Create delivery record for test
        await storage.createBroadcastDelivery({
          broadcastId: broadcast.id,
          userId: 0, // Use 0 for test deliveries
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : undefined,
          errorMessage: success ? undefined : 'Test delivery failed',
        });
      } catch (error) {
        results.push({
          phoneNumber,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Test broadcast completed',
      broadcast,
      results,
      testMode: true,
      note: 'This was a test broadcast. Only specified test numbers received messages.'
    });
  } catch (error) {
    console.error('Test broadcast error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Test broadcast failed' });
  }
});

// Simulate broadcast delivery (no actual SMS sending)
router.post('/broadcast/simulate', async (req, res) => {
  try {
    const { message } = broadcastMessageSchema.parse(req.body);
    const adminUsername = (req as any).user?.username || 'admin';
    
    // Get eligible users for realistic simulation
    const eligibleUsers = await storage.getBroadcastEligibleUsers();
    
    // Create simulation broadcast
    const broadcast = await storage.createBroadcast({
      message: `[SIMULATION] ${message}`,
      createdBy: adminUsername,
      status: 'active',
      totalRecipients: eligibleUsers.length,
    });

    // Simulate delivery process
    let sentCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < eligibleUsers.length; i++) {
      const user = eligibleUsers[i];
      
      // Simulate 95% success rate
      const success = Math.random() > 0.05;
      
      await storage.createBroadcastDelivery({
        broadcastId: broadcast.id,
        userId: user.id,
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined,
        errorMessage: success ? undefined : 'Simulated delivery failure',
      });
      
      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
      
      // Update progress every 10 users
      if (i % 10 === 0) {
        await storage.updateBroadcast(broadcast.id, {
          sentCount,
          failedCount,
        });
      }
    }
    
    // Mark as completed
    await storage.updateBroadcast(broadcast.id, {
      status: 'completed',
      completedAt: new Date(),
      sentCount,
      failedCount,
    });

    res.json({
      message: 'Broadcast simulation completed',
      broadcast: await storage.getBroadcast(broadcast.id),
      simulation: {
        totalUsers: eligibleUsers.length,
        sentCount,
        failedCount,
        successRate: `${((sentCount / eligibleUsers.length) * 100).toFixed(1)}%`
      },
      note: 'This was a simulation. No actual SMS messages were sent to users.'
    });
  } catch (error) {
    console.error('Simulate broadcast error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Simulation failed' });
  }
});

// Manual trigger for delivery queue processing
router.post('/trigger-queue', async (req, res) => {
  try {
    console.log('🔧 Manual queue trigger requested...');
    
    // Get current queue status
    const todayStatus = await storage.getTodayDeliveryStatus();
    const pending = todayStatus.filter(d => d.status === 'pending');
    const sent = todayStatus.filter(d => d.status === 'sent');
    const failed = todayStatus.filter(d => d.status === 'failed');
    
    // Process the queue manually
    const processDeliveryQueue = async () => {
      const now = new Date();
      const deliveries = await storage.getDeliveriesToSend(now);
      
      console.log(`📬 Found ${deliveries.length} deliveries to process`);
      
      let processedCount = 0;
      let errorCount = 0;
      
      for (const delivery of deliveries) {
        try {
          // Get user details
          const user = await storage.getUser(delivery.userId);
          if (!user || !user.isActive) {
            await storage.markDeliveryAsFailed(delivery.id, 'User not found or inactive');
            errorCount++;
            continue;
          }
          
          // Get or generate question
          const userAnswers = await storage.getUserAnswers(user.id, 1000);
          const answeredQuestionIds = userAnswers.map(answer => answer.questionId);
          const userCategories = user.categoryPreferences && user.categoryPreferences.length > 0 
            ? user.categoryPreferences 
            : ['general'];
          const categoryIndex = user.questionsAnswered % userCategories.length;
          const todayCategory = userCategories[categoryIndex];
          
          let question = await storage.getRandomQuestion([todayCategory], answeredQuestionIds);
          
          if (!question) {
            const allQuestions = await storage.getAllQuestions();
            const recentQuestions = allQuestions
              .sort((a, b) => b.id - a.id)
              .slice(0, 10)
              .map(q => q.questionText);
            
            const generated = await geminiService.generateQuestion(todayCategory, 'medium', recentQuestions);
            
            if (generated) {
              question = await storage.createQuestion(generated);
            }
          }
          
          if (!question) {
            await storage.markDeliveryAsFailed(delivery.id, 'No question available');
            errorCount++;
            continue;
          }
          
          // Format message
          const questionNumber = user.questionsAnswered + 1;
          const message = `🧠 Question #${questionNumber}: ${question.questionText}\n\n` +
            `A) ${question.optionA}\n` +
            `B) ${question.optionB}\n` +
            `C) ${question.optionC}\n` +
            `D) ${question.optionD}\n\n` +
            `Reply with A, B, C, or D`;
          
          // Send SMS
          const smsSuccess = await twilioService.sendSMS({
            to: user.phoneNumber,
            body: message
          });
          
          if (smsSuccess) {
            // Create pending answer record using atomic method
            const created = await storage.createPendingAnswerIfNone(user.id, question.id);
            if (!created) {
              console.log('⚠️ Failed to create pending answer in queue trigger - cleaning up');
              const cleaned = await storage.cleanupOrphanedPendingAnswers();
              console.log(`🧼 Cleaned up ${cleaned} orphaned answers`);
              
              const retryCreated = await storage.createPendingAnswerIfNone(user.id, question.id);
              if (!retryCreated) {
                throw new Error('Failed to create pending answer record in queue trigger');
              }
            }
            
            // Update user's last quiz date
            await storage.updateUser(user.id, { 
              lastQuizDate: new Date() 
            });
            
            // Mark delivery as sent
            await storage.markDeliveryAsSent(delivery.id, question.id);
            
            console.log(`✅ Sent question to ${user.phoneNumber}`);
            processedCount++;
          } else {
            await storage.markDeliveryAsFailed(delivery.id, 'SMS send failed');
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to process delivery ${delivery.id}:`, error);
          await storage.markDeliveryAsFailed(
            delivery.id, 
            error instanceof Error ? error.message : 'Unknown error'
          );
          errorCount++;
        }
      }
      
      return { processedCount, errorCount };
    };
    
    const result = await processDeliveryQueue();
    
    res.json({
      message: 'Queue processing triggered manually',
      status: {
        before: {
          total: todayStatus.length,
          pending: pending.length,
          sent: sent.length,
          failed: failed.length
        },
        processed: result,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Manual queue trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger queue processing' });
  }
});

// Proactive Alerts Management
router.get('/alerts/active', async (req, res) => {
  try {
    const { proactiveAlerts } = await import('./services/proactive-alerts.js');
    const activeAlerts = proactiveAlerts.getActiveAlerts();
    res.json({ activeAlerts });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({ error: 'Failed to get active alerts' });
  }
});

router.post('/alerts/configure', async (req, res) => {
  try {
    const { proactiveAlerts } = await import('./services/proactive-alerts.js');
    const { adminPhoneNumber, adminEmail, webhookUrl, enabledChannels } = req.body;
    
    proactiveAlerts.updateConfig({
      adminPhoneNumber,
      adminEmail, 
      webhookUrl,
      enabledChannels
    });
    
    res.json({ message: 'Alert configuration updated successfully' });
  } catch (error) {
    console.error('Configure alerts error:', error);
    res.status(500).json({ error: 'Failed to configure alerts' });
  }
});

router.post('/alerts/resolve/:ruleId', async (req, res) => {
  try {
    const { proactiveAlerts } = await import('./services/proactive-alerts.js');
    const { ruleId } = req.params;
    
    proactiveAlerts.resolveAlert(ruleId);
    res.json({ message: `Alert ${ruleId} resolved manually` });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

export { router as adminRoutes };