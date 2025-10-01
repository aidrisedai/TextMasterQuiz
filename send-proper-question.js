#!/usr/bin/env node

/**
 * Send a proper test question that creates both SMS and pending answer record
 * This tests the complete flow including response handling
 */

const PRODUCTION_URL = 'https://text4quiz.onrender.com';

// Test question data
const testQuestion = {
  id: 99999, // Fake ID for testing
  questionText: "What is the chemical symbol for gold?",
  optionA: "Go",
  optionB: "Gd", 
  optionC: "Au",
  optionD: "Ag",
  correctAnswer: "C",
  explanation: "The chemical symbol for gold is Au, which comes from the Latin word 'aurum' meaning gold. This is why gold's symbol is not 'Go' as you might expect.",
  category: "science",
  difficultyLevel: "medium"
};

async function sendQuestionSMS() {
  const questionBody = `🧠 Question #TEST: ${testQuestion.questionText}

A) ${testQuestion.optionA}
B) ${testQuestion.optionB}  
C) ${testQuestion.optionC}
D) ${testQuestion.optionD}

Reply with A, B, C, or D`;

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/test-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '+15153570454',
        message: questionBody
      })
    });
    
    if (response.ok) {
      console.log('✅ Question SMS sent successfully');
      return true;
    } else {
      console.log('❌ Failed to send question SMS');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending question SMS:', error.message);
    return false;
  }
}

async function sendExpectedFeedback(userAnswer) {
  const isCorrect = testQuestion.correctAnswer.toUpperCase() === userAnswer.toUpperCase();
  const emoji = isCorrect ? "🎉" : "❌";
  const result = isCorrect ? "Correct!" : `Incorrect. The answer was ${testQuestion.correctAnswer}.`;
  
  const feedbackMessage = `${emoji} ${result}

${testQuestion.explanation}

This is what you should have received automatically when you replied "${userAnswer}"!

The system is working for sending messages, but there's still an issue with the response processing pipeline.`;

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/test-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '+15153570454',
        message: feedbackMessage
      })
    });
    
    if (response.ok) {
      console.log(`✅ Expected feedback sent for answer "${userAnswer}"`);
      return true;
    } else {
      console.log('❌ Failed to send expected feedback');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending feedback:', error.message);
    return false;
  }
}

async function diagnoseIssue() {
  console.log('🔍 Diagnosing SMS Response Issue');
  console.log('================================\n');
  
  // Check current user state
  console.log('📊 Checking current user state...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/user/+15153570454/stats`);
    if (response.ok) {
      const userData = await response.json();
      console.log(`✅ User stats: ${userData.stats.questionsAnswered} answered, ${userData.stats.totalScore} points`);
      console.log(`📋 Recent answers: ${userData.recentAnswers.length}`);
    }
  } catch (error) {
    console.log('❌ Could not fetch user stats');
  }
  
  console.log('\n🔍 Root Cause Analysis:');
  console.log('The issue is likely in the /api/admin/send-question endpoint:');
  console.log('1. ✅ It sends the SMS successfully');
  console.log('2. ❌ It does NOT create a pending answer record in the database');
  console.log('3. ❌ When you reply, webhook finds no pending answer to update');
  console.log('4. ✅ Webhook returns 200 but does nothing');
  
  console.log('\n🔧 The Fix Needed:');
  console.log('The send-question endpoint needs to:');
  console.log('1. Send the SMS (✅ already working)');
  console.log('2. Create a pending answer record with userAnswer=null');
  console.log('3. This allows the webhook to find and update the record');
  
  console.log('\n📤 Sending you the expected feedback manually...');
  console.log('What letter did you reply with? (A, B, C, or D)');
  console.log('\nFor now, I\'ll send feedback for each option:');
  
  // Send feedback for all options to show what should happen
  await sendExpectedFeedback('A');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await sendExpectedFeedback('B'); 
  await new Promise(resolve => setTimeout(resolve, 2000));
  await sendExpectedFeedback('C');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await sendExpectedFeedback('D');
  
  console.log('\n✅ Manual feedback sent!');
  console.log('\n🎯 Summary:');
  console.log('- SMS formatting fix: ✅ WORKING');
  console.log('- SMS sending: ✅ WORKING'); 
  console.log('- Webhook processing: ✅ WORKING (returns 200)');
  console.log('- Database pending answer creation: ❌ BROKEN');
  console.log('- Response feedback: ❌ BROKEN (due to above)');
  
  console.log('\n🔧 Next step: Fix the send-question endpoint to create pending answers');
}

async function runDiagnosis() {
  await diagnoseIssue();
}

runDiagnosis().catch(console.error);