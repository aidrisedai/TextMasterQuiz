// Direct SMS test script for debugging Twilio issues
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Testing Twilio SMS with:');
console.log('From:', fromNumber);
console.log('To: +15153570454');

const client = twilio(accountSid, authToken);

async function testSMS() {
  try {
    const message = await client.messages.create({
      body: 'Direct test from Text4Quiz - Reply OK if received',
      from: fromNumber,
      to: '+15153570454'
    });
    
    console.log('Success! Message SID:', message.sid);
    console.log('Status:', message.status);
    
    // Wait and check final status
    setTimeout(async () => {
      const final = await client.messages(message.sid).fetch();
      console.log('Final status:', final.status);
      if (final.errorCode) {
        console.log('Error code:', final.errorCode);
        console.log('Error message:', final.errorMessage);
      }
    }, 5000);
    
  } catch (error) {
    console.error('SMS failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testSMS();