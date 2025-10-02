import pg from 'pg';
import { randomUUID } from 'crypto';

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

async function testUUIDImplementation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('🧪 Testing UUID implementation for user_answers...\n');

    // Step 1: Check current table structure
    console.log('1. Checking current table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_answers' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current user_answers structure:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) default: ${col.column_default || 'none'}`);
    });

    // Step 2: Test UUID generation
    console.log('\n2. Testing UUID generation...');
    const testUUID1 = randomUUID();
    const testUUID2 = randomUUID();
    console.log(`Generated UUID 1: ${testUUID1}`);
    console.log(`Generated UUID 2: ${testUUID2}`);
    console.log(`UUIDs are unique: ${testUUID1 !== testUUID2}`);

    // Step 3: Check if we can insert with manual UUIDs
    console.log('\n3. Testing manual UUID insertion...');
    
    // Get a test user and question (assuming they exist)
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    const questionResult = await client.query('SELECT id FROM questions LIMIT 1');
    
    if (userResult.rows.length === 0 || questionResult.rows.length === 0) {
      console.log('❌ Need at least one user and one question to test. Skipping insert test.');
    } else {
      const testUserId = userResult.rows[0].id;
      const testQuestionId = questionResult.rows[0].id;
      
      try {
        // Test manual UUID insertion
        const manualUUID = randomUUID();
        await client.query(`
          INSERT INTO user_answers (id, user_id, question_id, user_answer, is_correct, points_earned)
          VALUES ($1, $2, $3, NULL, false, 0)
        `, [manualUUID, testUserId, testQuestionId]);
        
        console.log(`✅ Manual UUID insertion successful: ${manualUUID}`);
        
        // Verify the record exists
        const verifyResult = await client.query('SELECT id FROM user_answers WHERE id = $1', [manualUUID]);
        console.log(`✅ Record verification successful: ${verifyResult.rows.length === 1}`);
        
        // Clean up test record
        await client.query('DELETE FROM user_answers WHERE id = $1', [manualUUID]);
        console.log('🧹 Test record cleaned up');
        
      } catch (insertError) {
        console.log(`❌ Manual UUID insertion failed: ${insertError.message}`);
      }
    }

    // Step 4: Test database-generated UUIDs (if migration was run)
    console.log('\n4. Testing database-generated UUIDs...');
    
    if (userResult.rows.length > 0 && questionResult.rows.length > 0) {
      try {
        // Test letting database generate UUID
        const result = await client.query(`
          INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, points_earned)
          VALUES ($1, $2, NULL, false, 0)
          RETURNING id
        `, [userResult.rows[0].id, questionResult.rows[0].id]);
        
        const generatedUUID = result.rows[0].id;
        console.log(`✅ Database-generated UUID: ${generatedUUID}`);
        console.log(`✅ Is valid UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generatedUUID)}`);
        
        // Clean up test record
        await client.query('DELETE FROM user_answers WHERE id = $1', [generatedUUID]);
        console.log('🧹 Test record cleaned up');
        
      } catch (dbGenError) {
        console.log(`❌ Database-generated UUID failed: ${dbGenError.message}`);
        console.log('(This is expected if migration hasn\'t been run yet)');
      }
    }

    // Step 5: Test existing records (if any)
    console.log('\n5. Checking existing records...');
    const existingRecords = await client.query(`
      SELECT id, user_id, question_id, answered_at 
      FROM user_answers 
      ORDER BY answered_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${existingRecords.rows.length} existing records:`);
    existingRecords.rows.forEach((record, index) => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id);
      console.log(`  ${index + 1}. ID: ${record.id} (${isUUID ? 'UUID' : 'INTEGER'}) - User: ${record.user_id}`);
    });

    client.release();
    console.log('\n✅ UUID testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testUUIDImplementation();