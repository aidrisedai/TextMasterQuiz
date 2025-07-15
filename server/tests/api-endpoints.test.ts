import { describe, test, expect } from 'bun:test';

// API Endpoint Tests
describe('API Endpoints Security and Validation', () => {
  
  const baseUrl = 'http://localhost:5000';

  describe('Public Endpoints', () => {
    test('Signup endpoint validates input', async () => {
      const invalidData = {
        phoneNumber: 'invalid',
        preferredTime: '25:00', // Invalid time
        timezone: '',
        categoryPreferences: [],
        terms: false
      };

      const response = await fetch(`${baseUrl}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
    });

    test('User stats endpoint handles missing users', async () => {
      const response = await fetch(`${baseUrl}/api/user-stats?phoneNumber=%2B9999999999`);
      expect(response.status).toBe(404);
    });
  });

  describe('Admin Endpoints', () => {
    test('Admin endpoints require authentication', async () => {
      const response = await fetch(`${baseUrl}/api/admin/questions`);
      expect(response.status).toBe(401);
    });

    test('Admin login validates credentials', async () => {
      const invalidCredentials = {
        username: 'invalid',
        password: 'wrong'
      };

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidCredentials)
      });

      expect(response.status).toBe(401);
    });
  });

  describe('SMS Webhook Endpoints', () => {
    test('SMS webhook handles malformed requests', async () => {
      const malformedData = {
        From: 'invalid',
        Body: '',
        // Missing required fields
      };

      const response = await fetch(`${baseUrl}/api/sms-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(malformedData)
      });

      // Should handle gracefully without crashing
      expect(response.status).toBeLessThan(500);
    });
  });
});