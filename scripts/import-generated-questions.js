import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

async function importGeneratedQuestions() {
    // Get the JSON filename
    const jsonFiles = fs.readdirSync('.').filter(f => f.startsWith('generated-questions-') && f.endsWith('.json'));
    if (jsonFiles.length === 0) {
        console.error('❌ No generated-questions JSON files found');
        process.exit(1);
    }
    
    const filename = jsonFiles[0]; // Use the most recent one
    console.log(`📁 Importing from: ${filename}`);

    // Read the JSON file
    let questions;
    try {
        const fileContent = fs.readFileSync(filename, 'utf8');
        questions = JSON.parse(fileContent);
        console.log(`📊 Found ${questions.length} questions to import`);
    } catch (error) {
        console.error('❌ Error reading JSON file:', error.message);
        process.exit(1);
    }

    // Connect to database
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        // Check existing counts before import
        const beforeCounts = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM questions 
            WHERE category IN ('music', 'movies') 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('\\n📊 Current counts before import:');
        beforeCounts.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} questions`);
        });

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        console.log('\\n🚀 Starting import...');
        console.log('=' .repeat(60));

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            try {
                // Check if question already exists (avoid duplicates)
                const duplicate = await client.query(
                    'SELECT id FROM questions WHERE question_text = $1',
                    [question.question_text]
                );

                if (duplicate.rows.length > 0) {
                    skipped++;
                    if (i % 50 === 0) console.log(`   Progress: ${i + 1}/${questions.length} (${skipped} skipped, ${errors} errors)`);
                    continue;
                }

                // Insert the question
                await client.query(`
                    INSERT INTO questions 
                    (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty_level, usage_count, created_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    question.question_text,
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                    question.correct_answer,
                    question.explanation,
                    question.category,
                    question.difficulty_level,
                    question.usage_count || 0,
                    question.created_date || new Date().toISOString()
                ]);

                imported++;
                
                // Progress update every 25 questions
                if ((i + 1) % 25 === 0) {
                    console.log(`   ✓ Imported ${i + 1}/${questions.length} questions (${imported} new, ${skipped} duplicates)`);
                }

            } catch (error) {
                errors++;
                console.error(`   ❌ Error importing question ${i + 1}: ${error.message}`);
                if (errors > 10) {
                    console.error('Too many errors, stopping import');
                    break;
                }
            }
        }

        console.log('=' .repeat(60));
        console.log(`\\n📊 Import Summary:`);
        console.log(`   ✅ Successfully imported: ${imported} questions`);
        console.log(`   ⚠️  Skipped (duplicates): ${skipped} questions`);
        console.log(`   ❌ Errors: ${errors} questions`);

        // Check counts after import
        const afterCounts = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM questions 
            WHERE category IN ('music', 'movies') 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('\\n📊 Final counts after import:');
        afterCounts.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} questions`);
        });

        console.log('\\n✅ Import completed successfully!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

importGeneratedQuestions();