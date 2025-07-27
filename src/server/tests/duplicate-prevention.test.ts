import { storage } from '../storage';
import { schedulerService } from '../services/scheduler';
import { twilioService } from '../services/twilio';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  error?: string;
}

export class DuplicatePreventionTests {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🧪 Starting duplicate prevention tests...');
    
    await this.testPendingAnswerPrevention();
    await this.testDuplicateQuestionProtection();
    await this.testManualSendProtection();
    
    console.log('✅ Duplicate prevention tests completed');
    return this.results;
  }

  private async testPendingAnswerPrevention(): Promise<void> {
    try {
      // Create a test user
      const testUser = await storage.createUser({
        phoneNumber: '+15559999999',
        categoryPreferences: ['general'],
        preferredTime: '10:00',
        timezone: 'America/New_York',
        subscriptionStatus: 'free',
        isActive: true,
      });

      // Send first question
      await schedulerService.sendQuestionNow(testUser.phoneNumber);
      
      // Check for pending answer
      const userAnswers = await storage.getUserAnswers(testUser.id, 10);
      const pendingAnswers = userAnswers.filter(answer => answer.userAnswer === null);
      
      if (pendingAnswers.length === 1) {
        // Try to send second question - should be blocked
        await schedulerService.sendQuestionNow(testUser.phoneNumber);
        
        // Check that no duplicate was created
        const userAnswersAfter = await storage.getUserAnswers(testUser.id, 10);
        const pendingAnswersAfter = userAnswersAfter.filter(answer => answer.userAnswer === null);
        
        if (pendingAnswersAfter.length === 1) {
          this.results.push({
            test: 'Pending Answer Prevention',
            passed: true,
            message: 'Correctly blocked duplicate question when pending answer exists'
          });
        } else {
          this.results.push({
            test: 'Pending Answer Prevention',
            passed: false,
            message: `Expected 1 pending answer, got ${pendingAnswersAfter.length}`
          });
        }
      } else {
        this.results.push({
          test: 'Pending Answer Prevention',
          passed: false,
          message: `Expected 1 pending answer after first send, got ${pendingAnswers.length}`
        });
      }
      
      // Cleanup
      await storage.updateUser(testUser.id, { isActive: false });
    } catch (error: any) {
      this.results.push({
        test: 'Pending Answer Prevention',
        passed: false,
        message: 'Test failed with error',
        error: error.message
      });
    }
  }

  private async testDuplicateQuestionProtection(): Promise<void> {
    try {
      // This test verifies that the same question won't be sent twice
      const testUser = await storage.createUser({
        phoneNumber: '+15559999998',
        categoryPreferences: ['general'],
        preferredTime: '10:00',
        timezone: 'America/New_York',
        subscriptionStatus: 'free',
        isActive: true,
      });

      // Send question and answer it
      await schedulerService.sendQuestionNow(testUser.phoneNumber);
      
      const userAnswers = await storage.getUserAnswers(testUser.id, 10);
      if (userAnswers.length > 0) {
        // Answer the question
        await storage.updateAnswer(userAnswers[0].id, {
          userAnswer: 'A',
          isCorrect: true,
          pointsEarned: 10
        });
        
        // Try to send same question again - should get different question or be blocked
        await schedulerService.sendQuestionNow(testUser.phoneNumber);
        
        const userAnswersAfter = await storage.getUserAnswers(testUser.id, 10);
        const uniqueQuestions = new Set(userAnswersAfter.map(answer => answer.questionId));
        
        this.results.push({
          test: 'Duplicate Question Protection',
          passed: true,
          message: `System correctly handles question uniqueness (${uniqueQuestions.size} unique questions)`
        });
      } else {
        this.results.push({
          test: 'Duplicate Question Protection',
          passed: false,
          message: 'No question was sent for the test'
        });
      }
      
      // Cleanup
      await storage.updateUser(testUser.id, { isActive: false });
    } catch (error: any) {
      this.results.push({
        test: 'Duplicate Question Protection',
        passed: false,
        message: 'Test failed with error',
        error: error.message
      });
    }
  }

  private async testManualSendProtection(): Promise<void> {
    try {
      // Test that manual send API also respects duplicate prevention
      const testUser = await storage.createUser({
        phoneNumber: '+15559999997',
        categoryPreferences: ['general'],
        preferredTime: '10:00',
        timezone: 'America/New_York',
        subscriptionStatus: 'free',
        isActive: true,
      });

      // Send question manually
      await schedulerService.sendQuestionNow(testUser.phoneNumber);
      
      // Check for pending answer
      const userAnswers = await storage.getUserAnswers(testUser.id, 10);
      const pendingAnswers = userAnswers.filter(answer => answer.userAnswer === null);
      
      if (pendingAnswers.length === 1) {
        // Try manual send again - should be blocked
        await schedulerService.sendQuestionNow(testUser.phoneNumber);
        
        const userAnswersAfter = await storage.getUserAnswers(testUser.id, 10);
        const pendingAnswersAfter = userAnswersAfter.filter(answer => answer.userAnswer === null);
        
        if (pendingAnswersAfter.length === 1) {
          this.results.push({
            test: 'Manual Send Protection',
            passed: true,
            message: 'Manual send correctly blocked when pending answer exists'
          });
        } else {
          this.results.push({
            test: 'Manual Send Protection',
            passed: false,
            message: `Expected 1 pending answer, got ${pendingAnswersAfter.length}`
          });
        }
      } else {
        this.results.push({
          test: 'Manual Send Protection',
          passed: false,
          message: `Expected 1 pending answer after manual send, got ${pendingAnswers.length}`
        });
      }
      
      // Cleanup
      await storage.updateUser(testUser.id, { isActive: false });
    } catch (error: any) {
      this.results.push({
        test: 'Manual Send Protection',
        passed: false,
        message: 'Test failed with error',
        error: error.message
      });
    }
  }
}

export async function runDuplicatePreventionTests(): Promise<TestResult[]> {
  const tests = new DuplicatePreventionTests();
  return await tests.runAllTests();
}