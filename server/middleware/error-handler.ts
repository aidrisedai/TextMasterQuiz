import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  status = 400;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error {
  status = 401;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends Error {
  status = 429;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error for monitoring
  console.error(`[${new Date().toISOString()}] ${err.name || 'Error'}: ${message}`, {
    status,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    stack: err.stack,
  });

  // Don't expose internal errors in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown'
    });
  } else {
    res.status(status).json({ 
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}