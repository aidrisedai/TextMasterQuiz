import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error('Twilio credentials not found. SMS functionality will not work.');
}

const client = twilio(accountSid, authToken);

export interface SMSMessage {
  to: string;
  body: string;
}

export class TwilioService {
  async sendSMS(message: SMSMessage): Promise<boolean> {
    if (!accountSid || !authToken || !phoneNumber) {
      console.log('Missing Twilio credentials - SMS would be sent:', message);
      return false;
    }

    console.log('📱 SMS Message Ready:', {
      to: message.to,
      from: phoneNumber,
      message: message.body
    });

    try {
      const result = await client.messages.create({
        body: message.body,
        from: phoneNumber,
        to: message.to,
      });
      
      console.log(`SMS queued: ${result.sid}`);
      
      // Check delivery status after a delay
      setTimeout(async () => {
        try {
          const status = await client.messages(result.sid).fetch();
          if (status.status === 'delivered') {
            console.log(`✅ SMS delivered successfully to ${message.to}`);
          } else if (status.status === 'failed' || status.status === 'undelivered') {
            console.log(`❌ SMS delivery failed (Trial account limitation)`);
            console.log(`📋 Message content: ${message.body}`);
            console.log(`💡 The message would be delivered on a paid Twilio account`);
          }
        } catch (e) {
          console.log(`📋 SMS content for ${message.to}: ${message.body}`);
        }
      }, 2000);
      
      return true;
    } catch (error: any) {
      console.error('SMS error:', error.message);
      console.log(`📋 Would send to ${message.to}: ${message.body}`);
      return false;
    }
  }

  async sendDailyQuestion(phoneNumber: string, question: any, questionNumber: number): Promise<boolean> {
    const body = `🧠 Question #${questionNumber}: ${question.questionText}

A) ${question.optionA}
B) ${question.optionB}
C) ${question.optionC}
D) ${question.optionD}

Reply with A, B, C, or D`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendAnswerFeedback(phoneNumber: string, isCorrect: boolean, correctAnswer: string, explanation: string, streak: number, points: number): Promise<boolean> {
    const emoji = isCorrect ? '🎉' : '❌';
    const result = isCorrect ? 'Correct!' : `Incorrect. The answer was ${correctAnswer}.`;
    
    const body = `${emoji} ${result}

${explanation}

Streak: ${streak} days ${streak > 0 ? '🔥' : ''}
Score: +${points} points

Text "SCORE" for stats or "HELP" for commands`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendStats(phoneNumber: string, stats: any): Promise<boolean> {
    const body = `📊 Your Text4Quiz Stats

Current Streak: ${stats.currentStreak} days 🔥
Total Score: ${stats.totalScore} points
Questions Answered: ${stats.questionsAnswered}
Accuracy Rate: ${stats.accuracyRate}%

Keep up the great work!`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendHelp(phoneNumber: string): Promise<boolean> {
    const body = `📱 Text4Quiz Commands

SCORE - View your stats
MORE - Get bonus question (Premium)
HELP - Show this help message
STOP - Unsubscribe from service
RESTART - Resume after pause

Questions? Reply with your message.`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendWelcome(phoneNumber: string, preferredTime: string): Promise<boolean> {
    const body = `🎉 Welcome to Text4Quiz!

You'll receive your first trivia question tomorrow at ${preferredTime}.

Text "HELP" anytime for commands.
Text "STOP" to unsubscribe.

Get ready to learn something new every day! 🧠`;

    return this.sendSMS({ to: phoneNumber, body });
  }
}

export const twilioService = new TwilioService();
