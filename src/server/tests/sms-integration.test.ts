import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../storage';
import { twilioService } from '../services/twilio';

// Integration tests for SMS webhook endpoints
describe('SMS Integration Tests', () => {
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

  beforeEach(async () => {
    // Setup test data
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('POST /api/webhook/sms', () => {
    it('should handle SCORE command', async () => {
      const mockStats = {
        currentStreak: 5,
        totalScore: 150,
        questionsAnswered: 20,
        accuracyRate: 0.85
      };

      // Mock the storage and twilio services
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const getStatsSpy = jest.spyOn(storage, 'getUserStats').mockResolvedValue(mockStats);
      const sendStatsSpy = jest.spyOn(twilioService, 'sendStats').mockResolvedValue(true);

      // Make the request
      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'SCORE'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(getStatsSpy).toHaveBeenCalledWith(testUser.id);
      expect(sendStatsSpy).toHaveBeenCalledWith(testPhoneNumber, mockStats);
    });

    it('should handle HELP command', async () => {
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const sendHelpSpy = jest.spyOn(twilioService, 'sendHelp').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'HELP'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(sendHelpSpy).toHaveBeenCalledWith(testPhoneNumber);
    });

    it('should handle STOP command', async () => {
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const updateUserSpy = jest.spyOn(storage, 'updateUser').mockResolvedValue({...testUser, isActive: false});
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'STOP'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(updateUserSpy).toHaveBeenCalledWith(testUser.id, { isActive: false });
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "You've been unsubscribed from Text4Quiz. Text RESTART to resume."
      });
    });

    it('should handle RESTART command', async () => {
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const updateUserSpy = jest.spyOn(storage, 'updateUser').mockResolvedValue({...testUser, isActive: true});
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'RESTART'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(updateUserSpy).toHaveBeenCalledWith(testUser.id, { isActive: true });
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Welcome back to Text4Quiz! You'll receive your next question at your scheduled time."
      });
    });

    it('should handle answer commands (A, B, C, D)', async () => {
      const mockQuestion = {
        id: 1,
        questionText: 'Test question',
        correctAnswer: 'A',
        explanation: 'Test explanation',
        category: 'general'
      };

      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const getRandomQuestionSpy = jest.spyOn(storage, 'getRandomQuestion').mockResolvedValue(mockQuestion);
      const recordAnswerSpy = jest.spyOn(storage, 'recordAnswer').mockResolvedValue({
        id: 1,
        userId: testUser.id,
        questionId: mockQuestion.id,
        userAnswer: 'A',
        isCorrect: true,
        pointsEarned: 10,
        answeredAt: new Date()
      });
      const getUserStatsSpy = jest.spyOn(storage, 'getUserStats').mockResolvedValue({
        currentStreak: 6,
        totalScore: 160,
        questionsAnswered: 21,
        accuracyRate: 0.86
      });
      const sendAnswerFeedbackSpy = jest.spyOn(twilioService, 'sendAnswerFeedback').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'A'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(recordAnswerSpy).toHaveBeenCalled();
      expect(sendAnswerFeedbackSpy).toHaveBeenCalled();
    });

    it('should handle unrecognized commands', async () => {
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(testUser);
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'RANDOM_MESSAGE'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Thanks for your message! Text HELP for available commands or wait for your next daily question."
      });
    });

    it('should handle non-registered users', async () => {
      const getUserSpy = jest.spyOn(storage, 'getUserByPhoneNumber').mockResolvedValue(undefined);
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber,
          Body: 'SCORE'
        });

      expect(response.status).toBe(200);
      expect(getUserSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: "Welcome to Text4Quiz! Please sign up at our website first."
      });
    });

    it('should handle invalid requests', async () => {
      // Missing From field
      let response = await request(app)
        .post('/api/webhook/sms')
        .send({
          Body: 'SCORE'
        });

      expect(response.status).toBe(400);

      // Missing Body field
      response = await request(app)
        .post('/api/webhook/sms')
        .send({
          From: testPhoneNumber
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/test-sms', () => {
    it('should send test SMS', async () => {
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/test-sms')
        .send({
          to: testPhoneNumber,
          message: 'Test message'
        });

      expect(response.status).toBe(200);
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: 'Test message'
      });
      expect(response.body).toEqual({ message: 'SMS sent successfully' });
    });

    it('should handle SMS sending failure', async () => {
      const sendSMSSpy = jest.spyOn(twilioService, 'sendSMS').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/test-sms')
        .send({
          to: testPhoneNumber,
          message: 'Test message'
        });

      expect(response.status).toBe(500);
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: testPhoneNumber,
        body: 'Test message'
      });
      expect(response.body).toEqual({ message: 'Failed to send SMS' });
    });

    it('should handle invalid test SMS requests', async () => {
      // Missing to field
      let response = await request(app)
        .post('/api/test-sms')
        .send({
          message: 'Test message'
        });

      expect(response.status).toBe(400);

      // Missing message field
      response = await request(app)
        .post('/api/test-sms')
        .send({
          to: testPhoneNumber
        });

      expect(response.status).toBe(400);
    });
  });
});

// Mock the app for testing
const app = {
  post: jest.fn()
};