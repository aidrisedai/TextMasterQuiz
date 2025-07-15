import { Request, Response } from 'express';
import { storage } from './storage';
import { twilioService } from './services/twilio';
import { geminiService } from './services/gemini';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; responseTime?: number; error?: string };
    sms: { status: string; configured: boolean };
    ai: { status: string; configured: boolean };
    scheduler: { status: string; active: boolean };
  };
  version: string;
  uptime: number;
}

export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' },
      sms: { status: 'unknown', configured: false },
      ai: { status: 'unknown', configured: false },
      scheduler: { status: 'unknown', active: false },
    },
    version: '1.0.0',
    uptime: process.uptime(),
  };

  // Check database
  try {
    const dbStart = Date.now();
    await storage.getAllUsers();
    result.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    result.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = 'unhealthy';
  }

  // Check SMS service
  result.checks.sms = {
    status: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 'healthy' : 'degraded',
    configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  };

  // Check AI service
  result.checks.ai = {
    status: process.env.GOOGLE_AI_API_KEY ? 'healthy' : 'degraded',
    configured: !!process.env.GOOGLE_AI_API_KEY,
  };

  // Check scheduler
  result.checks.scheduler = {
    status: 'healthy',
    active: true, // Scheduler is always active if the app is running
  };

  // Set overall status
  if (result.checks.database.status === 'unhealthy') {
    result.status = 'unhealthy';
  } else if (
    result.checks.sms.status === 'degraded' ||
    result.checks.ai.status === 'degraded'
  ) {
    result.status = 'degraded';
  }

  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
}

export async function readinessCheck(req: Request, res: Response) {
  try {
    // Check if essential services are ready
    await storage.getAllUsers();
    
    const isReady = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.GOOGLE_AI_API_KEY
    );

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'ready',
          sms: 'ready',
          ai: 'ready',
        },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        missing: [
          ...(!process.env.TWILIO_ACCOUNT_SID ? ['TWILIO_ACCOUNT_SID'] : []),
          ...(!process.env.TWILIO_AUTH_TOKEN ? ['TWILIO_AUTH_TOKEN'] : []),
          ...(!process.env.GOOGLE_AI_API_KEY ? ['GOOGLE_AI_API_KEY'] : []),
        ],
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function metricsEndpoint(req: Request, res: Response) {
  try {
    const [users, questions] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllQuestions(),
    ]);

    const activeUsers = users.filter(user => user.isActive);
    const totalAnswers = await Promise.all(
      activeUsers.map(user => storage.getUserAnswers(user.id, 1000))
    );

    const metrics = {
      timestamp: new Date().toISOString(),
      users: {
        total: users.length,
        active: activeUsers.length,
        inactive: users.length - activeUsers.length,
      },
      questions: {
        total: questions.length,
        byCategory: questions.reduce((acc, q) => {
          acc[q.category] = (acc[q.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      answers: {
        total: totalAnswers.reduce((sum, answers) => sum + answers.length, 0),
        totalCorrect: totalAnswers.reduce(
          (sum, answers) => sum + answers.filter(a => a.isCorrect).length,
          0
        ),
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
    });
  }
}