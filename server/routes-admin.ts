// Admin routes for managing questions and system
import { Router } from 'express';
import { twilioService } from './services/twilio.js';
import { storage } from './storage.js';
import { generateAllQuestions, generateQuestionsForCategory } from './scripts/generate-questions.js';
import { geminiService } from './services/gemini.js';
import { insertGenerationJobSchema } from '@shared/schema';

const router = Router();

// Note: Admin authentication middleware is applied at the app level in routes.ts

// Generate questions for all categories
router.post('/generate-questions', async (req, res) => {
  try {
    console.log('Starting bulk question generation...');
    
    // Run generation in background
    generateAllQuestions().catch(console.error);
    
    res.json({ 
      message: 'Question generation started',
      note: 'Check server logs for progress. This will take several minutes.'
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
    
    console.log(`Generating ${count} questions for category: ${category}`);
    
    // Run generation in background
    generateQuestionsForCategory(category, count).catch(console.error);
    
    res.json({ 
      message: `Generating ${count} questions for ${category}`,
      note: 'Check server logs for progress'
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
        difficultyLevel: question.difficultyLevel,
        timesUsed: 0
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
    const categoryStats = {};
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

export { router as adminRoutes };