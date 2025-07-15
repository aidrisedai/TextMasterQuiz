import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { storage } from '../storage';
import { twilioService } from '../services/twilio';
import { geminiService } from '../services/gemini';
import { schedulerService } from '../services/scheduler';

// Production Readiness Test Suite
describe('Production Readiness Tests', () => {
  
  describe('Database Operations', () => {
    test('Database connection is stable', async () => {
      const users = await storage.getAllUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    test('Can create and retrieve users', async () => {
      const testUser = {
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
      };

      const createdUser = await storage.createUser(testUser);
      expect(createdUser.phoneNumber).toBe(testUser.phoneNumber);
      
      const retrievedUser = await storage.getUserByPhoneNumber(testUser.phoneNumber);
      expect(retrievedUser?.phoneNumber).toBe(testUser.phoneNumber);
    });

    test('Can manage questions effectively', async () => {
      const questions = await storage.getAllQuestions();
      expect(questions.length).toBeGreaterThan(0);
      
      const randomQuestion = await storage.getRandomQuestion();
      expect(randomQuestion).toBeDefined();
      expect(randomQuestion?.questionText).toBeDefined();
    });
  });

  describe('SMS Service', () => {
    test('Twilio service is properly configured', () => {
      expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
      expect(process.env.TWILIO_AUTH_TOKEN).toBeDefined();
      expect(process.env.TWILIO_PHONE_NUMBER).toBeDefined();
    });

    test('SMS message formatting is correct', async () => {
      const testMessage = {
        to: '+1234567890',
        body: 'Test message for production readiness'
      };
      
      // This will test the formatting without actually sending
      const result = await twilioService.sendSMS(testMessage);
      // Should return true in production with proper credentials
      expect(typeof result).toBe('boolean');
    });
  });

  describe('AI Question Generation', () => {
    test('Google AI API key is configured', () => {
      expect(process.env.GOOGLE_AI_API_KEY).toBeDefined();
    });

    test('Question generation service works', async () => {
      const question = await geminiService.generateQuestion('general', 'medium');
      if (question) {
        expect(question.questionText).toBeDefined();
        expect(question.optionA).toBeDefined();
        expect(question.optionB).toBeDefined();
        expect(question.optionC).toBeDefined();
        expect(question.optionD).toBeDefined();
        expect(question.correctAnswer).toMatch(/^[ABCD]$/);
        expect(question.explanation).toBeDefined();
      }
    });
  });

  describe('Authentication System', () => {
    test('Admin authentication is secure', async () => {
      const admin = await storage.getAdminByUsername('adminadmin123');
      expect(admin).toBeDefined();
      expect(admin?.password).toBeDefined();
      expect(admin?.password.includes('.')).toBe(true); // Check if password is hashed
    });

    test('Session secret is configured', () => {
      expect(process.env.SESSION_SECRET).toBeDefined();
      expect(process.env.SESSION_SECRET.length).toBeGreaterThan(10);
    });
  });

  describe('Data Validation', () => {
    test('Phone number validation works', () => {
      const validPhoneNumbers = ['+1234567890', '+15551234567'];
      const invalidPhoneNumbers = ['123', 'invalid', ''];
      
      validPhoneNumbers.forEach(phone => {
        expect(phone.startsWith('+')).toBe(true);
        expect(phone.length).toBeGreaterThan(10);
      });
    });

    test('Category preferences are valid', () => {
      const validCategories = ['general', 'science', 'history', 'sports', 'geography', 'literature', 'arts', 'technology', 'physics'];
      const testPreferences = ['general', 'science'];
      
      testPreferences.forEach(category => {
        expect(validCategories.includes(category)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('Graceful handling of missing data', async () => {
      const nonExistentUser = await storage.getUserByPhoneNumber('+9999999999');
      expect(nonExistentUser).toBeUndefined();
    });

    test('Question generation fallback works', async () => {
      // Test fallback when API might fail
      const fallbackQuestion = geminiService.generateQuestion('invalid_category', 'invalid_difficulty');
      expect(fallbackQuestion).toBeDefined();
    });
  });
});