#!/usr/bin/env node

/**
 * Fix Missed Responses Script
 * 
 * Identifies users who answered questions but never received proper feedback
 * due to the previous SMS response handling bug, and sends them belated feedback.
 */

import { storage } from '../server/storage.js';
import { twilioService } from '../server/services/twilio.js';

async function findUsersWithMissedResponses() {
  console.log('🔍 Finding users who answered questions but may not have received feedback...');
  
  try {
    // Get all users
    const allUsers = await storage.getAllUsers();
    console.log(`📊 Found ${allUsers.length} total users`);
    
    const usersWithMissedResponses = [];
    
    for (const user of allUsers) {
      // Get all answers for this user
      const userAnswers = await storage.getUserAnswers(user.id, 50);
      
      if (userAnswers.length === 0) continue;
      
      // Look for answers where user provided a response but might not have gotten feedback
      const answeredQuestions = userAnswers.filter(answer => 
        answer.userAnswer !== null && 
        answer.userAnswer !== undefined &&
        answer.answeredAt
      );
      
      if (answeredQuestions.length > 0) {
        // Check if user has recent activity vs when they last answered
        const lastAnswered = new Date(answeredQuestions[0].answeredAt);
        const timeSinceLastAnswer = Date.now() - lastAnswered.getTime();
        const daysSinceLastAnswer = Math.floor(timeSinceLastAnswer / (1000 * 60 * 60 * 24));
        
        // If they answered questions but stats show 0 or very low activity, 
        // they might not have received proper feedback
        const statsGap = answeredQuestions.length > user.questionsAnswered;
        
        if (statsGap || daysSinceLastAnswer > 2) {
          usersWithMissedResponses.push({
            user,
            answeredQuestions: answeredQuestions.length,
            recordedQuestions: user.questionsAnswered,
            lastAnswered,
            daysSinceLastAnswer,
            recentAnswers: answeredQuestions.slice(0, 3),
            statsGap
          });
        }
      }
    }
    
    return usersWithMissedResponses;
  } catch (error) {
    console.error('❌ Error finding users with missed responses:', error);
    return [];
  }
}

async function sendBelatedFeedback(userInfo) {
  const { user, recentAnswers } = userInfo;
  
  console.log(`📤 Sending belated feedback to ${user.phoneNumber}...`);
  
  try {
    // Send an apology message with their most recent answer feedback
    const recentAnswer = recentAnswers[0];
    const question = recentAnswer.question;
    
    if (!question) {
      console.log(`⚠️  No question found for recent answer, skipping ${user.phoneNumber}`);
      return false;
    }
    
    // Determine if their answer was correct
    const isCorrect = question.correctAnswer.toUpperCase() === recentAnswer.userAnswer?.toUpperCase();
    
    // Send apology + feedback message
    const apologyMessage = `🙏 Sorry for the delay! Here's feedback on your recent answer:

${recentAnswer.userAnswer?.toUpperCase()}) ${isCorrect ? 'Correct! 🎉' : `Incorrect. The answer was ${question.correctAnswer}.`}

${question.explanation || 'Great question! Keep playing to improve your knowledge.'}

We've fixed our response system - you'll now get instant feedback on future questions!

Text "SCORE" for your current stats.`;

    const sent = await twilioService.sendSMS({
      to: user.phoneNumber,
      body: apologyMessage
    });
    
    if (sent) {
      console.log(`✅ Belated feedback sent to ${user.phoneNumber}`);
      return true;
    } else {
      console.log(`❌ Failed to send feedback to ${user.phoneNumber}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error sending belated feedback to ${user.phoneNumber}:`, error);
    return false;
  }
}

async function runMissedResponsesFix() {
  console.log('🚀 Starting Missed Responses Fix...\n');
  
  try {
    // Test database connection
    await storage.testConnection();
    console.log('✅ Database connected\n');
    
    // Find users with missed responses
    const missedUsers = await findUsersWithMissedResponses();
    
    if (missedUsers.length === 0) {
      console.log('🎉 Great! No users found with missed responses.');
      console.log('All users appear to have received proper feedback.');
      return;
    }
    
    console.log(`📋 Found ${missedUsers.length} users who may have missed feedback:\n`);
    
    // Display summary
    for (const userInfo of missedUsers) {
      console.log(`👤 ${userInfo.user.phoneNumber}:`);
      console.log(`   - Answered ${userInfo.answeredQuestions} questions`);
      console.log(`   - Stats show ${userInfo.user.questionsAnswered} questions`);
      console.log(`   - Last answered: ${userInfo.daysSinceLastAnswer} days ago`);
      console.log(`   - Recent question: "${userInfo.recentAnswers[0]?.question?.questionText?.substring(0, 50)}..."`);
      console.log(`   - Their answer: ${userInfo.recentAnswers[0]?.userAnswer}`);
      console.log('');
    }
    
    // Ask for confirmation before sending messages
    console.log('🤔 Would you like to send belated feedback to these users?');
    console.log('This will:');
    console.log('  - Send an apology for the delayed response');
    console.log('  - Provide feedback on their most recent answer');
    console.log('  - Explain that the issue has been fixed');
    console.log('');
    console.log('⚠️  This is a one-time fix to help users affected by the previous bug.');
    console.log('');
    
    // For now, just show what would be sent (safer approach)
    console.log('📝 Sample message that would be sent:');
    if (missedUsers.length > 0) {
      const sampleUser = missedUsers[0];
      const sampleAnswer = sampleUser.recentAnswers[0];
      const sampleQuestion = sampleAnswer.question;
      const isCorrect = sampleQuestion?.correctAnswer?.toUpperCase() === sampleAnswer.userAnswer?.toUpperCase();
      
      console.log('━'.repeat(60));
      console.log(`To: ${sampleUser.user.phoneNumber}`);
      console.log('Message:');
      console.log(`🙏 Sorry for the delay! Here's feedback on your recent answer:

${sampleAnswer.userAnswer?.toUpperCase()}) ${isCorrect ? 'Correct! 🎉' : `Incorrect. The answer was ${sampleQuestion?.correctAnswer}.`}

${sampleQuestion?.explanation || 'Great question! Keep playing to improve your knowledge.'}

We've fixed our response system - you'll now get instant feedback on future questions!

Text "SCORE" for your current stats.`);
      console.log('━'.repeat(60));
    }
    
    console.log('\n💡 To actually send these messages, uncomment the sending code in the script.');
    console.log('🔧 The response handling is now fixed for all future questions.');
    
    // Uncomment these lines to actually send the messages:
    /*
    let successCount = 0;
    for (const userInfo of missedUsers) {
      const sent = await sendBelatedFeedback(userInfo);
      if (sent) successCount++;
      
      // Rate limiting - wait 2 seconds between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Results: ${successCount}/${missedUsers.length} messages sent successfully`);
    */
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Export for use in other scripts
export { findUsersWithMissedResponses, sendBelatedFeedback };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMissedResponsesFix().catch(console.error);
}