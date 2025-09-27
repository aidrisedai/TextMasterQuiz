#!/usr/bin/env node

console.log('🚀 Initializing Render Database Schema...\n');

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set it with your Render PostgreSQL URL');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log('🔗 Database:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

async function initializeDatabase() {
  try {
    console.log('\n📊 Step 1: Testing database connection...');
    
    // Test connection first
    const { pool } = await import('../server/db.js');
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      console.log('✅ Connected to database:', result.rows[0].db_name);
      console.log('🕒 Server time:', result.rows[0].current_time);
    } finally {
      client.release();
    }
    
    console.log('\n📋 Step 2: Pushing database schema...');
    
    // Use drizzle-kit to push schema
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx drizzle-kit push', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env }
      });
      
      console.log('✅ Database schema created successfully!');
      
    } catch (error) {
      console.error('❌ Schema push failed:', error.message);
      throw error;
    }
    
    console.log('\n🧪 Step 3: Verifying tables...');
    
    // Verify tables exist
    const client2 = await pool.connect();
    try {
      const tablesResult = await client2.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      
      if (tables.length > 0) {
        console.log('✅ Tables created:');
        tables.forEach(table => console.log(`  - ${table}`));
      } else {
        console.log('⚠️  No tables found');
      }
      
    } finally {
      client2.release();
    }
    
    console.log('\n🎉 Database initialization complete!');
    console.log('📝 Next steps:');
    console.log('1. Your app should now start successfully');
    console.log('2. You can import your existing data using import-supabase-data.js');
    console.log('3. Test your application functionality');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Verify DATABASE_URL is correct');
    console.error('2. Check database permissions');
    console.error('3. Ensure schema files are valid');
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();