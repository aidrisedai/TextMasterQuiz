import pg from 'pg';

const { Pool } = pg;

// Load environment variables
import { readFileSync } from 'fs';
try {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('No .env file found, using existing env vars');
}

const migrationSQL = `
-- Migration: Convert user_answers table from SERIAL id to UUID
-- This script safely migrates existing data while preserving all relationships

BEGIN;

-- Step 1: Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Add new UUID column
ALTER TABLE user_answers ADD COLUMN new_id UUID DEFAULT gen_random_uuid();

-- Step 3: Populate the new UUID column for existing records
UPDATE user_answers SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- Step 4: Make the new column NOT NULL
ALTER TABLE user_answers ALTER COLUMN new_id SET NOT NULL;

-- Step 5: Drop the old primary key constraint
ALTER TABLE user_answers DROP CONSTRAINT user_answers_pkey;

-- Step 6: Drop the old id column
ALTER TABLE user_answers DROP COLUMN id;

-- Step 7: Rename new_id to id
ALTER TABLE user_answers RENAME COLUMN new_id TO id;

-- Step 8: Add the new primary key constraint
ALTER TABLE user_answers ADD CONSTRAINT user_answers_pkey PRIMARY KEY (id);

-- Step 9: Update the default for future inserts
ALTER TABLE user_answers ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
`;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('🚀 Starting UUID migration for user_answers table...\n');

    // Check current state
    console.log('1. Checking current table structure...');
    const beforeInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_answers' AND column_name = 'id'
    `);
    
    if (beforeInfo.rows.length > 0) {
      const idColumn = beforeInfo.rows[0];
      console.log(`   Current ID column: ${idColumn.data_type} (default: ${idColumn.column_default || 'none'})`);
      
      if (idColumn.data_type === 'uuid') {
        console.log('✅ Table already uses UUID! Migration not needed.');
        client.release();
        await pool.end();
        return;
      }
    }

    // Count existing records
    const countResult = await client.query('SELECT COUNT(*) as count FROM user_answers');
    const recordCount = countResult.rows[0].count;
    console.log(`   Found ${recordCount} existing records to migrate`);

    if (recordCount > 0) {
      const confirm = process.argv.includes('--confirm');
      if (!confirm) {
        console.log('\n❌ Migration will modify existing data!');
        console.log('   Add --confirm flag to proceed: node run-uuid-migration.js --confirm');
        client.release();
        await pool.end();
        return;
      }
    }

    console.log('\n2. Running migration...');
    console.log('   This may take a few moments...');

    // Run the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');

    // Verify the result
    console.log('\n3. Verifying migration...');
    const afterInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_answers' AND column_name = 'id'
    `);
    
    if (afterInfo.rows.length > 0) {
      const newIdColumn = afterInfo.rows[0];
      console.log(`   New ID column: ${newIdColumn.data_type} (default: ${newIdColumn.column_default || 'none'})`);
    }

    // Check a few sample records
    const sampleResult = await client.query(`
      SELECT id, user_id, answered_at 
      FROM user_answers 
      ORDER BY answered_at DESC 
      LIMIT 3
    `);
    
    console.log('\n4. Sample records after migration:');
    sampleResult.rows.forEach((record, index) => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id);
      console.log(`   ${index + 1}. ID: ${record.id} (${isUUID ? 'Valid UUID' : 'Invalid UUID'}) - User: ${record.user_id}`);
    });

    const finalCount = await client.query('SELECT COUNT(*) as count FROM user_answers');
    console.log(`\n✅ Migration completed! ${finalCount.rows[0].count} records migrated successfully.`);

    client.release();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

console.log('UUID Migration Script for user_answers table');
console.log('===============================================');
runMigration();