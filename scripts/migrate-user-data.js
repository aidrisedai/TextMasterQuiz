import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

// Configuration
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL; // Your old database
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL; // Render database

if (!OLD_DATABASE_URL) {
    console.error('❌ Please set OLD_DATABASE_URL environment variable for source database');
    process.exit(1);
}

if (!NEW_DATABASE_URL) {
    console.error('❌ Please set NEW_DATABASE_URL or DATABASE_URL environment variable for target database');
    process.exit(1);
}

async function migrateUserData() {
    console.log('🚀 Starting User Data Migration');
    console.log('===============================\n');

    // Connect to both databases
    const oldClient = new Client({
        connectionString: OLD_DATABASE_URL,
        ssl: OLD_DATABASE_URL.includes('render.com') || OLD_DATABASE_URL.includes('supabase') 
            ? { rejectUnauthorized: false } 
            : false
    });

    const newClient = new Client({
        connectionString: NEW_DATABASE_URL,
        ssl: NEW_DATABASE_URL.includes('render.com') 
            ? { rejectUnauthorized: false } 
            : false
    });

    try {
        // Connect to both databases
        console.log('🔌 Connecting to old database...');
        await oldClient.connect();
        console.log('✅ Connected to old database');

        console.log('🔌 Connecting to new database...');
        await newClient.connect();
        console.log('✅ Connected to new database');

        // Step 1: Export and migrate users table
        console.log('\n👥 Step 1: Migrating Users');
        console.log('==========================');
        await migrateUsers(oldClient, newClient);

        // Step 2: Export and migrate user_answers table
        console.log('\n📝 Step 2: Migrating User Answers');
        console.log('=================================');
        await migrateUserAnswers(oldClient, newClient);

        // Step 3: Verification
        console.log('\n✅ Step 3: Verifying Migration');
        console.log('==============================');
        await verifyMigration(oldClient, newClient);

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await oldClient.end();
        await newClient.end();
    }
}

async function migrateUsers(oldClient, newClient) {
    try {
        // Get all users from old database
        console.log('📊 Fetching users from old database...');
        const oldUsers = await oldClient.query('SELECT * FROM users ORDER BY id');
        console.log(`Found ${oldUsers.rows.length} users to migrate`);

        if (oldUsers.rows.length === 0) {
            console.log('ℹ️  No users to migrate');
            return;
        }

        // Save backup
        const backup = {
            table: 'users',
            timestamp: new Date().toISOString(),
            data: oldUsers.rows
        };
        fs.writeFileSync(`user-backup-${new Date().toISOString().split('T')[0]}.json`, JSON.stringify(backup, null, 2));
        console.log('💾 User backup saved');

        // Check current users in new database
        const existingUsers = await newClient.query('SELECT phone_number FROM users');
        const existingPhones = new Set(existingUsers.rows.map(u => u.phone_number));
        console.log(`${existingUsers.rows.length} users already exist in target database`);

        // Migrate users in batches
        let migrated = 0;
        let skipped = 0;
        const batchSize = 50;

        for (let i = 0; i < oldUsers.rows.length; i += batchSize) {
            const batch = oldUsers.rows.slice(i, i + batchSize);
            
            for (const user of batch) {
                // Skip if user already exists (by phone number)
                if (existingPhones.has(user.phone_number || user.phoneNumber)) {
                    skipped++;
                    continue;
                }

                // Insert user with proper field mapping
                await newClient.query(`
                    INSERT INTO users (
                        phone_number, category_preferences, preferred_time, timezone, 
                        subscription_status, is_active, current_streak, total_score, 
                        questions_answered, correct_answers, last_quiz_date, last_answer, 
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (phone_number) DO NOTHING
                `, [
                    user.phone_number || user.phoneNumber,
                    user.category_preferences || user.categoryPreferences || [],
                    user.preferred_time || user.preferredTime || '09:00',
                    user.timezone || 'America/New_York',
                    user.subscription_status || user.subscriptionStatus || 'free',
                    user.is_active !== false, // Default to true unless explicitly false
                    user.current_streak || user.currentStreak || 0,
                    user.total_score || user.totalScore || 0,
                    user.questions_answered || user.questionsAnswered || 0,
                    user.correct_answers || user.correctAnswers || 0,
                    user.last_quiz_date || user.lastQuizDate || null,
                    user.last_answer || user.lastAnswer || null,
                    user.created_at || user.createdAt || new Date()
                ]);

                migrated++;
            }

            console.log(`   Processed ${Math.min(i + batchSize, oldUsers.rows.length)}/${oldUsers.rows.length} users`);
        }

        console.log(`✅ Users migration complete: ${migrated} migrated, ${skipped} skipped`);

    } catch (error) {
        console.error('❌ Users migration failed:', error);
        throw error;
    }
}

