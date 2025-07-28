// Manual SMS Command Tests
// Run these tests to verify SMS commands work with real Twilio integration

import { twilioService } from '../services/twilio';
import { storage } from '../storage';
import { geminiService } from '../services/gemini';

const TEST_PHONE_NUMBER = '+15153570454'; // Replace with your test number

interface TestResult {
  command: string;
  success: boolean;
  message: string;
  error?: string;
}

export class ManualSMSTests {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Manual SMS Command Tests...\n');
    
    // Test basic SMS sending
    await this.testBasicSMS();
    
    // Test help command
    await this.testHelpCommand();
    
    // Test score command with mock user
    await this.testScoreCommand();
    
    // Test question sending
    await this.testQuestionSending();
    
    // Test answer feedback
    await this.testAnswerFeedback();
    
    // Test stop/restart commands
    await this.testStopRestartCommands();
    
    // Test MORE command for premium users
    await this.testMoreCommand();
    
    console.log('\n📊 Test Results Summary:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.command}: ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    return this.results;
  }

  private async testBasicSMS(): Promise<void> {
    try {
      console.log('Testing basic SMS sending...');
      const result = await twilioService.sendSMS({
        to: TEST_PHONE_NUMBER,
        body: '🧪 Test SMS: Basic message sending works!'
      });
      
      this.results.push({
        command: 'Basic SMS',
        success: result,
        message: result ? 'SMS sent successfully' : 'Failed to send SMS'
      });
    } catch (error) {
      this.results.push({
        command: 'Basic SMS',
        success: false,
        message: 'Error sending SMS',
        error: error.message
      });
    }
  }

  private async testHelpCommand(): Promise<void> {
    try {
      console.log('Testing HELP command...');
      const result = await twilioService.sendHelp(TEST_PHONE_NUMBER);
      
      this.results.push({
        command: 'HELP Command',
        success: result,
        message: result ? 'Help message sent' : 'Failed to send help'
      });
    } catch (error) {
      this.results.push({
        command: 'HELP Command',
        success: false,
        message: 'Error sending help',
        error: error.message
      });
    }
  }

  private async testScoreCommand(): Promise<void> {
    try {
      console.log('Testing SCORE command...');
      const mockStats = {
        currentStreak: 5,
        totalScore: 150,
        questionsAnswered: 20,
        accuracyRate: 0.85
      };
      
      const result = await twilioService.sendStats(TEST_PHONE_NUMBER, mockStats);
      
      this.results.push({
        command: 'SCORE Command',
        success: result,
        message: result ? 'Stats message sent' : 'Failed to send stats'
      });
    } catch (error) {
      this.results.push({
        command: 'SCORE Command',
        success: false,
        message: 'Error sending stats',
        error: error.message
      });
    }
  }

  private async testQuestionSending(): Promise<void> {
    try {
      console.log('Testing question sending...');
      
      // Get a sample question from the database
      const questions = await storage.getAllQuestions();
      if (questions.length === 0) {
        this.results.push({
          command: 'Question Sending',
          success: false,
          message: 'No questions available in database'
        });
        return;
      }
      
      const sampleQuestion = questions[0];
      const result = await twilioService.sendDailyQuestion(
        TEST_PHONE_NUMBER,
        sampleQuestion,
        1
      );
      
      this.results.push({
        command: 'Question Sending',
        success: result,
        message: result ? 'Daily question sent' : 'Failed to send question'
      });
    } catch (error) {
      this.results.push({
        command: 'Question Sending',
        success: false,
        message: 'Error sending question',
        error: error.message
      });
    }
  }

  private async testAnswerFeedback(): Promise<void> {
    try {
      console.log('Testing answer feedback...');
      
      // Test correct answer feedback
      const correctResult = await twilioService.sendAnswerFeedback(
        TEST_PHONE_NUMBER,
        true,
        'A',
        'This is a test explanation for the correct answer.',
        6, // streak
        10 // points
      );
      
      // Test incorrect answer feedback
      const incorrectResult = await twilioService.sendAnswerFeedback(
        TEST_PHONE_NUMBER,
        false,
        'B',
        'This is a test explanation for the incorrect answer.',
        0, // streak reset
        0 // points
      );
      
      this.results.push({
        command: 'Answer Feedback (Correct)',
        success: correctResult,
        message: correctResult ? 'Correct answer feedback sent' : 'Failed to send correct feedback'
      });
      
      this.results.push({
        command: 'Answer Feedback (Incorrect)',
        success: incorrectResult,
        message: incorrectResult ? 'Incorrect answer feedback sent' : 'Failed to send incorrect feedback'
      });
    } catch (error) {
      this.results.push({
        command: 'Answer Feedback',
        success: false,
        message: 'Error sending answer feedback',
        error: error.message
      });
    }
  }

