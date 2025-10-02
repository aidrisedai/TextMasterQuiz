#!/usr/bin/env node

// Comprehensive debugging script for send-question endpoint
console.log('🔍 Testing send-question endpoint components...');

// Test environment variables first
console.log('\n1. Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'); 
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✅ Set' : '❌ Missing');

async function testComponents() {
  try {
    // Test database connection
    console.log('\n2. Testing Database Connection:');
    const { storage } = await import('./dist/index.js');
    await storage.testConnection();
    console.log('✅ Database connection successful');
    
    // Test getting user
    console.log('\n3. Testing User Lookup:');
    const phoneNumber = '+15153570454';
    const user = await storage.getUserByPhoneNumber(phoneNumber);
    if (user) {
      console.log('✅ User found:', {
        id: user.id,
        phoneNumber: user.phoneNumber,
        questionsAnswered: user.questionsAnswered,
        isActive: user.isActive
      });
    } else {
      console.log('❌ User not found');
      return;
    }
    
    // Test getting pending answers
    console.log('\n4. Testing Pending Answers Check:');
    const pendingAnswers = await storage.getPendingUserAnswers(user.id);
    console.log(`📋 Pending answers: ${pendingAnswers.length}`);
    if (pendingAnswers.length > 0) {
      console.log('Pending answers:', pendingAnswers.map(p => ({
        id: p.id,
        questionId: p.questionId,
        userAnswer: p.userAnswer
      })));
    }
    
    // Test getting a question
    console.log('\n5. Testing Question Retrieval:');
    const question = await storage.getRandomQuestion(['general', 'science', 'history'], []);
    if (question) {
      console.log('✅ Question retrieved:', {
        id: question.id,
        questionText: question.questionText.substring(0, 50) + '...',
        category: question.category
      });
    } else {
      console.log('❌ No question available');
      return;
    }
    
    // Test Twilio service (without sending)
    console.log('\n6. Testing Twilio Service:');
    const { twilioService } = await import('./dist/index.js');
    console.log('✅ Twilio service imported successfully');
    
    // Test record answer (the critical part)
    console.log('\n7. Testing Record Answer (CRITICAL):');
    try {
      const testAnswer = {
        userId: user.id,
        questionId: question.id,
        userAnswer: null, // This makes it pending
        isCorrect: false,
        pointsEarned: 0,
      };
      
      console.log('Attempting to create pending answer with:', testAnswer);
      
      const result = await storage.recordAnswer(testAnswer);
      console.log('✅ Pending answer created successfully:', result);
      
      // Verify it was created
      const newPendingAnswers = await storage.getPendingUserAnswers(user.id);
      console.log(`✅ Verification: ${newPendingAnswers.length} pending answers now exist`);
      
    } catch (recordError) {
      console.log('❌ Record answer failed:', recordError.message);
      console.log('Stack trace:', recordError.stack);
    }
    
    console.log('\n8. Final Status:');
    console.log('All components tested. If record answer succeeded, the endpoint should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testComponents().catch(console.error);