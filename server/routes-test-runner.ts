import { Router } from 'express';
import { runAllTests } from './test-runner';

const router = Router();

router.get('/run-all-tests', async (req, res) => {
  try {
    console.log('🧪 Starting comprehensive test suite via API...');
    
    // Capture console output
    const originalLog = console.log;
    let output = '';
    
    console.log = (...args) => {
      const message = args.join(' ');
      output += message + '\n';
      originalLog(...args);
    };
    
    // Run all tests
    const startTime = Date.now();
    const report = await runAllTests();
    const endTime = Date.now();
    
    // Restore console.log
    console.log = originalLog;
    
    res.json({
      success: true,
      message: 'All tests completed',
      report: {
        ...report,
        executionTime: endTime - startTime
      },
      output: output,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running test suite:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/test-summary', async (req, res) => {
  try {
    // Quick summary without full test execution
    const quickTests = [
      {
        name: 'Timezone API Available',
        test: async () => {
          const response = await fetch('http://localhost:5000/api/test/test-timezone-pure');
          return response.ok;
        }
      },
      {
        name: 'User Scenario API Available', 
        test: async () => {
          const response = await fetch('http://localhost:5000/api/test/test-user-scenario');
          return response.ok;
        }
      },
      {
        name: 'Admin Routes Available',
        test: async () => {
          const response = await fetch('http://localhost:5000/api/admin/questions');
          // Expect 401 (unauthorized) which means endpoint exists
          return response.status === 401;
        }
      }
    ];
    
    const results = [];
    let passed = 0;
    
    for (const quickTest of quickTests) {
      try {
        const result = await quickTest.test();
        results.push({
          name: quickTest.name,
          passed: result,
          error: result ? null : 'Test failed'
        });
        if (result) passed++;
      } catch (error) {
        results.push({
          name: quickTest.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const score = Math.round((passed / quickTests.length) * 100);
    
    res.json({
      success: true,
      quickSummary: {
        totalTests: quickTests.length,
        passed,
        failed: quickTests.length - passed,
        score,
        details: results
      },
      message: `Quick test summary: ${score}% (${passed}/${quickTests.length} passed)`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in test summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;