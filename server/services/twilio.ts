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
      console.log('SMS would be sent:', message);
      return false;
    }

    try {
      const result = await client.messages.create({
        body: message.body,
        from: phoneNumber,
        to: message.to,
      });
      
      console.log(`SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
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
