import pkg from 'pg';
const { Client } = pkg;

async function testDatabaseConnection() {
    console.log('🔧 Database Connection Diagnostic Tool');
    console.log('=====================================\n');

    // Test different connection configurations
    const configs = [
        {
            name: 'Original Render URL',
            connectionString: 'postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz?sslmode=require',
            ssl: { rejectUnauthorized: false }
        },
        {
            name: 'Without SSL mode parameter',
            connectionString: 'postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz',
            ssl: { rejectUnauthorized: false }
        },
        {
            name: 'With different SSL config',
            connectionString: 'postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz',
            ssl: true
        },
        {
            name: 'Without SSL',
            connectionString: 'postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz',
            ssl: false
        }
    ];

    for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        console.log(`${i + 1}. Testing: ${config.name}`);
        
        const client = new Client({
            connectionString: config.connectionString,
            ssl: config.ssl,
            connectionTimeoutMillis: 10000, // 10 second timeout
        });

        try {
            console.log('   🔌 Attempting connection...');
            await client.connect();
            console.log('   ✅ Connection successful!');
            
            // Test a simple query
            const result = await client.query('SELECT COUNT(*) as total_questions FROM questions');
            console.log(`   📊 Total questions in database: ${result.rows[0].total_questions}`);
            
            // Test music/movies counts
            const counts = await client.query(`
                SELECT category, COUNT(*) as count 
                FROM questions 
                WHERE category IN ('music', 'movies') 
                GROUP BY category 
                ORDER BY category
            `);
            
            console.log('   📋 Current music/movies counts:');
            counts.rows.forEach(row => {
                console.log(`      ${row.category}: ${row.count} questions`);
            });
            
            await client.end();
            console.log('   ✅ This configuration works!\n');
            
            // Save working config for later use
            const workingConfig = {
                connectionString: config.connectionString,
                ssl: config.ssl
            };
            
            console.log('🎯 WORKING CONFIGURATION FOUND:');
            console.log(JSON.stringify(workingConfig, null, 2));
            return workingConfig;
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            try {
                await client.end();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
        console.log('');
    }
    
    console.log('❌ All connection attempts failed');
    return null;
}

testDatabaseConnection();