import pkg from 'pg';
const { Client } = pkg;
import { GoogleGenAI } from '@google/genai';

async function expandCategories() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('🔌 Connected to database');

        // Optional merge-only mode
        const mergeOnly = process.env.MERGE_ONLY === 'true';

        // Step 1: Merge "Art" into "Arts"
        console.log('\n📝 Step 1: Merging "Art" category into "Arts"...');
        
        const artQuestions = await client.query('SELECT * FROM questions WHERE category = $1', ['Art']);
        console.log(`Found ${artQuestions.rows.length} questions in "Art" category`);

        if (artQuestions.rows.length > 0) {
            await client.query('UPDATE questions SET category = $1 WHERE category = $2', ['arts', 'Art']);
            console.log('✅ Successfully merged "Art" into "arts"');
        }

        // Step 2: Check current counts
        const currentCounts = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM questions 
            WHERE category IN ('music', 'movies') 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('\n📊 Current counts:');
        currentCounts.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} questions`);
        });

        // Step 3: Generate target counts (start small; we can scale up after a pilot)
        const targetMusic = parseInt(process.env.TARGET_MUSIC || '50');
        const targetMovies = parseInt(process.env.TARGET_MOVIES || '50');

        const currentMusic = currentCounts.rows.find(r => r.category === 'music')?.count || 0;
        const currentMovies = currentCounts.rows.find(r => r.category === 'movies')?.count || 0;

        const needMusic = targetMusic - parseInt(currentMusic);
        const needMovies = targetMovies - parseInt(currentMovies);

        console.log(`\n🎯 Target expansion:`);
        console.log(`   Music: Need ${needMusic} more questions (current: ${currentMusic}, target: ${targetMusic})`);
        console.log(`   Movies: Need ${needMovies} more questions (current: ${currentMovies}, target: ${targetMovies})`);

        if (!mergeOnly) {
            // Step 4: Generate Music questions
            if (needMusic > 0) {
                console.log(`\n🎵 Generating ${needMusic} unique Music questions...`);
                await generateMusicQuestions(client, needMusic);
            }

            // Step 5: Generate Movies questions
            if (needMovies > 0) {
                console.log(`\n🎬 Generating ${needMovies} unique Movies questions...`);
                await generateMovieQuestions(client, needMovies);
            }
        } else {
            console.log('\n🛑 MERGE_ONLY=true set — skipping AI generation.');
        }

        // Step 6: Final report
        const finalCounts = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM questions 
            GROUP BY category 
            ORDER BY COUNT(*) DESC
        `);

        console.log('\n📊 Final category breakdown:');
        console.log('='.repeat(50));
        finalCounts.rows.forEach((row, index) => {
            const rank = (index + 1).toString().padStart(2, ' ');
            const category = row.category.padEnd(15, ' ');
            const count = row.count.toLocaleString().padStart(8, ' ');
            console.log(`${rank}. ${category} ${count} questions`);
        });

        console.log('\n✅ Category expansion complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

async function generateMusicQuestions(client, count) {
    const musicTopics = [
        'Classical composers and their famous works',
        'Rock bands and their hit songs',
        'Pop music history and artists',
        'Jazz musicians and instruments',
        'Country music legends',
        'Hip-hop artists and culture',
        'Electronic music genres',
        'Musical instruments and terminology',
        'Music theory and notation',
        'Grammy Awards and music industry',
        'World music and traditional instruments',
        'Music production and recording',
        'Famous music venues and concerts',
        'Music videos and MTV history',
        'Soundtrack composers for films',
        'Opera singers and famous operas',
        'Blues musicians and history',
        'Reggae and Caribbean music',
        'Folk music traditions',
        'Music festivals around the world'
    ];

    const questions = [];
    const batchSize = Math.min(100, count);
    const batches = Math.ceil(count / batchSize);

    for (let batch = 0; batch < batches; batch++) {
        const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
        console.log(`   Generating batch ${batch + 1}/${batches} (${currentBatchSize} questions)...`);

        const batchQuestions = await generateMusicQuestionBatch(client, currentBatchSize, musicTopics);
        questions.push(...batchQuestions);
        
        // Add small delay to avoid API rate limits
        if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`   ✅ Generated ${questions.length} unique music questions`);
    return questions;
}

async function generateMovieQuestions(client, count) {
    const movieTopics = [
        'Academy Awards and Oscar winners',
        'Classic Hollywood golden age films',
        'Modern blockbuster movies',
        'Independent and arthouse cinema',
        'Horror movies and directors',
        'Science fiction films',
        'Comedy movies and actors',
        'Action and adventure films',
        'Animated movies and studios',
        'Documentary films',
        'Foreign language cinema',
        'Film directors and their styles',
        'Movie actors and actresses',
        'Film production and cinematography',
        'Movie soundtracks and composers',
        'Film festivals and awards',
        'Superhero and comic book movies',
        'Romantic films and drama',
        'Thriller and suspense movies',
        'Movie franchises and sequels'
    ];

    const questions = [];
    const batchSize = Math.min(100, count);
    const batches = Math.ceil(count / batchSize);

    for (let batch = 0; batch < batches; batch++) {
        const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
        console.log(`   Generating batch ${batch + 1}/${batches} (${currentBatchSize} questions)...`);

        const batchQuestions = await generateMovieQuestionBatch(client, currentBatchSize, movieTopics);
        questions.push(...batchQuestions);
        
        // Add small delay to avoid API rate limits
        if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`   ✅ Generated ${questions.length} unique movie questions`);
    return questions;
}

async function generateMusicQuestionBatch(client, count, topics) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY/GEMINI_API_KEY');
    const ai = new GoogleGenAI({ apiKey });
    const questions = [];
    
    // Get existing music questions to avoid duplicates
    const existingQuestions = await client.query(
        'SELECT question_text FROM questions WHERE category = $1 ORDER BY RANDOM() LIMIT 20',
        ['music']
    );
    const existingTexts = existingQuestions.rows.map(row => row.question_text);
    
    for (let i = 0; i < count; i++) {
        const topic = topics[i % topics.length];
        
        try {
            const prompt = `Generate a medium difficulty music trivia question about "${topic}".
            
Requirements:
            - Create an engaging, educational question
            - Provide 4 multiple choice options (A, B, C, D)
            - Only one correct answer
            - Include a detailed explanation (2-3 sentences)
            - Make it challenging but fair for music enthusiasts
            - Ensure factual accuracy
            ${existingTexts.length > 0 ? `\n\nAvoid questions similar to these existing ones:\n${existingTexts.slice(0, 5).join('\n')}` : ''}
            
            Return the response in this exact JSON format:
            {
              "questionText": "Your question here",
              "optionA": "First option",
              "optionB": "Second option", 
              "optionC": "Third option",
              "optionD": "Fourth option",
              "correctAnswer": "A",
              "explanation": "Detailed explanation here"
            }`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: {
                    responseMimeType: 'application/json'
                },
                contents: prompt
            });
            const text = result.text;
            
            // Clean the response text to extract JSON
            let jsonText = text.trim();
            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            } else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }
            
            const aiQuestion = JSON.parse(jsonText);
            
            const question = {
                question_text: aiQuestion.questionText,
                option_a: aiQuestion.optionA,
                option_b: aiQuestion.optionB,
                option_c: aiQuestion.optionC,
                option_d: aiQuestion.optionD,
                correct_answer: aiQuestion.correctAnswer,
                explanation: aiQuestion.explanation,
                category: "music",
                difficulty_level: "medium",
                usage_count: 0,
                created_date: new Date().toISOString()
            };

            // Check for duplicates
            const duplicate = await client.query(
                'SELECT id FROM questions WHERE question_text = $1',
                [question.question_text]
            );

            if (duplicate.rows.length === 0) {
                questions.push(question);
                
                // Insert into database
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
                    question.usage_count,
                    question.created_date
                ]);
                
                console.log(`      ✓ Generated: "${question.question_text.substring(0, 60)}..."`);
            } else {
                console.log(`      ⚠ Duplicate detected, skipping...`);
                i--; // Retry this iteration
            }
            
            // Small delay to respect API limits
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`      ❌ Error generating question ${i + 1}:`, error.message);
            i--; // Retry this iteration
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return questions;
}

