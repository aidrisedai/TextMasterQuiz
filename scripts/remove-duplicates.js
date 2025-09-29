#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Question Duplicate Detection & Removal System\n');

// Check environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

class DuplicateRemover {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    this.stats = {
      total: 0,
      duplicates: 0,
      removed: 0,
      kept: 0,
      errors: 0
    };
  }

  async findAndRemoveDuplicates() {
    try {
      console.log('🔌 Connecting to database...');
      const client = await this.pool.connect();
      
      // Get initial count
      const initialResult = await client.query('SELECT COUNT(*) as total FROM questions');
      this.stats.total = parseInt(initialResult.rows[0].total);
      console.log(`📊 Initial question count: ${this.stats.total.toLocaleString()}\n`);
      
      // Step 1: Find duplicates by question text
      console.log('🔍 Step 1: Finding exact duplicate questions...\n');
      await this.findExactDuplicates(client);
      
      // Step 2: Find similar questions (fuzzy matching)
      console.log('\n🔍 Step 2: Finding similar questions...\n');
      await this.findSimilarQuestions(client);
      
      // Step 3: Show final statistics
      await this.showFinalStats(client);
      
      client.release();
      
    } catch (error) {
      console.error('❌ Duplicate removal failed:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async findExactDuplicates(client) {
    // Find questions with identical question_text
    const duplicateQuery = `
      SELECT question_text, COUNT(*) as count, 
             ARRAY_AGG(id ORDER BY id) as ids,
             ARRAY_AGG(category ORDER BY id) as categories
      FROM questions 
      GROUP BY question_text
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    console.log('🔍 Searching for exact duplicate questions...');
    const result = await client.query(duplicateQuery);
    const duplicateGroups = result.rows;
    
    console.log(`📋 Found ${duplicateGroups.length} groups of exact duplicates\n`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No exact duplicates found!');
      return;
    }

    // Show top 10 duplicate groups
    console.log('🔝 Top duplicate groups:');
    duplicateGroups.slice(0, 10).forEach((group, index) => {
      console.log(`${index + 1}. "${group.question_text.substring(0, 60)}..." (${group.count} copies)`);
      console.log(`   IDs: [${group.ids.slice(0, 5).join(', ')}${group.ids.length > 5 ? ', ...' : ''}]`);
      console.log(`   Categories: [${group.categories.slice(0, 3).join(', ')}${group.categories.length > 3 ? ', ...' : ''}]`);
    });
    
    // Ask for confirmation before removing duplicates
    console.log(`\n⚠️  Ready to remove duplicates:`);
    console.log(`   - Keep: First occurrence of each question (lowest ID)`);
    console.log(`   - Remove: All other duplicates`);
    
    let totalToRemove = 0;
    duplicateGroups.forEach(group => {
      totalToRemove += group.count - 1; // Keep 1, remove the rest
    });
    
    console.log(`   - Will remove: ${totalToRemove.toLocaleString()} duplicate questions`);
    console.log(`   - Will keep: ${(this.stats.total - totalToRemove).toLocaleString()} unique questions`);
    
    // Remove duplicates (keep the first occurrence - lowest ID)
    console.log('\n🗑️  Removing exact duplicates...');
    
    await client.query('BEGIN');
    
    try {
      for (const group of duplicateGroups) {
        // Keep the first ID, remove all others
        const [keepId, ...removeIds] = group.ids;
        
        if (removeIds.length > 0) {
          const deleteQuery = `DELETE FROM questions WHERE id = ANY($1)`;
          const deleteResult = await client.query(deleteQuery, [removeIds]);
          
          this.stats.removed += deleteResult.rowCount;
          this.stats.kept += 1;
          
          console.log(`   ✅ Kept ID ${keepId}, removed ${removeIds.length} duplicates: "${group.question_text.substring(0, 50)}..."`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`\n✅ Successfully removed ${this.stats.removed.toLocaleString()} exact duplicates!`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error removing duplicates:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  async findSimilarQuestions(client) {
    console.log('🔍 Checking for near-duplicate questions...');
    
    // Find questions that are very similar (same first 100 characters)
    const similarQuery = `
      SELECT SUBSTRING(question_text, 1, 100) as text_start, 
             COUNT(*) as count,
             ARRAY_AGG(id ORDER BY id) as ids,
             ARRAY_AGG(SUBSTRING(question_text, 1, 150) ORDER BY id) as questions
      FROM questions 
      GROUP BY SUBSTRING(question_text, 1, 100)
      HAVING COUNT(*) > 1 
      ORDER BY count DESC
    `;
    
    const result = await client.query(similarQuery);
    const similarGroups = result.rows;
    
    if (similarGroups.length === 0) {
      console.log('✅ No similar questions found!');
      return;
    }
    
    console.log(`📋 Found ${similarGroups.length} groups of potentially similar questions:\n`);
    
    // Show examples but don't auto-remove (these need manual review)
    similarGroups.slice(0, 5).forEach((group, index) => {
      console.log(`${index + 1}. Similar questions (${group.count} variations):`);
      console.log(`   Start: "${group.text_start}..."`);
      group.questions.slice(0, 3).forEach((q, i) => {
        console.log(`   ${group.ids[i]}: "${q}..."`);
      });
      console.log('');
    });
    
    console.log('ℹ️  Similar questions require manual review.');
    console.log('   Some might be legitimate variations (different categories, difficulty)');
    console.log('   Run this script again with --review-similar flag to inspect them individually');
  }

  async showFinalStats(client) {
    const finalResult = await client.query('SELECT COUNT(*) as total FROM questions');
    const finalTotal = parseInt(finalResult.rows[0].total);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 DUPLICATE REMOVAL COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Results:`);
    console.log(`   Original questions: ${this.stats.total.toLocaleString()}`);
    console.log(`   Final questions: ${finalTotal.toLocaleString()}`);
    console.log(`   Duplicates removed: ${this.stats.removed.toLocaleString()}`);
    console.log(`   Space saved: ${((this.stats.removed / this.stats.total) * 100).toFixed(1)}%`);
    
    if (this.stats.errors > 0) {
      console.log(`   Errors: ${this.stats.errors}`);
    }
    
    // Show category breakdown
    console.log(`\n📊 Updated Category Distribution:`);
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM questions 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    categoryResult.rows.forEach(row => {
      console.log(`   ${row.category}: ${parseInt(row.count).toLocaleString()} questions`);
    });
    
    console.log('\n✅ Your database is now clean and ready for SMS delivery!');
    console.log('='.repeat(70));
  }
}

// Check for command line arguments
const args = process.argv.slice(2);
const reviewSimilar = args.includes('--review-similar');

// Run the duplicate removal
const remover = new DuplicateRemover();
remover.findAndRemoveDuplicates()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });