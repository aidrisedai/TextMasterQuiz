import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

async function generateQuestionsOffline() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
        process.exit(1);
    }

    console.log('🤖 Starting offline question generation...');
    const ai = new GoogleGenAI({ apiKey });

    const targetMusic = parseInt(process.env.TARGET_MUSIC || '50');
    const targetMovies = parseInt(process.env.TARGET_MOVIES || '50');

    console.log(`🎯 Targets: ${targetMusic} music questions, ${targetMovies} movie questions`);

    const allQuestions = [];

    // Generate Music Questions
    console.log('\\n🎵 Generating Music questions...');
    const musicQuestions = await generateMusicQuestions(ai, targetMusic);
    allQuestions.push(...musicQuestions);

    // Generate Movie Questions
    console.log('\\n🎬 Generating Movie questions...');
    const movieQuestions = await generateMovieQuestions(ai, targetMovies);
    allQuestions.push(...movieQuestions);

    // Save to JSON file
    const outputFile = `generated-questions-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2));
    
    console.log(`\\n✅ Generated ${allQuestions.length} questions`);
    console.log(`📁 Saved to: ${outputFile}`);
    console.log(`\\n📊 Summary:`);
    console.log(`   Music: ${musicQuestions.length} questions`);
    console.log(`   Movies: ${movieQuestions.length} questions`);
}

async function generateMusicQuestions(ai, count) {
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
    
    for (let i = 0; i < count; i++) {
        const topic = musicTopics[i % musicTopics.length];
        console.log(`   Generating ${i + 1}/${count}: ${topic}`);
        
        try {
            const prompt = `Generate a medium difficulty music trivia question about "${topic}".

Requirements:
- Create an engaging, educational question
- Provide 4 multiple choice options (A, B, C, D)
- Only one correct answer
- Include a detailed explanation (2-3 sentences)
- Make it challenging but fair for music enthusiasts
- Ensure factual accuracy

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

            questions.push(question);
            console.log(`      ✓ "${question.question_text.substring(0, 60)}..."`);
            
            // Small delay to respect API limits
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`      ❌ Error generating music question ${i + 1}:`, error.message);
            i--; // Retry this iteration
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return questions;
}

async function generateMovieQuestions(ai, count) {
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
    
    for (let i = 0; i < count; i++) {
        const topic = movieTopics[i % movieTopics.length];
        console.log(`   Generating ${i + 1}/${count}: ${topic}`);
        
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

            questions.push(question);
            console.log(`      ✓ "${question.question_text.substring(0, 60)}..."`);
            
            // Small delay to respect API limits
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`      ❌ Error generating movie question ${i + 1}:`, error.message);
            i--; // Retry this iteration
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return questions;
}

generateQuestionsOffline();