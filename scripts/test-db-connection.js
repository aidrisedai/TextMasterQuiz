#!/usr/bin/env node

// Simple database connection test
console.log('🔍 Testing database connection...');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log('🔗 Database URL:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

try {
  // Import and test database connection
  const { neon } = await import('@neondatabase/serverless');
  
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('⏱️  Testing connection...');
  const result = await sql`SELECT 1 as test`;
  
  if (result && result[0] && result[0].test === 1) {
    console.log('✅ Database connection successful!');
    console.log('🎉 Your DATABASE_URL is working correctly');
  } else {
    console.log('❌ Database connection returned unexpected result:', result);
  }
  
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  if (error.message.includes('ETIMEDOUT')) {
    console.error('💡 This appears to be a network timeout issue');
    console.error('💡 The database might be starting up or experiencing network issues');
  }
}