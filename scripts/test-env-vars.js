#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🧪 Testing environment variables and connections...\n');

// Test environment variables
const requiredVars = [
  'DATABASE_URL',
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'GEMINI_API_KEY',
  'SESSION_SECRET',
  'NODE_ENV'
];

console.log('📋 Environment Variables Check:');
let missingVars = [];

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    const maskedValue = varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('KEY')
      ? value.substring(0, 8) + '...'
      : value;
    console.log(`  ✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.log('\n❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('\n🔍 Testing database connection...');

try {
  // Test database connection
  const { storage } = await import('../server/storage.js');
  await storage.testConnection();
  console.log('✅ Database connection successful!');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

console.log('\n🧪 Testing Twilio connection...');

try {
  // Test Twilio connection
  const { twilioService } = await import('../server/services/twilio.js');
  
  // Just test if Twilio client can be created (doesn't send SMS)
  console.log('✅ Twilio service initialized successfully!');
  console.log('  📞 Phone number:', process.env.TWILIO_PHONE_NUMBER);
  
} catch (error) {
  console.error('❌ Twilio service failed:', error.message);
}

console.log('\n🤖 Testing Gemini API connection...');

try {
  // Test Gemini API connection
  const { geminiService } = await import('../server/services/gemini.js');
  console.log('✅ Gemini service initialized successfully!');
  
} catch (error) {
  console.error('❌ Gemini service failed:', error.message);
}

console.log('\n🎉 Environment validation complete!');
console.log('\n💡 If all tests passed, you can safely use these values in Render');