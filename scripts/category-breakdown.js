import pkg from 'pg';
const { Client } = pkg;

async function getCategoryBreakdown() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('🔌 Connected to database');

        // Get total count
        const totalResult = await client.query('SELECT COUNT(*) as total FROM questions');
        const totalQuestions = parseInt(totalResult.rows[0].total);

        console.log(`📊 Total Questions: ${totalQuestions.toLocaleString()}`);
        console.log('');

        // Get category breakdown
        const categoryResult = await client.query(`
            SELECT 
                category,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / $1, 2) as percentage
            FROM questions 
            GROUP BY category 
            ORDER BY COUNT(*) DESC
        `, [totalQuestions]);

        console.log('📋 Category Breakdown:');
        console.log('='.repeat(60));

        categoryResult.rows.forEach((row, index) => {
            const rank = (index + 1).toString().padStart(2, ' ');
            const category = row.category.padEnd(20, ' ');
            const count = row.count.toLocaleString().padStart(8, ' ');
            const percentage = `${row.percentage}%`.padStart(7, ' ');
            
            console.log(`${rank}. ${category} ${count} questions ${percentage}`);
        });

        console.log('='.repeat(60));
        console.log('');

        // Get difficulty breakdown
        const difficultyResult = await client.query(`
            SELECT 
                difficulty_level,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / $1, 2) as percentage
            FROM questions 
            GROUP BY difficulty_level 
            ORDER BY 
                CASE difficulty_level
                    WHEN 'easy' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'hard' THEN 3
                    ELSE 4
                END
        `, [totalQuestions]);

        console.log('🎯 Difficulty Breakdown:');
        console.log('='.repeat(40));

        difficultyResult.rows.forEach((row) => {
            const difficulty = row.difficulty_level.padEnd(10, ' ');
            const count = row.count.toLocaleString().padStart(8, ' ');
            const percentage = `${row.percentage}%`.padStart(7, ' ');
            
            console.log(`${difficulty} ${count} questions ${percentage}`);
        });

        console.log('='.repeat(40));
        console.log('');

        // Show top categories with difficulty breakdown
        console.log('🔍 Top 5 Categories with Difficulty Breakdown:');
        console.log('='.repeat(70));

        const topCategories = categoryResult.rows.slice(0, 5);
        
        for (const category of topCategories) {
            const diffBreakdown = await client.query(`
                SELECT 
                    difficulty_level,
                    COUNT(*) as count
                FROM questions 
                WHERE category = $1
                GROUP BY difficulty_level 
                ORDER BY 
                    CASE difficulty_level
                        WHEN 'easy' THEN 1
                        WHEN 'medium' THEN 2
                        WHEN 'hard' THEN 3
                        ELSE 4
                    END
            `, [category.category]);

            console.log(`\n📁 ${category.category.toUpperCase()} (${category.count.toLocaleString()} total):`);
            
            diffBreakdown.rows.forEach((row) => {
                const difficulty = row.difficulty_level.padEnd(8, ' ');
                const count = row.count.toLocaleString().padStart(6, ' ');
                const categoryPercentage = ((row.count / category.count) * 100).toFixed(1);
                
                console.log(`   ${difficulty} ${count} (${categoryPercentage}%)`);
            });
        }

        console.log('\n✅ Category analysis complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

getCategoryBreakdown();