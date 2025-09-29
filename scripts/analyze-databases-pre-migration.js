import pkg from 'pg';
const { Client } = pkg;

async function analyzeDatabases() {
    console.log('🔍 Database Migration Analysis');
    console.log('==============================\n');

    const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
    const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;

    if (!OLD_DATABASE_URL) {
        console.error('❌ Please set OLD_DATABASE_URL environment variable');
        return;
    }

    if (!NEW_DATABASE_URL) {
        console.error('❌ Please set NEW_DATABASE_URL or DATABASE_URL environment variable');
        return;
    }

    // Analyze old database
    console.log('📊 OLD DATABASE ANALYSIS');
    console.log('========================');
    await analyzeDatabase('Old', OLD_DATABASE_URL);

    console.log('\n📊 NEW DATABASE ANALYSIS');
    console.log('========================');
    await analyzeDatabase('New', NEW_DATABASE_URL);

    console.log('\n✅ Analysis complete!');
}

async function analyzeDatabase(label, connectionString) {
    const client = new Client({
        connectionString,
        ssl: connectionString.includes('render.com') || connectionString.includes('supabase') 
            ? { rejectUnauthorized: false } 
            : false
    });

    try {
        await client.connect();
        console.log(`✅ Connected to ${label} database`);

        // Check if tables exist and get counts
        const tables = ['users', 'user_answers', 'questions'];
        
        for (const table of tables) {
            try {
                const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📋 ${table}: ${result.rows[0].count} records`);
            } catch (error) {
                console.log(`⚠️  ${table}: Table not found or error - ${error.message}`);
            }
        }

        // Check users table structure
        try {
            const userSample = await client.query('SELECT * FROM users LIMIT 1');
            if (userSample.rows.length > 0) {
                console.log(`\n👥 Users table columns:`, Object.keys(userSample.rows[0]));
            }
        } catch (error) {
            console.log('⚠️  Could not analyze users table structure');
        }

        // Check user_answers table structure
        try {
            const answerSample = await client.query('SELECT * FROM user_answers LIMIT 1');
            if (answerSample.rows.length > 0) {
                console.log(`📝 User answers table columns:`, Object.keys(answerSample.rows[0]));
            }
        } catch (error) {
            console.log('⚠️  Could not analyze user_answers table structure');
        }

        // Get some sample data statistics
        try {
            const stats = await client.query(`
                SELECT 
                    MIN(created_at) as oldest_user,
                    MAX(created_at) as newest_user,
                    AVG(total_score::numeric) as avg_score,
                    MAX(current_streak) as max_streak
                FROM users 
                WHERE created_at IS NOT NULL
            `);
            
            if (stats.rows.length > 0 && stats.rows[0].oldest_user) {
                console.log(`📈 User statistics:`);
                console.log(`   Oldest user: ${stats.rows[0].oldest_user}`);
                console.log(`   Newest user: ${stats.rows[0].newest_user}`);
                console.log(`   Average score: ${Math.round(stats.rows[0].avg_score || 0)}`);
                console.log(`   Max streak: ${stats.rows[0].max_streak || 0}`);
            }
        } catch (error) {
            console.log('⚠️  Could not get user statistics');
        }

    } catch (error) {
        console.error(`❌ Failed to connect to ${label} database:`, error.message);
    } finally {
        await client.end();
    }
}

// Run analysis
analyzeDatabases();