#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs/promises';

console.log('🚀 Setting up database schema on Render...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set it in your Render dashboard first');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');

try {
  console.log('📊 Pushing database schema...');
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema created successfully');
  
  console.log('🧪 Testing database connection...');
  
  // Try to connect to the database
  const { storage } = await import('../server/storage.js');
  
  // Test basic operations
  console.log('📝 Testing basic database operations...');
  
  // Try to get users count (should be 0 for new DB)
  const users = await storage.getAllUsers();
  console.log(`📊 Current user count: ${users.length}`);
  
  console.log('✅ Database connection test successful');
  
  console.log('\n🎉 Database setup complete!');
  console.log('\nNext steps:');
  console.log('1. Import your existing data using import-supabase-data.js');
  console.log('2. Test your application');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}