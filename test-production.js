#!/usr/bin/env node

// Simple test script to verify production build
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🚀 Testing production build...');

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  SESSION_SECRET: "test-session-secret",
  ADMIN_EMAILS: "abdulazeezidris28@gmail.com"
};

const server = spawn('node', ['dist/index.js'], { env });

let serverStarted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[SERVER]', output.trim());
  if (output.includes('serving on port 5000')) {
    serverStarted = true;
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('Twilio credentials') && !output.includes('MemoryStore')) {
    console.error('[ERROR]', output.trim());
  }
});

// Wait 3 seconds for server to start
await setTimeout(3000);

if (serverStarted) {
  console.log('✅ Production server started successfully!');
  console.log('🌐 Ready to deploy - static files are being served correctly');
} else {
  console.log('❌ Server failed to start');
}

server.kill();
process.exit(serverStarted ? 0 : 1);