// Generation Manager Service
// Manages question generation processes with state tracking and cancellation

import { generateQuestionsForCategory } from '../scripts/generate-questions.js';

export interface GenerationState {
  isGenerating: boolean;
  currentCategory: string | null;
  startedAt: Date | null;
  completedCategories: string[];
  shouldCancel: boolean;
  error: string | null;
}

class GenerationManager {
  private state: GenerationState = {
    isGenerating: false,
    currentCategory: null,
    startedAt: null,
    completedCategories: [],
    shouldCancel: false,
    error: null
  };

  getState(): GenerationState {
    return { ...this.state };
  }

  isGenerating(): boolean {
    return this.state.isGenerating;
  }

  cancelGeneration(): void {
    if (this.state.isGenerating) {
      console.log('🛑 Cancelling question generation...');
      this.state.shouldCancel = true;
    }
  }

  async generateAllQuestions(categories: string[] = ['technology', 'arts', 'literature', 'food', 'animals']): Promise<void> {
    if (this.state.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.state = {
      isGenerating: true,
      currentCategory: null,
      startedAt: new Date(),
      completedCategories: [],
      shouldCancel: false,
      error: null
    };

    console.log('🚀 Starting controlled question generation for all categories...');

    try {
      for (const category of categories) {
        if (this.state.shouldCancel) {
          console.log('⚠️ Generation cancelled by user');
          break;
        }

        this.state.currentCategory = category;
        console.log(`📝 Generating questions for ${category}...`);
        
        await generateQuestionsForCategory(category, 20);
        
        this.state.completedCategories.push(category);
        console.log(`✅ Completed category: ${category}\n`);
      }

      if (this.state.shouldCancel) {
        console.log('Generation cancelled. Completed categories:', this.state.completedCategories);
      } else {
        console.log('✨ Question generation completed for all categories!');
      }
    } catch (error) {
      console.error('❌ Generation error:', error);
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.state.isGenerating = false;
      this.state.currentCategory = null;
      this.state.shouldCancel = false;
    }
  }

  async generateForCategory(category: string, count: number = 20): Promise<void> {
    if (this.state.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.state = {
      isGenerating: true,
      currentCategory: category,
      startedAt: new Date(),
      completedCategories: [],
      shouldCancel: false,
      error: null
    };

    try {
      console.log(`📝 Generating ${count} questions for ${category}...`);
      await generateQuestionsForCategory(category, count);
      this.state.completedCategories.push(category);
      console.log(`✅ Completed ${count} questions for ${category}`);
    } catch (error) {
      console.error(`❌ Error generating questions for ${category}:`, error);
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.state.isGenerating = false;
      this.state.currentCategory = null;
    }
  }
}

// Singleton instance
export const generationManager = new GenerationManager();