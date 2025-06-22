// Quick test to verify Twilio SMS functionality
import { twilioService } from './server/services/twilio.js';

async function testSMS() {
  console.log('Testing SMS functionality...');
  
  const testMessage = {
    to: '+15551234567', // Replace with your phone number for testing
    body: '🧠 Test message from Text4Quiz! Your SMS integration is working perfectly.'
  };
  
  const result = await twilioService.sendSMS(testMessage);
  console.log('SMS test result:', result);
}

testSMS();