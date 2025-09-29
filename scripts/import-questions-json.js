#!/usr/bin/env node
import * as fs from 'fs';
import * as readline from 'readline';
import path from 'path';

console.log('📥 Large-Scale Question Import System\n');

// Check arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Usage: node scripts/import-questions-json.js <json-file>');
  console.error('Example: node scripts/import-questions-json.js questions.json');
  process.exit(1);
}

const jsonFilePath = path.resolve(args[0]);

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

class LargeQuestionImporter {
  constructor(filePath) {
    this.filePath = filePath;
    this.batchSize = 250; // Optimal for large datasets
    this.currentBatch = [];
    this.stats = {
      total: 0,
      processed: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
      startTime: Date.now(),
      currentBatch: 0
    };
    this.storage = null;
    this.duplicateCache = new Set(); // Cache question texts to avoid DB queries
  }

  async import() {
    try {
      console.log(`📂 Processing file: ${this.filePath}`);
      
      // Validate file exists and size
      const stats = fs.statSync(this.filePath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`📊 File size: ${fileSizeMB} MB\n`);

      // Initialize storage connection
      const { storage } = await import('../server/storage.ts');
      this.storage = storage;

      // Build duplicate cache for performance
      await this.buildDuplicateCache();

      // Process file with streaming
      await this.processFileStream();

      // Process final batch if exists
      if (this.currentBatch.length > 0) {
        await this.processBatch();
      }

      this.showFinalStats();

    } catch (error) {
      console.error('❌ Import failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }

  async buildDuplicateCache() {
    console.log('🔍 Building duplicate cache from existing questions...');
    try {
      const existingQuestions = await this.storage.getAllQuestions();
      existingQuestions.forEach(q => {
        this.duplicateCache.add(q.questionText.toLowerCase().trim());
      });
      console.log(`✅ Cached ${existingQuestions.length} existing questions for duplicate checking\n`);
    } catch (error) {
      console.log('⚠️ Could not build duplicate cache, will check each question individually');
    }
  }

  async processFileStream() {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(this.filePath, { encoding: 'utf8' });
      let buffer = '';
      let inArray = false;
      let braceCount = 0;
      let currentObject = '';

      console.log('🔄 Starting stream processing...\n');

      fileStream.on('data', (chunk) => {
        buffer += chunk;
        this.processBuffer(buffer, (remainingBuffer) => {
          buffer = remainingBuffer;
        });
      });

      fileStream.on('end', () => {
        console.log('\n✅ File streaming completed');
        resolve();
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  processBuffer(buffer, updateBuffer) {
    let i = 0;
    let objectStart = -1;
    let braceCount = 0;

    while (i < buffer.length) {
      const char = buffer[i];

      if (char === '[' && objectStart === -1) {
        // Start of array
        i++;
        continue;
      }

      if (char === '{') {
        if (objectStart === -1) {
          objectStart = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        
        if (braceCount === 0 && objectStart !== -1) {
          // Complete object found
          const objectStr = buffer.substring(objectStart, i + 1);
          try {
            const question = JSON.parse(objectStr);
            this.addToBatch(question);
          } catch (error) {
            console.error('⚠️ Failed to parse question object:', error.message);
          }
          
          objectStart = -1;
        }
      }
      
      i++;
    }

    // Keep remaining buffer that doesn't contain complete objects
    if (objectStart !== -1) {
      updateBuffer(buffer.substring(objectStart));
    } else {
      // Find last complete object to avoid cutting in middle
      const lastBrace = buffer.lastIndexOf('}');
      if (lastBrace !== -1) {
        updateBuffer(buffer.substring(lastBrace + 1));
      } else {
        updateBuffer('');
      }
    }
  }

  async addToBatch(question) {
    this.stats.total++;
    
    // Validate required fields
    if (!this.validateQuestion(question)) {
      this.stats.errors++;
      return;
    }

    this.currentBatch.push(question);

    if (this.currentBatch.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  validateQuestion(question) {
    const required = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
    return required.every(field => question[field] && question[field].toString().trim().length > 0);
  }

  async processBatch() {
    if (this.currentBatch.length === 0) return;

    this.stats.currentBatch++;
    const totalBatches = Math.ceil(this.stats.total / this.batchSize);
    
    console.log(`📦 Processing batch ${this.stats.currentBatch}/${totalBatches > 0 ? totalBatches : '?'} (${this.currentBatch.length} questions)`);

    const batchStartTime = Date.now();

    for (const question of this.currentBatch) {
      try {
        this.stats.processed++;

        // Fast duplicate check using cache
        const questionText = question.question_text.toLowerCase().trim();
        if (this.duplicateCache.has(questionText)) {
          this.stats.duplicates++;
          continue;
        }

        // Map fields to match your database schema
        const dbQuestion = {
          questionText: question.question_text,
          optionA: question.option_a,
          optionB: question.option_b,
          optionC: question.option_c,
          optionD: question.option_d,
          correctAnswer: question.correct_answer,
          explanation: question.explanation || '',
          category: question.category || 'general',
          difficulty: this.mapDifficulty(question.difficulty_level),
          usageCount: parseInt(question.usage_count) || 0,
          isActive: true
        };

        // Import to database
        await this.storage.createQuestion(dbQuestion);
        
        // Add to cache to prevent future duplicates in this session
        this.duplicateCache.add(questionText);
        
        this.stats.imported++;

      } catch (error) {
        this.stats.errors++;
        console.error(`❌ Error importing question: ${error.message}`);
        // Continue processing other questions
      }
    }

    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    const rate = (this.currentBatch.length / parseFloat(batchDuration)).toFixed(1);
    
    console.log(`   ✅ Batch completed in ${batchDuration}s (${rate} q/s) | Progress: ${this.stats.processed}/${this.stats.total}`);
    
    // Show ETA
    if (this.stats.processed > 0) {
      const avgTimePerQuestion = (Date.now() - this.stats.startTime) / this.stats.processed;
      const remaining = this.stats.total - this.stats.processed;
      const etaSeconds = Math.round((remaining * avgTimePerQuestion) / 1000);
      const etaMinutes = Math.floor(etaSeconds / 60);
      const etaSecondsRem = etaSeconds % 60;
      console.log(`   ⏱️  ETA: ${etaMinutes}m ${etaSecondsRem}s | Rate: ${(this.stats.processed / ((Date.now() - this.stats.startTime) / 1000)).toFixed(1)} q/s`);
    }
    
    console.log(''); // Empty line for readability

    // Clear batch
    this.currentBatch = [];

    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  mapDifficulty(level) {
    if (!level) return 'medium';
    const normalized = level.toLowerCase();
    if (['easy', 'medium', 'hard'].includes(normalized)) {
      return normalized;
    }
    return 'medium'; // Default fallback
  }

  showFinalStats() {
    const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 IMPORT COMPLETED!');
    console.log('='.repeat(80));
    console.log(`📊 Final Statistics:`);
    console.log(`   Total Questions Found: ${this.stats.total.toLocaleString()}`);
    console.log(`   Successfully Imported: ${this.stats.imported.toLocaleString()}`);
    console.log(`   Duplicates Skipped: ${this.stats.duplicates.toLocaleString()}`);
    console.log(`   Errors: ${this.stats.errors.toLocaleString()}`);
    console.log(`   Processing Time: ${minutes}m ${seconds}s`);
    console.log(`   Average Rate: ${(this.stats.processed / parseFloat(duration)).toFixed(1)} questions/second`);
    console.log(`   Success Rate: ${((this.stats.imported / this.stats.processed) * 100).toFixed(1)}%`);
    
    if (this.stats.imported > 0) {
      console.log('\n✅ Database successfully populated!');
      console.log(`🎯 ${this.stats.imported.toLocaleString()} questions are now available for SMS delivery`);
      
      if (this.stats.duplicates > 0) {
        console.log(`📝 ${this.stats.duplicates.toLocaleString()} duplicates were skipped (safe to ignore)`);
      }
      
      if (this.stats.errors > 0) {
        console.log(`⚠️  ${this.stats.errors.toLocaleString()} questions had errors (check logs above)`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Validate file exists
try {
  fs.accessSync(jsonFilePath, fs.constants.F_OK);
} catch (error) {
  console.error(`❌ File not found: ${jsonFilePath}`);
  console.error('Make sure the file path is correct and the file exists.');
  process.exit(1);
}

// Run the import
const importer = new LargeQuestionImporter(jsonFilePath);
importer.import();