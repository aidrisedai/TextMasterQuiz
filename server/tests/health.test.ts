import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { healthCheck, readinessCheck, metricsEndpoint } from '../health';

const app = express();
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);
app.get('/metrics', metricsEndpoint);

describe('Health Check Endpoints', () => {
  
  test('Health check returns proper format', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('checks');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
    
    expect(response.body.checks).toHaveProperty('database');
    expect(response.body.checks).toHaveProperty('sms');
    expect(response.body.checks).toHaveProperty('ai');
    expect(response.body.checks).toHaveProperty('scheduler');
  });

  test('Readiness check validates environment', async () => {
    const response = await request(app)
      .get('/ready')
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    
    if (response.body.status === 'not_ready') {
      expect(response.body).toHaveProperty('missing');
    }
  });

  test('Metrics endpoint returns system information', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('questions');
    expect(response.body).toHaveProperty('answers');
    expect(response.body).toHaveProperty('system');
    
    expect(response.body.system).toHaveProperty('uptime');
    expect(response.body.system).toHaveProperty('memory');
    expect(response.body.system).toHaveProperty('nodeVersion');
  });
});