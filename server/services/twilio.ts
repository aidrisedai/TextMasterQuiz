import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;
const phoneNumber =
  process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error(
    "Twilio credentials not found. SMS functionality will not work.",
  );
}

const client = twilio(accountSid, authToken);

export interface SMSMessage {
  to: string;
  body: string;
}

export class TwilioService {
  private statusTimeouts = new Map<string, NodeJS.Timeout>();
  private lastSendTime = 0;
  private readonly RATE_LIMIT_MS = 1000; // 1 second between messages

  async sendSMS(message: SMSMessage): Promise<boolean> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;
    if (timeSinceLastSend < this.RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastSend));
    }
    this.lastSendTime = Date.now();

    // Message length validation
    if (message.body.length > 1600) {
      console.warn(`Message too long (${message.body.length} chars), truncating`);
      message.body = message.body.substring(0, 1597) + '...';
    }
    if (!accountSid || !authToken || !phoneNumber) {
      console.log("Missing Twilio credentials - SMS would be sent:", message);
      return false;
    }

    console.log("📱 SMS Message Ready:", {
      to: message.to,
      from: phoneNumber,
      message: message.body,
    });

    try {
      const result = await client.messages.create({
        body: message.body,
        from: phoneNumber,
        to: message.to,
      });

      console.log(`SMS queued: ${result.sid}`);

      // Check delivery status after a delay with cleanup
      const timeoutId = setTimeout(async () => {
        this.statusTimeouts.delete(result.sid);
        try {
          const status = await client.messages(result.sid).fetch();
          if (status.status === "delivered") {
            console.log(`✅ SMS delivered successfully to ${message.to}`);
          } else if (
            status.status === "failed" ||
            status.status === "undelivered"
          ) {
            console.log(`❌ SMS delivery failed to ${message.to}`);
            console.log(
              `Status: ${status.status}, Error: ${status.errorCode || "None"}`,
            );
            console.log(`📋 Message content: ${message.body}`);
            if (status.errorCode === 30032) {
              console.log(
                `💡 Toll-free number verification required - complete verification in Twilio Console`,
              );
              console.log(
                `   Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming`,
              );
            } else {
              console.log(
                `💡 The message would be delivered with proper phone number setup`,
              );
            }
          }
        } catch (e) {
          console.log(`📋 SMS content for ${message.to}: ${message.body}`);
        }
      }, 2000);
      
      this.statusTimeouts.set(result.sid, timeoutId);

      return true;
    } catch (error: any) {
      console.error("SMS error:", error.message);
      console.log(`📋 Would send to ${message.to}: ${message.body}`);
      return false;
    }
  }

  // Cleanup method for graceful shutdown
  cleanup() {
    this.statusTimeouts.forEach(timeout => clearTimeout(timeout));
    this.statusTimeouts.clear();
  }

  async sendDailyQuestion(
    phoneNumber: string,
    question: any,
    questionNumber: number,
  ): Promise<boolean> {
    const body = `🧠 Question #${questionNumber}: ${question.questionText}\n\nA) ${question.optionA}\nB) ${question.optionB}\nC) ${question.optionC}\nD) ${question.optionD}\n\nReply with A, B, C, or D`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendAnswerFeedback(
    phoneNumber: string,
    isCorrect: boolean,
    correctAnswer: string,
    explanation: string,
    streak: number,
    points: number,
    scoreMessage?: string,
  ): Promise<boolean> {
    const emoji = isCorrect ? "🎉" : "❌";
    const result = isCorrect
      ? "Correct!"
      : `Incorrect. The answer was ${correctAnswer}.`;

    const body = `${emoji} ${result}\n\n${explanation}\n\nStreak: ${streak} days ${streak > 0 ? "🔥" : ""}\n${scoreMessage || `Score: +${points} points`}\n\nText "SCORE" for stats or "HELP" for commands`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendStats(phoneNumber: string, stats: any): Promise<boolean> {
    const body = `📊 Your Text4Quiz Stats\n\nCurrent Streak: ${stats.currentStreak} days 🔥\nTotal Score: ${stats.totalScore} points\nQuestions Answered: ${stats.questionsAnswered}\nAccuracy Rate: ${stats.accuracyRate}%\n\nKeep up the great work!`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendHelp(phoneNumber: string): Promise<boolean> {
    const body = `📱 Text4Quiz Commands\n\nSCORE - View your stats\nMORE - Get bonus question (Premium)\nHELP - Show this help message\nSTOP - Unsubscribe from service\nRESTART - Resume after pause\n\nQuestions? Reply with your message.`;

    return this.sendSMS({ to: phoneNumber, body });
  }

  async sendWelcome(
    phoneNumber: string,
    preferredTime: string,
  ): Promise<boolean> {
    const body = `🎉 Welcome to Text4Quiz!\n\nYour first trivia question is being sent right now! 🧠\nStarting tomorrow, you'll receive daily questions at ${preferredTime}.\n\nText "HELP" anytime for commands.\nText "STOP" to unsubscribe.\n\nLet's see how much you know! 🎯`;

    return this.sendSMS({ to: phoneNumber, body });
  }
}

export const twilioService = new TwilioService();
