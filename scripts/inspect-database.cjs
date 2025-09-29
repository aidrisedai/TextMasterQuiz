const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function inspectDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Inspecting database state...\n');
    
    // Show all tables
    console.log('📋 Tables:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Count records in each table
    console.log('\n📊 Record counts:');
    for (const table of tables.rows) {
      try {
        const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
        console.log(`  - ${table.table_name}: ${count.rows[0].count} records`);
      } catch (error) {
        console.log(`  - ${table.table_name}: Error counting - ${error.message}`);
      }
    }
    
    // Check question IDs that user_answers references
    console.log('\n🔗 Question ID analysis:');
    const fs = require('fs');
    const userAnswersData = JSON.parse(fs.readFileSync('user_answers.json', 'utf8'));
    
    const questionIds = [...new Set(userAnswersData.map(a => a.question_id))];
    console.log(`  - User answers reference ${questionIds.length} unique question IDs`);
    console.log(`  - Question ID range: ${Math.min(...questionIds)} to ${Math.max(...questionIds)}`);
    
    // Check if these question IDs exist in the database
    const existingIds = await client.query(`
      SELECT id FROM questions 
      WHERE id = ANY($1) 
      ORDER BY id 
      LIMIT 10
    `, [questionIds]);
    
    console.log(`  - Found ${existingIds.rows.length} matching questions in DB`);
    if (existingIds.rows.length > 0) {
      console.log(`  - Sample existing IDs: ${existingIds.rows.map(r => r.id).join(', ')}`);
    }
    
    // Show sample questions from database
    console.log('\n📝 Sample questions from database:');
    const sampleQuestions = await client.query('SELECT id, question_text FROM questions ORDER BY id LIMIT 5');
    sampleQuestions.rows.forEach(q => {
      console.log(`  - ID ${q.id}: ${q.question_text.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
  } finally {
    client.release();
  }
}

inspectDatabase().then(() => process.exit(0)).catch(console.error);