// Test setup file
import { beforeAll, afterAll } from '@jest/globals';

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'test_db_url';
  process.env.SESSION_SECRET = 'test_session_secret_for_testing_only';
  
  // Mock external services for testing
  jest.mock('../services/twilio', () => ({
    twilioService: {
      sendSMS: jest.fn().mockResolvedValue(true),
      sendDailyQuestion: jest.fn().mockResolvedValue(true),
      sendAnswerFeedback: jest.fn().mockResolvedValue(true),
      sendStats: jest.fn().mockResolvedValue(true),
      sendHelp: jest.fn().mockResolvedValue(true),
      sendWelcome: jest.fn().mockResolvedValue(true),
    },
  }));
  
  console.log('Test environment initialized');
});

afterAll(async () => {
  // Clean up test environment
  console.log('Test environment cleaned up');
});

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    phoneNumber: '+1234567890',
    preferredTime: '14:00',
    timezone: 'America/New_York',
    categoryPreferences: ['general', 'science'],
    subscriptionStatus: 'active',
    isActive: true,
    currentStreak: 0,
    totalScore: 0,
    questionsAnswered: 0,
    lastQuizDate: null,
    joinDate: new Date().toISOString(),
  }),
  
  createTestQuestion: () => ({
    questionText: 'Test question?',
    optionA: 'Option A',
    optionB: 'Option B',
    optionC: 'Option C',
    optionD: 'Option D',
    correctAnswer: 'A',
    explanation: 'Test explanation',
    category: 'general',
    difficultyLevel: 'medium',
    usageCount: 0,
  }),
};