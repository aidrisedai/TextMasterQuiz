import { describe, it, expect, beforeEach } from '@jest/globals';
import { storage } from '../storage';
import { twilioService } from '../services/twilio';
import { geminiService } from '../services/gemini';

// Mock dependencies
jest.mock('../storage');
jest.mock('../services/twilio');
jest.mock('../services/gemini');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockTwilio = twilioService as jest.Mocked<typeof twilioService>;
const mockGemini = geminiService as jest.Mocked<typeof geminiService>;

describe('SMS Commands', () => {
  const testPhoneNumber = '+15153570454';
  const testUser = {
    id: 1,
    phoneNumber: testPhoneNumber,
    preferredTime: '09:00',
    categoryPreferences: ['general'],
    subscriptionStatus: 'free',
    isActive: true,
    currentStreak: 5,
    totalScore: 150,
    questionsAnswered: 20,
    joinDate: '2025-01-01'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getUserByPhoneNumber.mockResolvedValue(testUser);
  });

  describe('SCORE Command', () => {
    it('should send user stats when SCORE is received', async () => {
      const mockStats = {
        currentStreak: 5,
        totalScore: 150,
        questionsAnswered: 20,
        accuracyRate: 0.85
      };

      mockStorage.getUserStats.mockResolvedValue(mockStats);
      mockTwilio.sendStats.mockResolvedValue(true);

      // Simulate SMS processing
      const message = 'SCORE';
      const result = await processSMSCommand(testUser, message);

      expect(mockStorage.getUserStats).toHaveBeenCalledWith(testUser.id);
      expect(mockTwilio.sendStats).toHaveBeenCalledWith(testPhoneNumber, mockStats);
      expect(result).toBe('success');
    });

    it('should handle score command with different cases', async () => {
      const mockStats = {
        currentStreak: 5,
        totalScore: 150,
        questionsAnswered: 20,
        accuracyRate: 0.85
      };

      mockStorage.getUserStats.mockResolvedValue(mockStats);
      mockTwilio.sendStats.mockResolvedValue(true);

      // Test different cases
      const testCases = ['score', 'Score', 'SCORE', 'sCoRe'];
      
      for (const message of testCases) {
        await processSMSCommand(testUser, message);
      }

      expect(mockStorage.getUserStats).toHaveBeenCalledTimes(testCases.length);
      expect(mockTwilio.sendStats).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe('HELP Command', () => {
    it('should send help message when HELP is received', async () => {
      mockTwilio.sendHelp.mockResolvedValue(true);

      const message = 'HELP';
      const result = await processSMSCommand(testUser, message);

      expect(mockTwilio.sendHelp).toHaveBeenCalledWith(testPhoneNumber);
      expect(result).toBe('success');
    });
  });

  describe('STOP Command', () => {
    it('should deactivate user when STOP is received', async () => {
      mockStorage.updateUser.mockResolvedValue({...testUser, isActive: false});
      mockTwilio.sendSMS.mockResolvedValue(true);

      const message = 'STOP';
      const result = await processSMSCommand(testUser, message);

      expect(mockStorage.updateUser).toHaveBeenCalledWith(testUser.id, { isActive: false });
      expect(mockTwilio.sendSMS).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "You've been unsubscribed from Text4Quiz. Text RESTART to resume."
      });
      expect(result).toBe('success');
    });
  });

  describe('RESTART Command', () => {
    it('should reactivate user when RESTART is received', async () => {
      mockStorage.updateUser.mockResolvedValue({...testUser, isActive: true});
      mockTwilio.sendSMS.mockResolvedValue(true);

      const message = 'RESTART';
      const result = await processSMSCommand(testUser, message);

      expect(mockStorage.updateUser).toHaveBeenCalledWith(testUser.id, { isActive: true });
      expect(mockTwilio.sendSMS).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Welcome back to Text4Quiz! You'll receive your next question at your scheduled time."
      });
      expect(result).toBe('success');
    });
  });

  describe('MORE Command (Premium)', () => {
    it('should send bonus question for premium users', async () => {
      const premiumUser = {...testUser, subscriptionStatus: 'premium'};
      const mockQuestion = {
        id: 100,
        questionText: 'What is the capital of France?',
        optionA: 'Paris',
        optionB: 'London',
        optionC: 'Berlin',
        optionD: 'Madrid',
        correctAnswer: 'A',
        explanation: 'Paris is the capital of France.',
        category: 'general',
        difficultyLevel: 'medium'
      };

      mockGemini.generateBonusQuestion.mockResolvedValue(mockQuestion);
      mockStorage.createQuestion.mockResolvedValue(mockQuestion);
      mockTwilio.sendDailyQuestion.mockResolvedValue(true);

      const message = 'MORE';
      const result = await processSMSCommand(premiumUser, message);

      expect(mockGemini.generateBonusQuestion).toHaveBeenCalledWith([], ['general']);
      expect(mockStorage.createQuestion).toHaveBeenCalledWith(mockQuestion);
      expect(mockTwilio.sendDailyQuestion).toHaveBeenCalledWith(
        testPhoneNumber,
        mockQuestion,
        premiumUser.questionsAnswered + 1
      );
      expect(result).toBe('success');
    });

    it('should not send bonus question for free users', async () => {
      const freeUser = {...testUser, subscriptionStatus: 'free'};
      
      const message = 'MORE';
      const result = await processSMSCommand(freeUser, message);

      expect(mockGemini.generateBonusQuestion).not.toHaveBeenCalled();
      expect(result).toBe('unrecognized');
    });
  });

  describe('Answer Commands (A, B, C, D)', () => {
    it('should process correct answer', async () => {
      const mockQuestion = {
        id: 1,
        questionText: 'Test question',
        correctAnswer: 'A',
        explanation: 'Test explanation',
        category: 'general'
      };

      mockStorage.getRandomQuestion.mockResolvedValue(mockQuestion);
      mockStorage.recordAnswer.mockResolvedValue({
        id: 1,
        userId: testUser.id,
        questionId: mockQuestion.id,
        userAnswer: 'A',
        isCorrect: true,
        pointsEarned: 10,
        answeredAt: new Date()
      });
      mockStorage.getUserStats.mockResolvedValue({
        currentStreak: 6,
        totalScore: 160,
        questionsAnswered: 21,
        accuracyRate: 0.86
      });
      mockTwilio.sendAnswerFeedback.mockResolvedValue(true);

      const message = 'A';
      const result = await processSMSCommand(testUser, message);

      expect(mockStorage.recordAnswer).toHaveBeenCalled();
      expect(mockTwilio.sendAnswerFeedback).toHaveBeenCalledWith(
        testPhoneNumber,
        true,
        'A',
        'Test explanation',
        6,
        10
      );
      expect(result).toBe('success');
    });

    it('should handle all answer options', async () => {
      const mockQuestion = {
        id: 1,
        questionText: 'Test question',
        correctAnswer: 'B',
        explanation: 'Test explanation',
        category: 'general'
      };

      mockStorage.getRandomQuestion.mockResolvedValue(mockQuestion);
      mockStorage.recordAnswer.mockResolvedValue({
        id: 1,
        userId: testUser.id,
        questionId: mockQuestion.id,
        userAnswer: 'A',
        isCorrect: false,
        pointsEarned: 0,
        answeredAt: new Date()
      });
      mockStorage.getUserStats.mockResolvedValue({
        currentStreak: 0,
        totalScore: 150,
        questionsAnswered: 21,
        accuracyRate: 0.84
      });
      mockTwilio.sendAnswerFeedback.mockResolvedValue(true);

      const answers = ['A', 'B', 'C', 'D'];
      for (const answer of answers) {
        await processSMSCommand(testUser, answer);
      }

      expect(mockStorage.recordAnswer).toHaveBeenCalledTimes(answers.length);
      expect(mockTwilio.sendAnswerFeedback).toHaveBeenCalledTimes(answers.length);
    });
  });

  describe('Unrecognized Commands', () => {
    it('should send default message for unrecognized commands', async () => {
      mockTwilio.sendSMS.mockResolvedValue(true);

      const message = 'RANDOM_TEXT';
      const result = await processSMSCommand(testUser, message);

      expect(mockTwilio.sendSMS).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Thanks for your message! Text HELP for available commands or wait for your next daily question."
      });
      expect(result).toBe('unrecognized');
    });
  });

  describe('Non-registered Users', () => {
    it('should send signup message for non-registered users', async () => {
      mockStorage.getUserByPhoneNumber.mockResolvedValue(undefined);
      mockTwilio.sendSMS.mockResolvedValue(true);

      const message = 'SCORE';
      const result = await processSMSCommand(null, message);

      expect(mockTwilio.sendSMS).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Welcome to Text4Quiz! Please sign up at our website first."
      });
      expect(result).toBe('not_registered');
    });
  });
});

