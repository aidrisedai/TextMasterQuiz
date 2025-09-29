const { Pool } = require('pg');
const fs = require('fs');

// Load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using environment variables directly');
}

// Database connection - using the database with questions and new user tables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function importUsersFromJSON() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting user data import from JSON files...');
    
    // Read and parse JSON files
    console.log('📖 Reading JSON files...');
    const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const userAnswersData = JSON.parse(fs.readFileSync('user_answers.json', 'utf8'));
    
    console.log(`📊 Found ${usersData.length} users and ${userAnswersData.length} user answers`);
    
    await client.query('BEGIN');
    
    // Import users first
    console.log('👥 Importing users...');
    let usersImported = 0;
    let usersSkipped = 0;
    const batchSize = 100;
    
    for (let i = 0; i < usersData.length; i += batchSize) {
      const batch = usersData.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          // Check if user already exists
          const existingUser = await client.query('SELECT id FROM users WHERE phone_number = $1', [user.phone_number]);
          
          if (existingUser.rows.length > 0) {
            usersSkipped++;
            continue;
          }
          
          // Insert user with correct column names
          await client.query(`
            INSERT INTO users (
              id, phone_number, timezone, preferred_time, 
              current_streak, total_score, last_quiz_date, join_date,
              questions_answered, correct_answers, subscription_status,
              is_active, accepts_broadcasts, current_category_index
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            user.id,
            user.phone_number,
            user.timezone,
            user.preferred_time || '09:00',
            user.current_streak || 0,
            user.total_score || 0,
            user.last_quiz_date,
            user.join_date,
            user.questions_answered || 0,
            user.correct_answers || 0,
            user.subscription_status || 'active',
            user.is_active !== false, // default to true unless explicitly false
            user.accepts_broadcasts !== false, // default to true unless explicitly false
            user.current_category_index || 0
          ]);
          
          usersImported++;
          
        } catch (error) {
          console.error(`❌ Error importing user ${user.id}:`, error.message);
        }
      }
      
      console.log(`👥 Processed ${Math.min(i + batchSize, usersData.length)}/${usersData.length} users`);
    }
    
    console.log(`✅ Users import complete: ${usersImported} imported, ${usersSkipped} skipped`);
    
    // Import user answers
    console.log('📝 Importing user answers...');
    let answersImported = 0;
    let answersSkipped = 0;
    let invalidQuestionIds = 0;
    let invalidUserIds = 0;
    
    // Get all valid question IDs and user IDs for validation
    console.log('📊 Getting valid question IDs...');
    const validQuestionIds = await client.query('SELECT id FROM questions');
    const validQuestionIdSet = new Set(validQuestionIds.rows.map(row => row.id));
    console.log(`📋 Found ${validQuestionIdSet.size} valid question IDs`);
    
    console.log('📊 Getting valid user IDs...');
    const validUserIds = await client.query('SELECT id FROM users');
    const validUserIdSet = new Set(validUserIds.rows.map(row => row.id));
    console.log(`📋 Found ${validUserIdSet.size} valid user IDs`);
    
    for (let i = 0; i < userAnswersData.length; i += batchSize) {
      const batch = userAnswersData.slice(i, i + batchSize);
      
      for (const answer of batch) {
        try {
          // Check if user ID exists
          if (!validUserIdSet.has(answer.user_id)) {
            invalidUserIds++;
            continue;
          }
          
          // Check if question ID exists
          if (!validQuestionIdSet.has(answer.question_id)) {
            invalidQuestionIds++;
            continue;
          }
          
          // Check if answer already exists
          const existingAnswer = await client.query(
            'SELECT id FROM user_answers WHERE id = $1', 
            [answer.id]
          );
          
          if (existingAnswer.rows.length > 0) {
            answersSkipped++;
            continue;
          }
          
          // Insert user answer
          await client.query(`
            INSERT INTO user_answers (
              id, user_id, question_id, user_answer, 
              is_correct, answered_at, points_earned
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            answer.id,
            answer.user_id,
            answer.question_id,
            answer.user_answer,
            answer.is_correct,
            answer.answered_at,
            answer.points_earned || 0
          ]);
          
          answersImported++;
          
        } catch (error) {
          console.error(`❌ Error importing user answer ${answer.id}:`, error.message);
        }
      }
      
      console.log(`📝 Processed ${Math.min(i + batchSize, userAnswersData.length)}/${userAnswersData.length} user answers`);
    }
    
    console.log(`✅ User answers import complete: ${answersImported} imported, ${answersSkipped} skipped, ${invalidQuestionIds} invalid question IDs, ${invalidUserIds} invalid user IDs`);
    
    await client.query('COMMIT');
    
    // Final statistics
    console.log('\n📈 Final Import Statistics:');
    console.log(`👥 Users: ${usersImported} imported, ${usersSkipped} skipped`);
    console.log(`📝 User Answers: ${answersImported} imported, ${answersSkipped} skipped, ${invalidQuestionIds} invalid question IDs, ${invalidUserIds} invalid user IDs`);
    
    // Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const answerCount = await client.query('SELECT COUNT(*) FROM user_answers');
    const questionCount = await client.query('SELECT COUNT(*) FROM questions');
    
    console.log(`Database contains:`);
    console.log(`  - ${userCount.rows[0].count} users`);
    console.log(`  - ${answerCount.rows[0].count} user answers`);
    console.log(`  - ${questionCount.rows[0].count} questions`);
    
    console.log('\n✅ User data import completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the import
if (require.main === module) {
  importUsersFromJSON()
    .then(() => {
      console.log('🎉 Import process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { importUsersFromJSON };