#!/usr/bin/env node

console.log('🔍 Checking current database state...\n');

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function checkDatabaseState() {
  try {
    // Import storage
    const { storage } = await import('../server/storage.js');
    
    console.log('📊 Current Database State:');
    console.log('=' .repeat(40));
    
    // Check questions
    const questions = await storage.getAllQuestions();
    console.log(`📚 Questions: ${questions.length}`);
    
    // Check users  
    const users = await storage.getAllUsers();
    console.log(`👥 Users: ${users.length}`);
    
    // Check admin users
    const adminUsers = await storage.getAllAdminUsers?.() || [];
    console.log(`👔 Admin Users: ${adminUsers.length}`);
    
    console.log('=' .repeat(40));
    
    if (questions.length === 0) {
      console.log('\n⚠️  No questions found in database!');
      console.log('\n🎯 Options:');
      console.log('1. Import questions from Supabase first');
      console.log('2. Create sample questions for testing');
      
      // Offer to create sample questions
      console.log('\n💡 Creating sample questions for testing...\n');
      await createSampleQuestions();
      
    } else {
      console.log('\n✅ Questions exist! Ready for user testing.');
      
      // Show first few questions
      console.log('\n📋 Sample Questions:');
      questions.slice(0, 3).forEach((q, index) => {
        console.log(`${index + 1}. ${q.questionText.substring(0, 50)}...`);
        console.log(`   Category: ${q.category}, Difficulty: ${q.difficulty}`);
      });
    }
    
    if (users.length === 0) {
      console.log('\n👥 No users found - ready for test user creation');
    } else {
      console.log(`\n👥 ${users.length} users found`);
    }
    
  } catch (error) {
    console.error('❌ Error checking database state:', error.message);
  }
}

async function createSampleQuestions() {
  try {
    const { storage } = await import('../server/storage.js');
    
    const sampleQuestions = [
      {
        questionText: "What is the capital of France?",
        optionA: "London",
        optionB: "Berlin", 
        optionC: "Paris",
        optionD: "Madrid",
        correctAnswer: "C",
        explanation: "Paris is the capital and largest city of France.",
        category: "geography",
        difficulty: "easy",
        usageCount: 0,
        isActive: true
      },
      {
        questionText: "Which planet is closest to the Sun?",
        optionA: "Venus",
        optionB: "Mercury",
        optionC: "Earth", 
        optionD: "Mars",
        correctAnswer: "B",
        explanation: "Mercury is the closest planet to the Sun in our solar system.",
        category: "science",
        difficulty: "easy",
        usageCount: 0,
        isActive: true
      },
      {
        questionText: "What is 15 × 8?",
        optionA: "120",
        optionB: "100",
        optionC: "140",
        optionD: "110",
        correctAnswer: "A", 
        explanation: "15 × 8 = 120",
        category: "math",
        difficulty: "medium",
        usageCount: 0,
        isActive: true
      },
      {
        questionText: "Who wrote 'Romeo and Juliet'?",
        optionA: "Charles Dickens",
        optionB: "William Shakespeare", 
        optionC: "Jane Austen",
        optionD: "Mark Twain",
        correctAnswer: "B",
        explanation: "William Shakespeare wrote the famous tragedy 'Romeo and Juliet'.",
        category: "literature",
        difficulty: "easy",
        usageCount: 0,
        isActive: true
      },
      {
        questionText: "What year did World War II end?",
        optionA: "1944",
        optionB: "1945",
        optionC: "1946", 
        optionD: "1943",
        correctAnswer: "B",
        explanation: "World War II ended in 1945 with the surrender of Japan in September.",
        category: "history",
        difficulty: "medium",
        usageCount: 0,
        isActive: true
      }
    ];
    
    console.log('📝 Creating sample questions...');
    
    for (const question of sampleQuestions) {
      await storage.createQuestion(question);
      console.log(`✅ Created: ${question.questionText.substring(0, 40)}...`);
    }
    
    console.log(`\n🎉 Created ${sampleQuestions.length} sample questions!`);
    console.log('✅ Database is now ready for SMS testing');
    
  } catch (error) {
    console.error('❌ Error creating sample questions:', error.message);
  }
}

// Run the check
checkDatabaseState();