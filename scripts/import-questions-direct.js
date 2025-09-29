#!/usr/bin/env node
import * as fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

console.log('📥 Direct Database Question Import System\n');

// Check arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Usage: node scripts/import-questions-direct.js <json-file>');
  console.error('Example: node scripts/import-questions-direct.js questions.json');
  process.exit(1);
}

const jsonFilePath = args[0];

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

class DirectQuestionImporter {
  constructor(filePath) {
    this.filePath = filePath;
    this.batchSize = 500; // Larger batch size for direct DB insert
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
    this.pool = null;
    this.duplicateCache = new Set();
  }

  async import() {
    try {
      console.log(`📂 Processing file: ${this.filePath}`);
      
      // Validate file exists and size
      const stats = fs.statSync(this.filePath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`📊 File size: ${fileSizeMB} MB\n`);

      // Initialize database connection
      console.log('🔌 Connecting to database...');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Render PostgreSQL requires SSL
      });

      // Test connection
      await this.testConnection();

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
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as timestamp');
      console.log(`✅ Database connected successfully`);
      console.log(`🕰️ Database time: ${result.rows[0].timestamp}`);
      client.release();
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async buildDuplicateCache() {
    console.log('🔍 Building duplicate cache from existing questions...');
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT question_text FROM questions');
      
      result.rows.forEach(row => {
        this.duplicateCache.add(row.question_text.toLowerCase().trim());
      });
      
      console.log(`✅ Cached ${result.rows.length} existing questions for duplicate checking\n`);
      client.release();
    } catch (error) {
      console.log('⚠️ Could not build duplicate cache, will check each question individually');
      console.log('Error:', error.message);
    }
  }

  async processFileStream() {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(this.filePath, { encoding: 'utf8' });
      let buffer = '';

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
    
    console.log(`📦 Processing batch ${this.stats.currentBatch} (${this.currentBatch.length} questions)`);

    const batchStartTime = Date.now();
    
    // Prepare batch insert
    const validQuestions = [];
    
    for (const question of this.currentBatch) {
      this.stats.processed++;

      // Fast duplicate check using cache
      const questionText = question.question_text.toLowerCase().trim();
      if (this.duplicateCache.has(questionText)) {
        this.stats.duplicates++;
        continue;
      }

      // Map fields to match your database schema
      const dbQuestion = {
        question_text: question.question_text,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        explanation: question.explanation || '',
        category: question.category || 'general',
        difficulty_level: this.mapDifficulty(question.difficulty_level),
        usage_count: parseInt(question.usage_count) || 0,
        created_date: new Date()
      };

      validQuestions.push(dbQuestion);
      
      // Add to cache to prevent future duplicates in this session
      this.duplicateCache.add(questionText);
    }

    // Batch insert into database
    if (validQuestions.length > 0) {
      try {
        const client = await this.pool.connect();
        
        // Build multi-row INSERT statement
        const placeholders = validQuestions.map((_, index) => {
          const base = index * 11;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
        }).join(', ');

        const query = `
          INSERT INTO questions (
            question_text, option_a, option_b, option_c, option_d, 
            correct_answer, explanation, category, difficulty_level, 
            usage_count, created_date
          ) VALUES ${placeholders}
        `;

        // Flatten the values array
        const values = validQuestions.flatMap(q => [
          q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
          q.correct_answer, q.explanation, q.category, q.difficulty_level,
          q.usage_count, q.created_date
        ]);

        await client.query(query, values);
        client.release();
        
        this.stats.imported += validQuestions.length;

      } catch (error) {
        this.stats.errors += validQuestions.length;
        console.error(`❌ Error importing batch: ${error.message}`);
        
        // Fallback: try individual inserts
        await this.insertIndividually(validQuestions);
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
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async insertIndividually(questions) {
    console.log('   🔄 Trying individual inserts as fallback...');
    const client = await this.pool.connect();
    
    let individualSuccess = 0;
    
    for (const question of questions) {
      try {
        await client.query(`
          INSERT INTO questions (
            question_text, option_a, option_b, option_c, option_d, 
            correct_answer, explanation, category, difficulty_level, 
            usage_count, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          question.question_text, question.option_a, question.option_b, 
          question.option_c, question.option_d, question.correct_answer, 
          question.explanation, question.category, question.difficulty_level, 
          question.usage_count, question.created_date
        ]);
        
        individualSuccess++;
        this.stats.imported++;
        this.stats.errors--; // Remove from error count since it succeeded
        
      } catch (error) {
        console.error(`   ❌ Individual insert failed: ${error.message}`);
      }
    }
    
    client.release();
    console.log(`   ✅ Individual fallback: ${individualSuccess}/${questions.length} succeeded`);
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
const importer = new DirectQuestionImporter(jsonFilePath);
importer.import();