#!/usr/bin/env node
import * as fs from 'fs/promises';
import path from 'path';

console.log('📥 Starting Question Database Import...\n');

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Set this to your Render PostgreSQL URL');
  process.exit(1);
}

class QuestionImporter {
  constructor() {
    this.batchSize = 50; // Process 50 questions at a time
    this.importStats = {
      total: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async import() {
    try {
      console.log('🔍 Looking for data sources...\n');
      
      // Try different import methods
      const questions = await this.findQuestionData();
      
      if (questions.length === 0) {
        console.log('❌ No questions found to import!');
        console.log('\n🎯 Options:');
        console.log('1. Check if your export file contains data');
        console.log('2. Provide direct database connection to source');
        console.log('3. Use sample questions for testing');
        return;
      }

      console.log(`📚 Found ${questions.length} questions to import`);
      this.importStats.total = questions.length;

      // Import in batches
      await this.importInBatches(questions);
      
      // Show final stats
      this.showFinalStats();

    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  }

  async findQuestionData() {
    const methods = [
      () => this.loadFromExistingExport(),
      () => this.loadFromManualInput(),
      () => this.createSampleQuestions()
    ];

    for (const method of methods) {
      try {
        const questions = await method();
        if (questions && questions.length > 0) {
          return questions;
        }
      } catch (error) {
        console.log(`⚠️ Method failed: ${error.message}`);
      }
    }

    return [];
  }

  async loadFromExistingExport() {
    console.log('📂 Checking existing export files...');
    
    const exportsDir = path.join(process.cwd(), 'database_exports');
    const files = await fs.readdir(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
    
    if (jsonFiles.length === 0) {
      throw new Error('No JSON export files found');
    }

    for (const file of jsonFiles) {
      const filePath = path.join(exportsDir, file);
      console.log(`📄 Trying: ${file}`);
      
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (data.questions && data.questions.length > 0) {
        console.log(`✅ Found ${data.questions.length} questions in ${file}`);
        return data.questions;
      }
    }
    
    throw new Error('No questions found in export files');
  }

  async loadFromManualInput() {
    // This would be for connecting to original database
    // For now, we'll skip this method
    throw new Error('Manual input method not implemented yet');
  }

  async createSampleQuestions() {
    console.log('💡 No existing data found, creating comprehensive sample questions...');
    
    // Create a larger set of sample questions for testing
    return [
      {
        questionText: "What is the capital of France?",
        optionA: "London", optionB: "Berlin", optionC: "Paris", optionD: "Madrid",
        correctAnswer: "C",
        explanation: "Paris is the capital and largest city of France.",
        category: "geography", difficulty: "easy"
      },
      {
        questionText: "Which planet is closest to the Sun?",
        optionA: "Venus", optionB: "Mercury", optionC: "Earth", optionD: "Mars",
        correctAnswer: "B",
        explanation: "Mercury is the closest planet to the Sun in our solar system.",
        category: "science", difficulty: "easy"
      },
      {
        questionText: "What is 15 × 8?",
        optionA: "120", optionB: "100", optionC: "140", optionD: "110",
        correctAnswer: "A",
        explanation: "15 × 8 = 120",
        category: "math", difficulty: "medium"
      },
      {
        questionText: "Who wrote 'Romeo and Juliet'?",
        optionA: "Charles Dickens", optionB: "William Shakespeare", optionC: "Jane Austen", optionD: "Mark Twain",
        correctAnswer: "B",
        explanation: "William Shakespeare wrote the famous tragedy 'Romeo and Juliet'.",
        category: "literature", difficulty: "easy"
      },
      {
        questionText: "What year did World War II end?",
        optionA: "1944", optionB: "1945", optionC: "1946", optionD: "1943",
        correctAnswer: "B",
        explanation: "World War II ended in 1945 with the surrender of Japan in September.",
        category: "history", difficulty: "medium"
      },
      {
        questionText: "What is the chemical symbol for gold?",
        optionA: "Go", optionB: "Gd", optionC: "Au", optionD: "Ag",
        correctAnswer: "C",
        explanation: "Au is the chemical symbol for gold, from the Latin word 'aurum'.",
        category: "science", difficulty: "medium"
      },
      {
        questionText: "Which continent is the Sahara Desert located on?",
        optionA: "Asia", optionB: "Australia", optionC: "Africa", optionD: "South America",
        correctAnswer: "C",
        explanation: "The Sahara Desert is located in North Africa.",
        category: "geography", difficulty: "easy"
      },
      {
        questionText: "What is 144 ÷ 12?",
        optionA: "11", optionB: "12", optionC: "13", optionD: "14",
        correctAnswer: "B",
        explanation: "144 ÷ 12 = 12",
        category: "math", difficulty: "easy"
      },
      {
        questionText: "Who painted the Mona Lisa?",
        optionA: "Vincent van Gogh", optionB: "Pablo Picasso", optionC: "Leonardo da Vinci", optionD: "Michelangelo",
        correctAnswer: "C",
        explanation: "Leonardo da Vinci painted the Mona Lisa between 1503-1519.",
        category: "art", difficulty: "easy"
      },
      {
        questionText: "What is the largest mammal on Earth?",
        optionA: "African Elephant", optionB: "Blue Whale", optionC: "Giraffe", optionD: "Polar Bear",
        correctAnswer: "B",
        explanation: "The blue whale is the largest mammal and largest animal ever known to have lived on Earth.",
        category: "science", difficulty: "easy"
      }
    ].map(q => ({
      ...q,
      usageCount: 0,
      isActive: true
    }));
  }

  async importInBatches(questions) {
    const { storage } = await import('../server/storage.js');
    
    console.log(`\n🔄 Importing ${questions.length} questions in batches of ${this.batchSize}...\n`);

    for (let i = 0; i < questions.length; i += this.batchSize) {
      const batch = questions.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / this.batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)`);
      
      for (const question of batch) {
        try {
          // Check for duplicates by question text
          const existing = await this.checkDuplicate(question.questionText);
          if (existing) {
            this.importStats.duplicates++;
            console.log(`⚠️  Skipping duplicate: ${question.questionText.substring(0, 40)}...`);
            continue;
          }

          // Import the question
          await storage.createQuestion({
            questionText: question.questionText,
            optionA: question.optionA,
            optionB: question.optionB,
            optionC: question.optionC,
            optionD: question.optionD,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation || '',
            category: question.category || 'general',
            difficulty: question.difficulty || 'medium',
            usageCount: question.usageCount || 0,
            isActive: question.isActive ?? true
          });

          this.importStats.imported++;
          console.log(`✅ Imported: ${question.questionText.substring(0, 40)}...`);

        } catch (error) {
          this.importStats.errors++;
          console.error(`❌ Error importing question: ${error.message}`);
          console.log(`   Question: ${question.questionText?.substring(0, 40)}...`);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + this.batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async checkDuplicate(questionText) {
    try {
      const { storage } = await import('../server/storage.js');
      const allQuestions = await storage.getAllQuestions();
      return allQuestions.find(q => q.questionText.toLowerCase() === questionText.toLowerCase());
    } catch (error) {
      // If we can't check duplicates, proceed anyway
      return false;
    }
  }

  showFinalStats() {
    const duration = ((Date.now() - this.importStats.startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total Questions: ${this.importStats.total}`);
    console.log(`   Successfully Imported: ${this.importStats.imported}`);
    console.log(`   Duplicates Skipped: ${this.importStats.duplicates}`);
    console.log(`   Errors: ${this.importStats.errors}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Rate: ${(this.importStats.imported / parseFloat(duration)).toFixed(1)} questions/second`);
    
    if (this.importStats.imported > 0) {
      console.log('\n✅ Your database is now ready for SMS testing!');
      console.log('🎯 Next steps:');
      console.log('   1. Test SMS delivery with a test user');
      console.log('   2. Verify question delivery works');
      console.log('   3. Test user responses');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the import
const importer = new QuestionImporter();
importer.import();