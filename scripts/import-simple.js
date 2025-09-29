#!/usr/bin/env node
import * as fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

console.log('📥 Simple Question Import System\n');

// Check arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Usage: node scripts/import-simple.js <json-file>');
  console.error('Example: node scripts/import-simple.js questions.json');
  process.exit(1);
}

const jsonFilePath = args[0];

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function importQuestions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(`📂 Loading JSON file: ${jsonFilePath}`);
    const fileData = fs.readFileSync(jsonFilePath, 'utf8');
    
    console.log(`💾 Parsing JSON data...`);
    const questions = JSON.parse(fileData);
    
    console.log(`📊 Found ${questions.length} questions to import`);
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as timestamp');
    console.log(`✅ Connected! Database time: ${result.rows[0].timestamp}`);
    client.release();

    // Import in batches
    const batchSize = 100;
    let imported = 0;
    let errors = 0;
    
    console.log(`\n🔄 Starting import in batches of ${batchSize}...\n`);
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)`);
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const question of batch) {
          try {
            await client.query(`
              INSERT INTO questions (
                question_text, option_a, option_b, option_c, option_d,
                correct_answer, explanation, category, difficulty_level,
                usage_count, created_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              question.question_text,
              question.option_a, 
              question.option_b,
              question.option_c,
              question.option_d,
              question.correct_answer,
              question.explanation || '',
              question.category || 'general',
              question.difficulty_level || 'medium',
              parseInt(question.usage_count) || 0,
              question.created_date || new Date()
            ]);
            
            imported++;
          } catch (err) {
            errors++;
            console.error(`   ❌ Error with question: ${err.message}`);
          }
        }
        
        await client.query('COMMIT');
        console.log(`   ✅ Batch ${batchNum} completed (${batch.length} questions processed)`);
        
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Batch ${batchNum} failed: ${err.message}`);
        errors += batch.length;
      } finally {
        client.release();
      }
      
      // Progress update
      const progress = Math.round((i + batch.length) / questions.length * 100);
      console.log(`   📊 Progress: ${progress}% (${imported} imported, ${errors} errors)\n`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final stats
    console.log('='.repeat(60));
    console.log('🎉 IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 Total questions in file: ${questions.length.toLocaleString()}`);
    console.log(`✅ Successfully imported: ${imported.toLocaleString()}`);
    console.log(`❌ Errors: ${errors.toLocaleString()}`);
    console.log(`📈 Success rate: ${((imported / questions.length) * 100).toFixed(1)}%`);
    
    if (imported > 0) {
      console.log(`\n🎯 Your database now has ${imported.toLocaleString()} questions ready for SMS delivery!`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run import
importQuestions();