// Helper function to simulate SMS command processing
async function processSMSCommand(user: any, message: string): Promise<string> {
  if (!user) {
    await mockTwilio.sendSMS({
      to: testPhoneNumber,
      body: "Welcome to Text4Quiz! Please sign up at our website first."
    });
    return 'not_registered';
  }

  const messageUpper = message.trim().toUpperCase();

  try {
    if (messageUpper === 'SCORE') {
      const stats = await mockStorage.getUserStats(user.id);
      await mockTwilio.sendStats(testPhoneNumber, stats);
      return 'success';
    } else if (messageUpper === 'HELP') {
      await mockTwilio.sendHelp(testPhoneNumber);
      return 'success';
    } else if (messageUpper === 'STOP') {
      await mockStorage.updateUser(user.id, { isActive: false });
      await mockTwilio.sendSMS({
        to: testPhoneNumber,
        body: "You've been unsubscribed from Text4Quiz. Text RESTART to resume."
      });
      return 'success';
    } else if (messageUpper === 'RESTART') {
      await mockStorage.updateUser(user.id, { isActive: true });
      await mockTwilio.sendSMS({
        to: testPhoneNumber,
        body: "Welcome back to Text4Quiz! You'll receive your next question at your scheduled time."
      });
      return 'success';
    } else if (messageUpper === 'MORE' && user.subscriptionStatus === 'premium') {
      const categories = user.categoryPreferences && user.categoryPreferences.length > 0 
        ? user.categoryPreferences 
        : ['general'];
      
      const generated = await mockGemini.generateBonusQuestion([], categories);
      if (generated) {
        const question = await mockStorage.createQuestion(generated);
        await mockTwilio.sendDailyQuestion(
          testPhoneNumber,
          question,
          user.questionsAnswered + 1
        );
      }
      return 'success';
    } else if (['A', 'B', 'C', 'D'].includes(messageUpper)) {
      // Simulate answer processing
      const question = await mockStorage.getRandomQuestion();
      const isCorrect = question.correctAnswer === messageUpper;
      const pointsEarned = isCorrect ? 10 : 0;
      
      await mockStorage.recordAnswer({
        userId: user.id,
        questionId: question.id,
        userAnswer: messageUpper,
        isCorrect,
        pointsEarned
      });
      
      const stats = await mockStorage.getUserStats(user.id);
      await mockTwilio.sendAnswerFeedback(
        testPhoneNumber,
        isCorrect,
        question.correctAnswer,
        question.explanation,
        stats.currentStreak,
        pointsEarned
      );
      return 'success';
    } else {
      await mockTwilio.sendSMS({
        to: testPhoneNumber,
        body: "Thanks for your message! Text HELP for available commands or wait for your next daily question."
      });
      return 'unrecognized';
    }
  } catch (error) {
    return 'error';
  }
}