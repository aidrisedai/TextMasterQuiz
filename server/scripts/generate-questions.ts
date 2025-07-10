import { geminiService } from '../services/gemini.js';
import { storage } from '../storage.js';

// Categories for question generation
const categories = [
  'general',
  'science', 
  'physics',
  'history',
  'geography',
  'sports',
  'technology',
  'arts',
  'literature'
];

async function generateQuestionsForCategory(category: string, count: number = 20): Promise<void> {
  console.log(`Generating ${count} questions for category: ${category}`);
  
  const existingQuestions = await storage.getAllQuestions();
  const categoryQuestions = existingQuestions
    .filter(q => q.category === category)
    .map(q => q.questionText);
  
  let successCount = 0;
  let attempts = 0;
  const maxAttempts = count * 2; // Allow for some failures
  
  while (successCount < count && attempts < maxAttempts) {
    attempts++;
    
    try {
      console.log(`Attempt ${attempts}: Generating question ${successCount + 1}/${count} for ${category}`);
      
      const question = await geminiService.generateQuestion(
        category, 
        'medium', 
        categoryQuestions.slice(-10) // Use last 10 questions to avoid duplicates
      );
      
      if (question) {
        await storage.createQuestion({
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          category: question.category,
          difficultyLevel: question.difficultyLevel,
          timesUsed: 0
        });
        
        categoryQuestions.push(question.questionText);
        successCount++;
        console.log(`✅ Question ${successCount}/${count} saved for ${category}`);
      } else {
        console.log(`❌ Failed to generate question for ${category} (attempt ${attempts})`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error generating question for ${category}:`, error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Completed ${category}: ${successCount}/${count} questions generated`);
}

async function generateAllQuestions(): Promise<void> {
  console.log('Starting question generation for all categories...');
  
  for (const category of categories) {
    await generateQuestionsForCategory(category, 20);
    console.log(`Completed category: ${category}\n`);
  }
  
  // Show final summary
  const finalQuestions = await storage.getAllQuestions();
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total questions in database: ${finalQuestions.length}`);
  
  for (const category of categories) {
    const categoryCount = finalQuestions.filter(q => q.category === category).length;
    console.log(`${category}: ${categoryCount} questions`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllQuestions().catch(console.error);
}

export { generateAllQuestions, generateQuestionsForCategory };