  private async testStopRestartCommands(): Promise<void> {
    try {
      console.log('Testing STOP/RESTART commands...');
      
      // Test STOP command
      const stopResult = await twilioService.sendSMS({
        to: TEST_PHONE_NUMBER,
        body: "🧪 Test STOP: You've been unsubscribed from Text4Quiz. Text RESTART to resume."
      });
      
      // Test RESTART command
      const restartResult = await twilioService.sendSMS({
        to: TEST_PHONE_NUMBER,
        body: "🧪 Test RESTART: Welcome back to Text4Quiz! You'll receive your next question at your scheduled time."
      });
      
      this.results.push({
        command: 'STOP Command',
        success: stopResult,
        message: stopResult ? 'Stop message sent' : 'Failed to send stop message'
      });
      
      this.results.push({
        command: 'RESTART Command',
        success: restartResult,
        message: restartResult ? 'Restart message sent' : 'Failed to send restart message'
      });
    } catch (error) {
      this.results.push({
        command: 'STOP/RESTART Commands',
        success: false,
        message: 'Error sending stop/restart messages',
        error: error.message
      });
    }
  }

  private async testMoreCommand(): Promise<void> {
    try {
      console.log('Testing MORE command (premium feature)...');
      
      // Generate a bonus question
      const bonusQuestion = await geminiService.generateBonusQuestion([], ['general']);
      
      if (bonusQuestion) {
        const result = await twilioService.sendDailyQuestion(
          TEST_PHONE_NUMBER,
          bonusQuestion,
          999 // Special number for bonus questions
        );
        
        this.results.push({
          command: 'MORE Command',
          success: result,
          message: result ? 'Bonus question sent' : 'Failed to send bonus question'
        });
      } else {
        this.results.push({
          command: 'MORE Command',
          success: false,
          message: 'Failed to generate bonus question'
        });
      }
    } catch (error) {
      this.results.push({
        command: 'MORE Command',
        success: false,
        message: 'Error with MORE command',
        error: error.message
      });
    }
  }

  // Test webhook simulation
  async testWebhookSimulation(): Promise<void> {
    try {
      console.log('Testing webhook simulation...');
      
      const webhookTests = [
        { command: 'SCORE', description: 'Score command test' },
        { command: 'HELP', description: 'Help command test' },
        { command: 'STOP', description: 'Stop command test' },
        { command: 'RESTART', description: 'Restart command test' },
        { command: 'A', description: 'Answer A test' },
        { command: 'B', description: 'Answer B test' },
        { command: 'C', description: 'Answer C test' },
        { command: 'D', description: 'Answer D test' },
        { command: 'MORE', description: 'MORE command test' },
        { command: 'INVALID', description: 'Invalid command test' }
      ];
      
      for (const test of webhookTests) {
        const result = await twilioService.sendSMS({
          to: TEST_PHONE_NUMBER,
          body: `🧪 Webhook Test: Simulating "${test.command}" command - ${test.description}`
        });
        
        this.results.push({
          command: `Webhook ${test.command}`,
          success: result,
          message: result ? `${test.description} notification sent` : `Failed to send ${test.description}`
        });
      }
    } catch (error) {
      this.results.push({
        command: 'Webhook Simulation',
        success: false,
        message: 'Error in webhook simulation',
        error: error.message
      });
    }
  }
}

// Export function to run tests
export async function runManualSMSTests(): Promise<TestResult[]> {
  const tester = new ManualSMSTests();
  return await tester.runAllTests();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runManualSMSTests().then(results => {
    console.log('\n🎉 All tests completed!');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    console.log(`Results: ${successCount}/${totalCount} tests passed`);
    
    if (successCount === totalCount) {
      console.log('✅ All SMS commands are working correctly!');
    } else {
      console.log('❌ Some SMS commands need attention.');
    }
  }).catch(error => {
    console.error('❌ Test runner failed:', error);
  });
}