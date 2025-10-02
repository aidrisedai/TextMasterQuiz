import pg from 'pg';

const { Pool } = pg;

async function debugPendingCreation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('🔍 Debugging pending answer creation failures...\n');

    // 1. Check all users and their pending answers
    const usersQuery = `
      SELECT u.id, u.phone_number, u.is_active,
             COUNT(ua.id) as pending_count
      FROM users u
      LEFT JOIN user_answers ua ON u.id = ua.user_id AND ua.user_answer IS NULL
      GROUP BY u.id, u.phone_number, u.is_active
      ORDER BY pending_count DESC, u.id
    `;
    
    const usersResult = await client.query(usersQuery);
    console.log(`👥 User pending answer status:`);
    usersResult.rows.forEach(user => {
      console.log(`  - User ${user.id} (${user.phone_number}): ${user.pending_count} pending answers`);
    });

    // 2. Check recent delivery failures
    const failuresQuery = `
      SELECT user_id, error_message, scheduled_for, created_at
      FROM delivery_queue 
      WHERE status = 'failed' 
        AND error_message LIKE '%pending answer%'
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const failuresResult = await client.query(failuresQuery);
    console.log(`\n❌ Recent pending answer failures (${failuresResult.rows.length}):`);
    failuresResult.rows.forEach(failure => {
      console.log(`  - User ${failure.user_id}: "${failure.error_message}"`);
      console.log(`    Scheduled: ${failure.scheduled_for}, Created: ${failure.created_at}`);
    });

    // 3. Check for orphaned pending answers
    const orphanedQuery = `
      SELECT user_id, question_id, answered_at, 
             NOW() - answered_at as age
      FROM user_answers 
      WHERE user_answer IS NULL 
        AND answered_at < NOW() - INTERVAL '10 minutes'
      ORDER BY answered_at DESC
    `;
    
    const orphanedResult = await client.query(orphanedQuery);
    console.log(`\n🗑️  Orphaned pending answers (older than 10 min): ${orphanedResult.rows.length}`);
    orphanedResult.rows.forEach(orphan => {
      console.log(`  - User ${orphan.user_id}, Question ${orphan.question_id}`);
      console.log(`    Created: ${orphan.answered_at}, Age: ${orphan.age}`);
    });

    // 4. Test the exact logic from createPendingAnswerIfNone
    console.log(`\n🧪 Testing createPendingAnswerIfNone logic...`);
    
    for (const user of usersResult.rows.slice(0, 3)) { // Test first 3 users
      console.log(`\n  Testing User ${user.id}:`);
      
      // Simulate the transaction check
      const existingCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM user_answers 
        WHERE user_id = $1 AND user_answer IS NULL
      `, [user.id]);
      
      const existingCount = existingCheck.rows[0].count;
      console.log(`    Existing pending answers: ${existingCount}`);
      
      if (existingCount > 0) {
        console.log(`    ❌ Would FAIL: User already has pending answers`);
        
        // Show the specific pending answers
        const pendingDetails = await client.query(`
          SELECT id, question_id, answered_at 
          FROM user_answers 
          WHERE user_id = $1 AND user_answer IS NULL
          ORDER BY answered_at DESC
        `, [user.id]);
        
        pendingDetails.rows.forEach(pending => {
          console.log(`      - Pending ID ${pending.id}, Question ${pending.question_id}, Created: ${pending.answered_at}`);
        });
      } else {
        console.log(`    ✅ Would SUCCEED: No existing pending answers`);
        
        // Test if we can actually insert (but don't commit)
        try {
          await client.query('BEGIN');
          const testInsert = await client.query(`
            INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, points_earned)
            VALUES ($1, 1, NULL, false, 0)
            RETURNING id
          `, [user.id]);
          
          console.log(`      ✅ Test insert successful: ID ${testInsert.rows[0].id}`);
          await client.query('ROLLBACK'); // Don't actually save it
        } catch (insertError) {
          await client.query('ROLLBACK');
          console.log(`      ❌ Test insert FAILED: ${insertError.message}`);
        }
      }
    }

    client.release();
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

// Load environment from .env manually
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

debugPendingCreation();