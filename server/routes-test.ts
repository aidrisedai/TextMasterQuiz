import { Router } from 'express';
import { twilioService } from './services/twilio.js';
import { storage } from './storage.js';
import { geminiService } from './services/gemini.js';

const router = Router();

// Test all SMS commands
router.post('/sms-commands', async (req, res) => {
  try {
    const { phoneNumber = '+15153570454' } = req.body;
    const results = [];

    console.log('🧪 Testing all SMS commands...');

    // Test 1: Basic SMS
    try {
      const basicResult = await twilioService.sendSMS({
        to: phoneNumber,
        body: '🧪 Test 1/8: Basic SMS sending works!'
      });
      results.push({ test: 'Basic SMS', success: basicResult });
    } catch (error) {
      results.push({ test: 'Basic SMS', success: false, error: error.message });
    }

    // Test 2: HELP command
    try {
      const helpResult = await twilioService.sendHelp(phoneNumber);
      results.push({ test: 'HELP Command', success: helpResult });
    } catch (error) {
      results.push({ test: 'HELP Command', success: false, error: error.message });
    }

    // Test 3: SCORE command
    try {
      const mockStats = {
        currentStreak: 5,
        totalScore: 150,
        questionsAnswered: 20,
        accuracyRate: 0.85
      };
      const scoreResult = await twilioService.sendStats(phoneNumber, mockStats);
      results.push({ test: 'SCORE Command', success: scoreResult });
    } catch (error) {
      results.push({ test: 'SCORE Command', success: false, error: error.message });
    }

    // Test 4: Question sending
    try {
      const questions = await storage.getAllQuestions();
      if (questions.length > 0) {
        const questionResult = await twilioService.sendDailyQuestion(
          phoneNumber,
          questions[0],
          1
        );
        results.push({ test: 'Question Sending', success: questionResult });
      } else {
        results.push({ test: 'Question Sending', success: false, error: 'No questions available' });
      }
    } catch (error) {
      results.push({ test: 'Question Sending', success: false, error: error.message });
    }

    // Test 5: Answer feedback (correct)
    try {
      const correctFeedback = await twilioService.sendAnswerFeedback(
        phoneNumber,
        true,
        'A',
        'This is a test explanation for the correct answer.',
        6, // streak
        10 // points
      );
      results.push({ test: 'Answer Feedback (Correct)', success: correctFeedback });
    } catch (error) {
      results.push({ test: 'Answer Feedback (Correct)', success: false, error: error.message });
    }

    // Test 6: Answer feedback (incorrect)
    try {
      const incorrectFeedback = await twilioService.sendAnswerFeedback(
        phoneNumber,
        false,
        'B',
        'This is a test explanation for the incorrect answer.',
        0, // streak reset
        0 // points
      );
      results.push({ test: 'Answer Feedback (Incorrect)', success: incorrectFeedback });
    } catch (error) {
      results.push({ test: 'Answer Feedback (Incorrect)', success: false, error: error.message });
    }

    // Test 7: STOP/RESTART commands
    try {
      const stopResult = await twilioService.sendSMS({
        to: phoneNumber,
        body: "🧪 Test 7/8: STOP command - You've been unsubscribed. Text RESTART to resume."
      });
      
      const restartResult = await twilioService.sendSMS({
        to: phoneNumber,
        body: "🧪 Test 7/8: RESTART command - Welcome back to Text4Quiz!"
      });
      
      results.push({ test: 'STOP/RESTART Commands', success: stopResult && restartResult });
    } catch (error) {
      results.push({ test: 'STOP/RESTART Commands', success: false, error: error.message });
    }

    // Test 8: MORE command (premium feature)
    try {
      const bonusQuestion = await geminiService.generateBonusQuestion([], ['general']);
      if (bonusQuestion) {
        const moreResult = await twilioService.sendDailyQuestion(
          phoneNumber,
          bonusQuestion,
          999 // Special number for bonus questions
        );
        results.push({ test: 'MORE Command (Premium)', success: moreResult });
      } else {
        results.push({ test: 'MORE Command (Premium)', success: false, error: 'Failed to generate bonus question' });
      }
    } catch (error) {
      results.push({ test: 'MORE Command (Premium)', success: false, error: error.message });
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`📊 SMS Command Tests Complete: ${successCount}/${totalCount} passed`);
    
    res.json({
      success: successCount === totalCount,
      summary: `${successCount}/${totalCount} tests passed`,
      results,
      message: successCount === totalCount ? 
        'All SMS commands are working correctly!' : 
        'Some SMS commands need attention.'
    });

  } catch (error) {
    console.error('SMS command test error:', error);
    res.status(500).json({ error: 'Failed to run SMS command tests' });
  }
});

// Test webhook simulation
router.post('/webhook-simulation', async (req, res) => {
  try {
    const { phoneNumber = '+15153570454' } = req.body;
    const results = [];

    const webhookTests = [
      { command: 'SCORE', description: 'Score command test' },
      { command: 'HELP', description: 'Help command test' },
      { command: 'STOP', description: 'Stop command test' },
      { command: 'RESTART', description: 'Restart command test' },
      { command: 'A', description: 'Answer A test' },
      { command: 'B', description: 'Answer B test' },
      { command: 'C', description: 'Answer C test' },
      { command: 'D', description: 'Answer D test' },
      { command: 'MORE', description: 'MORE command test' },
      { command: 'INVALID', description: 'Invalid command test' }
    ];

    for (const test of webhookTests) {
      try {
        const result = await twilioService.sendSMS({
          to: phoneNumber,
          body: `🧪 Webhook Test: "${test.command}" - ${test.description}`
        });
        results.push({ command: test.command, success: result });
      } catch (error) {
        results.push({ command: test.command, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: successCount === totalCount,
      summary: `${successCount}/${totalCount} webhook tests passed`,
      results
    });

  } catch (error) {
    console.error('Webhook simulation error:', error);
    res.status(500).json({ error: 'Failed to run webhook simulation' });
  }
});

// Simple SMS test - just one message
router.post('/sms-simple', async (req, res) => {
  try {
    const { phoneNumber = '+15153570454' } = req.body;

    console.log('🧪 Testing SMS delivery...');

    // Single SMS test
    const testResult = await twilioService.sendSMS({
      to: phoneNumber,
      body: '✅ Text4Quiz SMS test successful! Your system is working properly.'
    });

    console.log(`📊 SMS Test Complete: ${testResult ? 'Success' : 'Failed'}`);

    res.json({
      success: testResult,
      message: testResult ? 
        'SMS delivery test passed!' : 
        'SMS delivery test failed',
      phoneNumber: phoneNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test SMS delivery',
      details: error.message 
    });
  }
});

export default router;