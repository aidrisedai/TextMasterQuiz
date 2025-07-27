// Queue processor service for handling generation jobs
import { storage } from '../storage.js';
import { generateQuestionsForCategory } from '../scripts/generate-questions.js';

class QueueProcessor {
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) {
      console.log('Queue processor is already running');
      return;
    }

    console.log('Starting queue processor...');
    this.intervalId = setInterval(async () => {
      await this.processQueue();
    }, 5000); // Check every 5 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Queue processor stopped');
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      
      // Check for pending jobs
      const job = await storage.getNextPendingJob();
      if (!job) return;

      console.log(`Processing generation job: ${job.category} (${job.questionCount} questions)`);
      
      // Mark job as active
      await storage.updateGenerationJob(job.id, {
        status: 'active',
        startedAt: new Date(),
      });

      // Generate questions with progress tracking
      await this.generateWithProgress(job);

    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async generateWithProgress(job: any) {
    try {
      // Create a modified generation function that updates progress
      const originalCreateQuestion = storage.createQuestion.bind(storage);
      let completedQuestions = 0;

      // Override the create function to track progress
      storage.createQuestion = async (question: any) => {
        const result = await originalCreateQuestion(question);
        completedQuestions++;
        
        // Update progress
        await storage.updateGenerationJob(job.id, {
          progress: completedQuestions,
        });
        
        return result;
      };

      // Run the generation
      await generateQuestionsForCategory(job.category, job.questionCount);

      // Mark as completed
      await storage.updateGenerationJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        progress: job.questionCount,
      });

      // Restore original function
      storage.createQuestion = originalCreateQuestion;

      console.log(`✅ Generation job completed: ${job.category} (${job.questionCount} questions)`);

    } catch (error) {
      console.error(`❌ Generation job failed: ${job.category}`, error);
      
      // Mark as failed
      await storage.updateGenerationJob(job.id, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const queueProcessor = new QueueProcessor();