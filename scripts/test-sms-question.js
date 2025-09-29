#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;

console.log('📱 SMS Question Test System\n');

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function testSMSQuestion() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to database...');
    
    // Test database connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as timestamp');
    console.log(`✅ Connected! Database time: ${result.rows[0].timestamp}\n`);
    
    // Check total questions imported
    const countResult = await client.query('SELECT COUNT(*) as total FROM questions');
    const totalQuestions = parseInt(countResult.rows[0].total);
    console.log(`📊 Total questions in database: ${totalQuestions.toLocaleString()}`);
    
    if (totalQuestions === 0) {
      console.error('❌ No questions found in database!');
      console.error('Make sure the import completed successfully.');
      client.release();
      return;
    }
    
    // Get a random sample question
    console.log('\n🎯 Fetching a random question...\n');
    const questionResult = await client.query(`
      SELECT 
        id, question_text, option_a, option_b, option_c, option_d, 
        correct_answer, explanation, category, difficulty_level
      FROM questions 
      ORDER BY RANDOM() 
      LIMIT 1
    `);
    
    const question = questionResult.rows[0];
    
    // Format the SMS message as your system would send it
    console.log('📱 SMS MESSAGE PREVIEW:');
    console.log('='.repeat(50));
    console.log(`🧠 Daily Trivia Question\n`);
    console.log(`${question.question_text}\n`);
    console.log(`A) ${question.option_a}`);
    console.log(`B) ${question.option_b}`);
    console.log(`C) ${question.option_c}`);
    console.log(`D) ${question.option_d}\n`);
    console.log(`Reply with A, B, C, or D`);
    console.log('='.repeat(50));
    
    // Show question details
    console.log(`\n📋 Question Details:`);
    console.log(`   ID: ${question.id}`);
    console.log(`   Category: ${question.category}`);
    console.log(`   Difficulty: ${question.difficulty_level}`);
    console.log(`   Correct Answer: ${question.correct_answer}`);
    console.log(`   Explanation: ${question.explanation.substring(0, 100)}${question.explanation.length > 100 ? '...' : ''}`);
    
    // Test categories distribution
    console.log(`\n📊 Questions by Category:`);
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM questions 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    categoryResult.rows.forEach(row => {
      console.log(`   ${row.category}: ${parseInt(row.count).toLocaleString()} questions`);
    });
    
    // Test difficulty distribution
    console.log(`\n📊 Questions by Difficulty:`);
    const difficultyResult = await client.query(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM questions 
      GROUP BY difficulty_level 
      ORDER BY count DESC
    `);
    
    difficultyResult.rows.forEach(row => {
      console.log(`   ${row.difficulty_level}: ${parseInt(row.count).toLocaleString()} questions`);
    });
    
    console.log(`\n✅ SMS System Test Complete!`);
    console.log(`🎯 Your database is ready for SMS delivery with ${totalQuestions.toLocaleString()} questions!`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test
testSMSQuestion();