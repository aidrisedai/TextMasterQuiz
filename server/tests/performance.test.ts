import { describe, test, expect } from 'bun:test';
import { storage } from '../storage';

// Performance Tests
describe('Performance Tests', () => {
  
  describe('Database Performance', () => {
    test('User retrieval is fast', async () => {
      const startTime = performance.now();
      await storage.getAllUsers();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('Question retrieval is optimized', async () => {
      const startTime = performance.now();
      await storage.getRandomQuestion();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('Bulk operations are efficient', async () => {
      const startTime = performance.now();
      const questions = await storage.getAllQuestions();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(questions.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage', () => {
    test('No memory leaks in repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await storage.getRandomQuestion();
        await storage.getAllUsers();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations', () => {
    test('Handles multiple simultaneous requests', async () => {
      const promises = [];
      
      // Create 10 simultaneous requests
      for (let i = 0; i < 10; i++) {
        promises.push(storage.getRandomQuestion());
      }
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(results.length).toBe(10);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});