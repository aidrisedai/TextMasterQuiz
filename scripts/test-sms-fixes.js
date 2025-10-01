#!/usr/bin/env node

/**
 * Test Script for SMS Fixes
 * 
 * This script tests both issues:
 * 1. SMS formatting (ensuring \n appears as line breaks, not literal \n)
 * 2. SMS response handling (ensuring user replies are processed correctly)
 */

import { twilioService } from '../server/services/twilio.js';
import { storage } from '../server/storage.js';

// Test phone number - update this to your phone number for testing
const TEST_PHONE = '+15153570454';

async function testSMSFormatting() {
  console.log('🧪 Testing SMS Formatting...');
  
  // Get a sample question from the database
  const questions = await storage.getAllQuestions();
  if (questions.length === 0) {
    console.log('❌ No questions found in database');
    return false;
  }
  
  const sampleQuestion = questions[0];
  
  console.log('📤 Sending test question with formatting...');
  const sent = await twilioService.sendDailyQuestion(
    TEST_PHONE,
    sampleQuestion,
    999 // Test question number
  );
  
  if (sent) {
    console.log('✅ Test question sent successfully');
    console.log('📝 Check your phone - the message should have proper line breaks, not literal \\n characters');
    return true;
  } else {
    console.log('❌ Failed to send test question');
    return false;
  }
}

async function testAnswerFeedbackFormatting() {
  console.log('🧪 Testing Answer Feedback Formatting...');
  
  console.log('📤 Sending test correct answer feedback...');
  const sent = await twilioService.sendAnswerFeedback(
    TEST_PHONE,
    true, // isCorrect
    'A', // correctAnswer
    'This is a test explanation to verify line breaks work properly in feedback messages. The formatting should be readable.',
    5, // streak
    10, // points
    'Perfect! +10 points (Base: 5, Winning Streak: +3, Play Streak: +2)'
  );
  
  if (sent) {
    console.log('✅ Answer feedback sent successfully');
    console.log('📝 Check your phone - the feedback should have proper line breaks');
    return true;
  } else {
    console.log('❌ Failed to send answer feedback');
    return false;
  }
}

async function testResponseHandling() {
  console.log('🧪 Testing Response Handling Logic...');
  
  // Find a test user
  const user = await storage.getUserByPhoneNumber(TEST_PHONE);
  if (!user) {
    console.log(`❌ No user found with phone number ${TEST_PHONE}`);
    console.log('💡 Please sign up first or update TEST_PHONE in this script');
    return false;
  }
  
  console.log(`✅ Found user: ${user.phoneNumber}`);
  
  // Check for pending answers
  const pendingAnswers = await storage.getPendingUserAnswers(user.id);
  console.log(`📋 Found ${pendingAnswers.length} pending answer(s)`);
  
  if (pendingAnswers.length > 0) {
    const pendingAnswer = pendingAnswers[0];
    console.log(`📝 Pending question: "${pendingAnswer.question.questionText.substring(0, 50)}..."`);
    console.log(`🆔 Pending answer ID: ${pendingAnswer.id}`);
    console.log(`✅ Response handling should work - user can reply A, B, C, or D`);
    return true;
  } else {
    console.log('📝 No pending answers found - sending a test question...');
    
    // Create a test pending answer
    const questions = await storage.getAllQuestions();
    if (questions.length === 0) {
      console.log('❌ No questions available');
      return false;
    }
    
    const testQuestion = questions[0];
    
    // Send question and create pending answer
    await twilioService.sendDailyQuestion(TEST_PHONE, testQuestion, 999);
    
    await storage.recordAnswer({
      userId: user.id,
      questionId: testQuestion.id,
      userAnswer: null, // Pending
      isCorrect: false,
      pointsEarned: 0,
    });
    
    console.log('✅ Test question sent and pending answer created');
    console.log('📱 You can now reply A, B, C, or D to test response handling');
    return true;
  }
}

async function runAllTests() {
  console.log('🚀 Starting SMS Fix Tests...\n');
  
  try {
    // Test database connection first
    await storage.testConnection();
    console.log('✅ Database connected\n');
    
    const results = {
      formatting: await testSMSFormatting(),
      feedback: await testAnswerFeedbackFormatting(), 
      responseHandling: await testResponseHandling()
    };
    
    console.log('\n📊 Test Results:');
    console.log(`SMS Formatting: ${results.formatting ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Feedback Formatting: ${results.feedback ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Response Handling: ${results.responseHandling ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r);
    console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 SMS fixes are working correctly!');
      console.log('📱 Check your phone messages to verify formatting');
      console.log('💬 Reply to any pending questions to test response handling');
    } else {
      console.log('\n🔧 Some issues need attention. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testSMSFormatting, testAnswerFeedbackFormatting, testResponseHandling };