async function generateMovieQuestionBatch(client, count, topics) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY/GEMINI_API_KEY');
    const ai = new GoogleGenAI({ apiKey });
    const questions = [];
    
    // Get existing movie questions to avoid duplicates
    const existingQuestions = await client.query(
        'SELECT question_text FROM questions WHERE category = $1 ORDER BY RANDOM() LIMIT 20',
        ['movies']
    );
    const existingTexts = existingQuestions.rows.map(row => row.question_text);
    
    for (let i = 0; i < count; i++) {
        const topic = topics[i % topics.length];
        
        try {
            const prompt = `Generate a medium difficulty movie trivia question about "${topic}".
            
Requirements:
            - Create an engaging, educational question
            - Provide 4 multiple choice options (A, B, C, D)
            - Only one correct answer
            - Include a detailed explanation (2-3 sentences)
            - Make it challenging but fair for movie enthusiasts
            - Ensure factual accuracy
            - Cover diverse aspects of cinema from different eras and genres
            ${existingTexts.length > 0 ? `\n\nAvoid questions similar to these existing ones:\n${existingTexts.slice(0, 5).join('\n')}` : ''}
            
            Return the response in this exact JSON format:
            {
              "questionText": "Your question here",
              "optionA": "First option",
              "optionB": "Second option", 
              "optionC": "Third option",
              "optionD": "Fourth option",
              "correctAnswer": "A",
              "explanation": "Detailed explanation here"
            }`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: {
                    responseMimeType: 'application/json'
                },
                contents: prompt
            });
            const text = result.text;
            
            // Clean the response text to extract JSON
            let jsonText = text.trim();
            if (jsonText.includes('```json')) {
                jsonText = jsonText.split('```json')[1].split('```')[0].trim();
            } else if (jsonText.includes('```')) {
                jsonText = jsonText.split('```')[1].split('```')[0].trim();
            }
            
            const aiQuestion = JSON.parse(jsonText);
            
            const question = {
                question_text: aiQuestion.questionText,
                option_a: aiQuestion.optionA,
                option_b: aiQuestion.optionB,
                option_c: aiQuestion.optionC,
                option_d: aiQuestion.optionD,
                correct_answer: aiQuestion.correctAnswer,
                explanation: aiQuestion.explanation,
                category: "movies",
                difficulty_level: "medium",
                usage_count: 0,
                created_date: new Date().toISOString()
            };

            // Check for duplicates
            const duplicate = await client.query(
                'SELECT id FROM questions WHERE question_text = $1',
                [question.question_text]
            );

            if (duplicate.rows.length === 0) {
                questions.push(question);
                
                // Insert into database
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
                    question.usage_count,
                    question.created_date
                ]);
                
                console.log(`      ✓ Generated: "${question.question_text.substring(0, 60)}..."`);
            } else {
                console.log(`      ⚠ Duplicate detected, skipping...`);
                i--; // Retry this iteration
            }
            
            // Small delay to respect API limits
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`      ❌ Error generating question ${i + 1}:`, error.message);
            i--; // Retry this iteration
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return questions;
}

expandCategories();