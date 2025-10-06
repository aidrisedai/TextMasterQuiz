import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function debugPendingAnswers() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // 1. Check all pending answers (where userAnswer is null)
    console.log('\n=== PENDING ANSWERS ANALYSIS ===');
    const pendingAnswersResult = await client.query(`
      SELECT 
        ua.id,
        ua.user_id,
        ua.question_id,
        ua.user_answer,
        ua.answered_at,
        ua.created_at,
        u.phone_number,
        q.question_text
      FROM user_answers ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN questions q ON ua.question_id = q.id
      WHERE ua.user_answer IS NULL
      ORDER BY ua.created_at DESC
    `);
    
    console.log(`📋 Total pending answers: ${pendingAnswersResult.rows.length}`);
    
    if (pendingAnswersResult.rows.length > 0) {
      console.log('\n📱 Users with pending answers:');
      pendingAnswersResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.phone_number} - Question: "${row.question_text?.substring(0, 60)}..." (Created: ${row.created_at})`);
      });
    }
    
    // 2. Check users who might have orphaned/missing pending answers
    console.log('\n=== USERS WITHOUT PENDING ANSWERS ===');
    const usersWithoutPendingResult = await client.query(`
      SELECT 
        u.id,
        u.phone_number,
        u.questions_answered,
        u.last_quiz_date,
        COUNT(ua.id) as recent_answers
      FROM users u
      LEFT JOIN user_answers ua ON u.id = ua.user_id 
        AND ua.created_at > NOW() - INTERVAL '24 hours'
        AND ua.user_answer IS NULL
      WHERE u.is_active = true
      GROUP BY u.id, u.phone_number, u.questions_answered, u.last_quiz_date
      HAVING COUNT(ua.id) = 0
      ORDER BY u.last_quiz_date DESC NULLS LAST
    `);
    
    console.log(`👥 Active users without pending answers: ${usersWithoutPendingResult.rows.length}`);
    
    // 3. Look for users with recent completed answers (might have had recovery triggered)
    console.log('\n=== RECENT COMPLETED ANSWERS (Last 24 hours) ===');
    const recentAnswersResult = await client.query(`
      SELECT 
        u.phone_number,
        ua.user_answer,
        ua.is_correct,
        ua.answered_at,
        q.question_text
      FROM user_answers ua
      JOIN users u ON ua.user_id = u.id
      LEFT JOIN questions q ON ua.question_id = q.id
      WHERE ua.answered_at > NOW() - INTERVAL '24 hours'
        AND ua.user_answer IS NOT NULL
      ORDER BY ua.answered_at DESC
      LIMIT 20
    `);
    
    console.log(`💬 Recent completed answers: ${recentAnswersResult.rows.length}`);
    recentAnswersResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.phone_number} answered "${row.user_answer}" at ${row.answered_at} (${row.is_correct ? '✅' : '❌'})`);
    });
    
    // 4. Check for duplicate pending answers per user
    console.log('\n=== DUPLICATE PENDING ANSWERS CHECK ===');
    const duplicatePendingResult = await client.query(`
      SELECT 
        ua.user_id,
        u.phone_number,
        COUNT(*) as pending_count
      FROM user_answers ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_answer IS NULL
      GROUP BY ua.user_id, u.phone_number
      HAVING COUNT(*) > 1
      ORDER BY pending_count DESC
    `);
    
    console.log(`🔄 Users with multiple pending answers: ${duplicatePendingResult.rows.length}`);
    duplicatePendingResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.phone_number} has ${row.pending_count} pending answers`);
    });
    
    // 5. Check for very old pending answers (might be orphaned)
    console.log('\n=== OLD PENDING ANSWERS (Older than 2 hours) ===');
    const oldPendingResult = await client.query(`
      SELECT 
        u.phone_number,
        ua.created_at,
        q.question_text,
        EXTRACT(EPOCH FROM (NOW() - ua.created_at))/3600 as hours_old
      FROM user_answers ua
      JOIN users u ON ua.user_id = u.id
      LEFT JOIN questions q ON ua.question_id = q.id
      WHERE ua.user_answer IS NULL
        AND ua.created_at < NOW() - INTERVAL '2 hours'
      ORDER BY ua.created_at ASC
    `);
    
    console.log(`⏰ Old pending answers (>2 hours): ${oldPendingResult.rows.length}`);
    oldPendingResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.phone_number} - ${Math.floor(row.hours_old)}h old: "${row.question_text?.substring(0, 50)}..."`);
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`📊 Pending answers: ${pendingAnswersResult.rows.length}`);
    console.log(`👥 Active users without pending: ${usersWithoutPendingResult.rows.length}`);
    console.log(`💬 Recent completed answers: ${recentAnswersResult.rows.length}`);
    console.log(`🔄 Users with duplicate pending: ${duplicatePendingResult.rows.length}`);
    console.log(`⏰ Old orphaned pending: ${oldPendingResult.rows.length}`);
    
    // Recommendations
    console.log('\n=== RECOMMENDATIONS ===');
    if (duplicatePendingResult.rows.length > 0) {
      console.log('⚠️  ISSUE: Users have multiple pending answers - this can cause recovery triggers');
    }
    if (oldPendingResult.rows.length > 0) {
      console.log('⚠️  ISSUE: Old orphaned pending answers exist - these should be cleaned up');
    }
    if (pendingAnswersResult.rows.length === 0 && usersWithoutPendingResult.rows.length > 0) {
      console.log('⚠️  POTENTIAL ISSUE: Active users without pending answers may trigger recovery when they reply');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

debugPendingAnswers();