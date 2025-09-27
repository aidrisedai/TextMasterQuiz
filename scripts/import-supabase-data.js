#!/usr/bin/env node
import * as fs from 'fs/promises';
import path from 'path';

console.log('📥 Importing Supabase data to Render database...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

try {
  // Find the most recent export file
  const exportsDir = path.join(process.cwd(), 'database_exports');
  const files = await fs.readdir(exportsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
  
  if (jsonFiles.length === 0) {
    console.error('❌ No JSON export files found in database_exports/');
    process.exit(1);
  }
  
  const exportFile = path.join(exportsDir, jsonFiles[0]);
  console.log(`📁 Using export file: ${jsonFiles[0]}`);
  
  // Read the export data
  const exportData = JSON.parse(await fs.readFile(exportFile, 'utf8'));
  
  // Import the storage module
  const { storage } = await import('../server/storage.js');
  
  console.log('🔄 Starting data import...');
  
  let importedCounts = {
    users: 0,
    questions: 0,
    userAnswers: 0,
    adminUsers: 0,
    deliveryQueue: 0,
    broadcasts: 0,
    broadcastDeliveries: 0
  };
  
  // Import questions first (no dependencies)
  if (exportData.questions && exportData.questions.length > 0) {
    console.log(`📚 Importing ${exportData.questions.length} questions...`);
    for (const question of exportData.questions) {
      try {
        await storage.createQuestion({
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          category: question.category,
          difficulty: question.difficulty,
          usageCount: question.usageCount || 0,
          isActive: question.isActive ?? true
        });
        importedCounts.questions++;
      } catch (error) {
        console.warn(`⚠️  Skipping question: ${error.message}`);
      }
    }
  }
  
  // Import users (depend on nothing)
  if (exportData.users && exportData.users.length > 0) {
    console.log(`👥 Importing ${exportData.users.length} users...`);
    for (const user of exportData.users) {
      try {
        await storage.createUser({
          phoneNumber: user.phoneNumber,
          categoryPreferences: user.categoryPreferences || [],
          preferredTime: user.preferredTime,
          timezone: user.timezone,
          subscriptionStatus: user.subscriptionStatus || 'free',
          isActive: user.isActive ?? true,
          joinDate: user.joinDate,
          lastQuizDate: user.lastQuizDate
        });
        importedCounts.users++;
      } catch (error) {
        console.warn(`⚠️  Skipping user ${user.phoneNumber}: ${error.message}`);
      }
    }
  }
  
  // Import admin users
  if (exportData.adminUsers && exportData.adminUsers.length > 0) {
    console.log(`👔 Importing ${exportData.adminUsers.length} admin users...`);
    for (const admin of exportData.adminUsers) {
      try {
        await storage.createAdmin({
          username: admin.username,
          password: admin.password, // Already hashed
          name: admin.name,
          email: admin.email,
          isActive: admin.isActive ?? true
        });
        importedCounts.adminUsers++;
      } catch (error) {
        console.warn(`⚠️  Skipping admin ${admin.username}: ${error.message}`);
      }
    }
  }
  
  // Get user and question mappings for foreign key relationships
  const users = await storage.getAllUsers();
  const questions = await storage.getAllQuestions();
  
  const userMap = new Map(users.map(u => [u.phoneNumber, u.id]));
  const questionMap = new Map(questions.map(q => [`${q.questionText.substring(0, 50)}`, q.id]));
  
  // Import user answers (depend on users and questions)
  if (exportData.userAnswers && exportData.userAnswers.length > 0) {
    console.log(`📝 Importing ${exportData.userAnswers.length} user answers...`);
    for (const answer of exportData.userAnswers) {
      try {
        // Find user by phone number
        const user = users.find(u => u.id === answer.userId);
        if (!user) continue;
        
        // Find question by ID or text match
        const question = questions.find(q => q.id === answer.questionId);
        if (!question) continue;
        
        await storage.recordAnswer({
          userId: user.id,
          questionId: question.id,
          userAnswer: answer.userAnswer,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          createdAt: answer.createdAt
        });
        importedCounts.userAnswers++;
      } catch (error) {
        console.warn(`⚠️  Skipping answer: ${error.message}`);
      }
    }
  }
  
  console.log('\\n✅ Data import completed!');
  console.log('📊 Import Summary:');
  Object.entries(importedCounts).forEach(([table, count]) => {
    console.log(`  ${table}: ${count}`);
  });
  
  console.log('\\n🎉 Your data has been successfully migrated to Render!');
  
} catch (error) {
  console.error('❌ Data import failed:', error);
  process.exit(1);
}