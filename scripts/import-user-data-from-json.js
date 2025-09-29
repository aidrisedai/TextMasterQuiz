import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

async function importUserDataFromJSON() {
    console.log('📂 Importing User Data from JSON Files');
    console.log('=====================================\n');

    // Database connection
    const DATABASE_URL = process.env.DATABASE_URL || process.env.NEW_DATABASE_URL;
    if (!DATABASE_URL) {
        console.error('❌ Please set DATABASE_URL environment variable');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('render.com') 
            ? { rejectUnauthorized: false } 
            : false
    });

    try {
        // Connect to database
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        // Import users first
        console.log('\n👥 Step 1: Importing Users');
        console.log('=========================');
        await importUsers(client);

        // Import user answers
        console.log('\n📝 Step 2: Importing User Answers');
        console.log('=================================');
        await importUserAnswers(client);

        // Verify import
        console.log('\n✅ Step 3: Verifying Import');
        console.log('===========================');
        await verifyImport(client);

        console.log('\n🎉 Import completed successfully!');
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function importUsers(client) {
    try {
        // Read users JSON file
        if (!fs.existsSync('users.json')) {
            console.error('❌ users.json file not found in project root');
            return;
        }

        const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
        console.log(`📊 Found ${usersData.length} users to import`);

        // Check existing users
        const existingUsers = await client.query('SELECT phone_number FROM users');
        const existingPhones = new Set(existingUsers.rows.map(u => u.phone_number));
        console.log(`${existingUsers.rows.length} users already exist in database`);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        // Import users one by one with better error handling
        for (let i = 0; i < usersData.length; i++) {
            const user = usersData[i];

            try {
                // Skip if user already exists
                if (existingPhones.has(user.phone_number)) {
                    skipped++;
                    console.log(`   Skipped user ${i + 1}: ${user.phone_number} (already exists)`);
                    continue;
                }

                // Insert user with proper mapping to your database schema
                await client.query(`
                    INSERT INTO users (
                        phone_number, category_preferences, preferred_time, timezone, 
                        subscription_status, is_active, current_streak, total_score, 
                        questions_answered, correct_answers, last_quiz_date, last_answer,
                        accepts_broadcasts, current_category_index, join_date
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                    user.phone_number,
                    user.category_preferences || [],
                    user.preferred_time || '09:00',
                    user.timezone || 'America/New_York',
                    user.subscription_status || 'free',
                    user.is_active !== false, // Default to true unless explicitly false
                    user.current_streak || 0,
                    user.total_score || 0,
                    user.questions_answered || 0,
                    user.correct_answers || 0,
                    user.last_quiz_date ? new Date(user.last_quiz_date) : null,
                    user.last_answer || null,
                    user.accepts_broadcasts !== false, // Default to true unless explicitly false
                    user.current_category_index || 0,
                    user.join_date ? new Date(user.join_date) : new Date()
                ]);

                imported++;
                
                if (imported % 10 === 0) {
                    console.log(`   ✓ Imported ${imported} users...`);
                }

            } catch (error) {
                errors++;
                console.error(`   ❌ Error importing user ${user.phone_number}:`, error.message);
                if (errors > 5) {
                    console.error('Too many errors, stopping user import');
                    break;
                }
            }
        }

        console.log(`✅ Users import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
        
    } catch (error) {
        console.error('❌ Users import failed:', error);
        throw error;
    }
}

async function importUserAnswers(client) {
    try {
        // Read user_answers JSON file
        if (!fs.existsSync('user_answers.json')) {
            console.error('❌ user_answers.json file not found in project root');
            return;
        }

        const answersData = JSON.parse(fs.readFileSync('user_answers.json', 'utf8'));
        console.log(`📊 Found ${answersData.length} user answers to import`);

        // Get user ID mapping (old_id -> new_id by phone number)
        console.log('🗺️  Creating user ID mapping...');
        const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
        const newUsers = await client.query('SELECT id, phone_number FROM users');
        
        const userIdMap = new Map();
        for (const oldUser of usersData) {
            const newUser = newUsers.rows.find(u => u.phone_number === oldUser.phone_number);
            if (newUser) {
                userIdMap.set(oldUser.id, newUser.id);
            }
        }
        console.log(`📋 Mapped ${userIdMap.size} user IDs`);

        // Get question ID mapping (we'll match by question text for the first few, then use direct IDs)
        console.log('🗺️  Creating question ID mapping...');
        const questions = await client.query('SELECT id, question_text FROM questions LIMIT 1000');
        const questionTextMap = new Map();
        questions.rows.forEach(q => {
            questionTextMap.set(q.question_text, q.id);
        });

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        // Import answers in batches
        const batchSize = 100;
        for (let i = 0; i < answersData.length; i += batchSize) {
            const batch = answersData.slice(i, i + batchSize);
            console.log(`   Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(answersData.length/batchSize)}...`);

            for (const answer of batch) {
                try {
                    // Map old user ID to new user ID
                    const newUserId = userIdMap.get(answer.user_id);
                    if (!newUserId) {
                        skipped++;
                        continue;
                    }

                    // For question_id, we'll use it directly if it exists in our database
                    // (since you likely imported questions and they should have consistent IDs)
                    const questionId = answer.question_id;

                    // Validate question exists
                    const questionExists = await client.query('SELECT id FROM questions WHERE id = $1', [questionId]);
                    if (questionExists.rows.length === 0) {
                        skipped++;
                        continue;
                    }

                    // Insert answer
                    await client.query(`
                        INSERT INTO user_answers (
                            user_id, question_id, user_answer, is_correct, 
                            points_earned, answered_at
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        newUserId,
                        questionId,
                        answer.user_answer,
                        answer.is_correct,
                        answer.points_earned || (answer.is_correct ? 10 : 0),
                        answer.answered_at ? new Date(answer.answered_at) : new Date()
                    ]);

                    imported++;

                } catch (error) {
                    errors++;
                    if (errors <= 10) { // Only log first 10 errors to avoid spam
                        console.error(`   ⚠️  Error importing answer for user ${newUserId}, question ${questionId}:`, error.message);
                    }
                    // Skip duplicates more gracefully
                    if (error.message.includes('duplicate key')) {
                        skipped++;
                        errors--; // Don't count duplicates as errors
                    }
                }
            }
        }

        console.log(`✅ User answers import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
        
    } catch (error) {
        console.error('❌ User answers import failed:', error);
        throw error;
    }
}

async function verifyImport(client) {
    try {
        // Count imported users
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        console.log(`👥 Total users in database: ${userCount.rows[0].count}`);

        // Count imported answers
        const answerCount = await client.query('SELECT COUNT(*) FROM user_answers');
        console.log(`📝 Total user answers in database: ${answerCount.rows[0].count}`);

        // Show some sample users with their stats
        const sampleUsers = await client.query(`
            SELECT phone_number, current_streak, total_score, questions_answered, is_active
            FROM users 
            WHERE questions_answered > 0
            ORDER BY total_score DESC 
            LIMIT 5
        `);

        console.log('\n📊 Sample imported users (top scorers):');
        sampleUsers.rows.forEach((user, i) => {
            console.log(`${i + 1}. ${user.phone_number} - Streak: ${user.current_streak}, Score: ${user.total_score}, Questions: ${user.questions_answered}, Active: ${user.is_active}`);
        });

        // Check category distribution
        const categoryStats = await client.query(`
            SELECT 
                UNNEST(category_preferences) as category,
                COUNT(*) as user_count
            FROM users 
            WHERE array_length(category_preferences, 1) > 0
            GROUP BY category 
            ORDER BY user_count DESC 
            LIMIT 10
        `);

        console.log('\n📊 Top user category preferences:');
        categoryStats.rows.forEach((cat, i) => {
            console.log(`${i + 1}. ${cat.category}: ${cat.user_count} users`);
        });

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Run import
importUserDataFromJSON();