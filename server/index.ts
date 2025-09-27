import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('🚀 Starting Text4Quiz server...');
  
  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Please set it in your Render dashboard');
    process.exit(1);
  }
  
  // Delay startup to allow environment to stabilize
  if (process.env.NODE_ENV === 'production') {
    console.log('⏱️  Production startup delay...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  try {
    // Test database connection before registering routes
    console.log('🔍 Testing database connection...');
    const { storage } = await import('./storage.js');
    await storage.testConnection();
    
    const server = await registerRoutes(app);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use the PORT environment variable provided by the hosting platform
    // Default to 5000 for local development
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log('✅ Text4Quiz is ready for connections!');
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
      console.error('💡 Database connection timed out');
      console.error('💡 Please check your DATABASE_URL environment variable');
      console.error('💡 Make sure your database is created and accessible');
    }
    process.exit(1);
  }
})();