async function migrateUserAnswers(oldClient, newClient) {
    try {
        // Get total count first
        const countResult = await oldClient.query('SELECT COUNT(*) FROM user_answers');
        const totalAnswers = parseInt(countResult.rows[0].count);
        console.log(`📊 Found ${totalAnswers} user answers to migrate`);

        if (totalAnswers === 0) {
            console.log('ℹ️  No user answers to migrate');
            return;
        }

        // Get user ID mapping (old ID -> new ID) by phone number
        console.log('🗺️  Creating user ID mapping...');
        const oldUsers = await oldClient.query('SELECT id, phone_number FROM users');
        const newUsers = await newClient.query('SELECT id, phone_number FROM users');
        
        const userIdMap = new Map();
        for (const oldUser of oldUsers.rows) {
            const newUser = newUsers.rows.find(u => u.phone_number === (oldUser.phone_number || oldUser.phoneNumber));
            if (newUser) {
                userIdMap.set(oldUser.id, newUser.id);
            }
        }
        console.log(`📋 Mapped ${userIdMap.size} user IDs`);

        // Get question ID mapping (old question ID -> new question ID) by question text
        console.log('🗺️  Creating question ID mapping...');
        const oldQuestions = await oldClient.query('SELECT id, question_text FROM questions');
        const newQuestions = await newClient.query('SELECT id, question_text FROM questions');
        
        const questionIdMap = new Map();
        for (const oldQuestion of oldQuestions.rows) {
            const newQuestion = newQuestions.rows.find(q => q.question_text === oldQuestion.question_text);
            if (newQuestion) {
                questionIdMap.set(oldQuestion.id, newQuestion.id);
            }
        }
        console.log(`📋 Mapped ${questionIdMap.size} question IDs`);

        // Migrate user answers in batches
        let migrated = 0;
        let skipped = 0;
        const batchSize = 1000;
        let offset = 0;

        while (offset < totalAnswers) {
            console.log(`   Processing batch ${Math.floor(offset/batchSize) + 1}... (${offset}-${Math.min(offset + batchSize, totalAnswers)})`);
            
            const answers = await oldClient.query(`
                SELECT * FROM user_answers 
                ORDER BY id 
                LIMIT ${batchSize} OFFSET ${offset}
            `);

            for (const answer of answers.rows) {
                // Skip if we can't map user or question
                const newUserId = userIdMap.get(answer.user_id || answer.userId);
                const newQuestionId = questionIdMap.get(answer.question_id || answer.questionId);
                
                if (!newUserId || !newQuestionId) {
                    skipped++;
                    continue;
                }

                // Insert user answer
                try {
                    await newClient.query(`
                        INSERT INTO user_answers (
                            user_id, question_id, user_answer, is_correct, 
                            points_earned, answered_at
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        newUserId,
                        newQuestionId,
                        answer.user_answer || answer.userAnswer,
                        answer.is_correct !== false, // Default to true unless explicitly false
                        answer.points_earned || answer.pointsEarned || (answer.is_correct ? 10 : 0),
                        answer.answered_at || answer.answeredAt || new Date()
                    ]);
                    migrated++;
                } catch (insertError) {
                    if (insertError.message.includes('duplicate key')) {
                        skipped++;
                    } else {
                        console.error(`⚠️  Error inserting answer:`, insertError.message);
                        skipped++;
                    }
                }
            }

            offset += batchSize;
        }

        console.log(`✅ User answers migration complete: ${migrated} migrated, ${skipped} skipped`);

    } catch (error) {
        console.error('❌ User answers migration failed:', error);
        throw error;
    }
}

async function verifyMigration(oldClient, newClient) {
    try {
        // Compare user counts
        const oldUserCount = await oldClient.query('SELECT COUNT(*) FROM users');
        const newUserCount = await newClient.query('SELECT COUNT(*) FROM users');
        
        console.log(`👥 Users - Old: ${oldUserCount.rows[0].count}, New: ${newUserCount.rows[0].count}`);

        // Compare user_answers counts
        const oldAnswerCount = await oldClient.query('SELECT COUNT(*) FROM user_answers');
        const newAnswerCount = await newClient.query('SELECT COUNT(*) FROM user_answers');
        
        console.log(`📝 Answers - Old: ${oldAnswerCount.rows[0].count}, New: ${newAnswerCount.rows[0].count}`);

        // Sample verification - check a few users
        const sampleUsers = await newClient.query(`
            SELECT phone_number, current_streak, total_score, questions_answered 
            FROM users 
            ORDER BY total_score DESC 
            LIMIT 5
        `);

        console.log('\n📊 Sample migrated users:');
        sampleUsers.rows.forEach((user, i) => {
            console.log(`${i + 1}. ${user.phone_number} - Streak: ${user.current_streak}, Score: ${user.total_score}, Questions: ${user.questions_answered}`);
        });

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

// Run migration
migrateUserData().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
});