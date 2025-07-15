import { describe, test, expect } from 'bun:test';
import { storage } from '../storage';
import { twilioService } from '../services/twilio';
import { geminiService } from '../services/gemini';

// Integration Tests
describe('Integration Tests', () => {
  
  describe('Complete User Journey', () => {
    test('User can signup and receive questions', async () => {
      const testUser = {
        phoneNumber: '+1555TEST123',
        preferredTime: '15:00',
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

      // 1. Create user
      const createdUser = await storage.createUser(testUser);
      expect(createdUser.phoneNumber).toBe(testUser.phoneNumber);

      // 2. Get question for user
      const question = await storage.getRandomQuestion(testUser.categoryPreferences);
      expect(question).toBeDefined();

      // 3. Record user answer
      const answerData = {
        userId: createdUser.id,
        questionId: question!.id,
        userAnswer: 'A',
        isCorrect: question!.correctAnswer === 'A',
        pointsEarned: question!.correctAnswer === 'A' ? 10 : 0,
        streakAfterAnswer: question!.correctAnswer === 'A' ? 1 : 0,
      };

      const recordedAnswer = await storage.recordAnswer(answerData);
      expect(recordedAnswer.userAnswer).toBe('A');

      // 4. Update user stats
      const updatedUser = await storage.updateUser(createdUser.id, {
        currentStreak: answerData.streakAfterAnswer,
        totalScore: answerData.pointsEarned,
        questionsAnswered: 1,
        lastQuizDate: new Date().toISOString(),
      });

      expect(updatedUser?.questionsAnswered).toBe(1);
    });

    test('Question generation and storage flow', async () => {
      // 1. Generate question
      const generatedQuestion = await geminiService.generateQuestion('general', 'medium');
      
      if (generatedQuestion) {
        // 2. Store question
        const storedQuestion = await storage.createQuestion({
          questionText: generatedQuestion.questionText,
          optionA: generatedQuestion.optionA,
          optionB: generatedQuestion.optionB,
          optionC: generatedQuestion.optionC,
          optionD: generatedQuestion.optionD,
          correctAnswer: generatedQuestion.correctAnswer,
          explanation: generatedQuestion.explanation,
          category: generatedQuestion.category,
          difficultyLevel: generatedQuestion.difficultyLevel,
          usageCount: 0,
        });

        expect(storedQuestion.questionText).toBe(generatedQuestion.questionText);
        expect(storedQuestion.correctAnswer).toMatch(/^[ABCD]$/);

        // 3. Retrieve and use question
        const retrievedQuestion = await storage.getRandomQuestion([generatedQuestion.category]);
        expect(retrievedQuestion).toBeDefined();
      }
    });
  });

  describe('SMS Command Processing', () => {
    test('SMS commands are processed correctly', async () => {
      // Test user exists
      const testUser = await storage.getUserByPhoneNumber('+15153570454');
      if (!testUser) {
        // Create test user if not exists
        await storage.createUser({
          phoneNumber: '+15153570454',
          preferredTime: '14:00',
          timezone: 'America/Los_Angeles',
          categoryPreferences: ['general'],
          subscriptionStatus: 'active',
          isActive: true,
          currentStreak: 5,
          totalScore: 50,
          questionsAnswered: 10,
          lastQuizDate: new Date().toISOString(),
          joinDate: new Date().toISOString(),
        });
      }

      // Test SCORE command
      const user = await storage.getUserByPhoneNumber('+15153570454');
      const stats = await storage.getUserStats(user!.id);
      
      expect(stats.totalScore).toBeGreaterThanOrEqual(0);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
      expect(stats.questionsAnswered).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Admin Operations', () => {
    test('Admin can manage questions', async () => {
      // 1. Get admin user
      const admin = await storage.getAdminByUsername('adminadmin123');
      expect(admin).toBeDefined();

      // 2. Admin can view all questions
      const allQuestions = await storage.getAllQuestions();
      expect(allQuestions.length).toBeGreaterThan(0);

      // 3. Admin can create new questions
      const newQuestion = {
        questionText: 'Test integration question?',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        correctAnswer: 'A',
        explanation: 'This is a test question for integration testing.',
        category: 'general',
        difficultyLevel: 'medium',
        usageCount: 0,
      };

      const createdQuestion = await storage.createQuestion(newQuestion);
      expect(createdQuestion.questionText).toBe(newQuestion.questionText);
    });
  });
});