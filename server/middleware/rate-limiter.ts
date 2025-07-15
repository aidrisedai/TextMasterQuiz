import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error-handler';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requests.entries()) {
        if (now > data.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    const existing = this.requests.get(key);
    
    if (!existing || now > existing.resetTime) {
      this.requests.set(key, { count: 1, resetTime });
      next();
    } else if (existing.count < this.config.maxRequests) {
      existing.count++;
      next();
    } else {
      throw new RateLimitError(
        this.config.message || 'Too many requests, please try again later'
      );
    }
  };
}

// Different rate limiters for different endpoints
export const signupRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // Max 3 signups per 15 minutes per IP
  message: 'Too many signup attempts, please try again later'
});

export const smsWebhookRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Max 30 SMS messages per minute per IP
  message: 'Too many SMS messages, please slow down'
});

export const adminRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Max 100 admin requests per minute
  message: 'Too many admin requests, please slow down'
});

export const generalRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Max 60 general requests per minute per IP
  message: 'Too many requests, please try again later'
});