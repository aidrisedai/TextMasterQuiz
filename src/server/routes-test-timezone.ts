import { Router } from 'express';
import { runTimezoneTests } from './tests/timezone-scheduler-test';

const router = Router();

router.get('/test-timezone-logic', async (req, res) => {
  try {
    console.log('🧪 Starting timezone scheduler tests...');
    
    // Capture console output
    const originalLog = console.log;
    let output = '';
    
    console.log = (...args) => {
      const message = args.join(' ');
      output += message + '\n';
      originalLog(...args);
    };
    
    // Run the tests
    await runTimezoneTests();
    
    // Restore console.log
    console.log = originalLog;
    
    res.json({
      success: true,
      message: 'Timezone tests completed successfully',
      output: output,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running timezone tests:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/test-timezone-specific', async (req, res) => {
  try {
    const { timezone = 'America/Los_Angeles', hour = '21', testTime } = req.query;
    
    // Create a test user  
    const testUser = {
      id: 999999,
      phoneNumber: '+15153570454',
      preferredTime: `${hour}:00`,
      timezone: timezone as string,
      joinDate: new Date('2025-07-20T00:00:00Z'), // 5 days ago
      lastQuizDate: new Date('2025-07-24T00:00:00Z'), // yesterday
      isActive: true
    };
    
    // Use provided test time or current time
    const currentTime = testTime ? new Date(testTime as string) : new Date();
    
    // Import the scheduler logic (we'll use the same methods)
    const { storage } = await import('./storage');
    
    // Test timezone hour extraction
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone as string,
      hour: '2-digit',
      hour12: false
    });
    const currentHourInTZ = parseInt(formatter.format(currentTime), 10);
    const preferredHour = parseInt(hour as string, 10);
    
    // Test day comparison
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone as string,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const currentDayStr = dayFormatter.format(currentTime);
    const joinDayStr = dayFormatter.format(new Date(testUser.joinDate));
    const lastQuizDayStr = testUser.lastQuizDate ? dayFormatter.format(new Date(testUser.lastQuizDate)) : 'never';
    
    // Check pending answers (skip for test user)
    const pendingCount = testUser.id === 999999 ? 0 : await storage.getPendingAnswersCount(testUser.id);
    
    const result = {
      testUser,
      currentTime: currentTime.toISOString(),
      timezone: timezone,
      timeCalculations: {
        currentTimeInTZ: new Intl.DateTimeFormat('en-US', {
          timeZone: timezone as string,
          dateStyle: 'full',
          timeStyle: 'long'
        }).format(currentTime),
        currentHourInTZ,
        preferredHour,
        hourMatches: currentHourInTZ === preferredHour
      },
      dayComparisons: {
        currentDay: currentDayStr,
        joinDay: joinDayStr,
        lastQuizDay: lastQuizDayStr,
        sameAsJoinDay: currentDayStr === joinDayStr,
        sameAsLastQuizDay: currentDayStr === lastQuizDayStr
      },
      eligibilityChecks: {
        rightHour: currentHourInTZ === preferredHour,
        notJoinDay: currentDayStr !== joinDayStr,
        notAlreadyReceived: currentDayStr !== lastQuizDayStr,
        noPendingAnswers: pendingCount === 0,
        pendingCount
      }
    };
    
    // Final decision
    const shouldReceive = result.eligibilityChecks.rightHour && 
                         result.eligibilityChecks.notJoinDay && 
                         result.eligibilityChecks.notAlreadyReceived && 
                         result.eligibilityChecks.noPendingAnswers;
    
    res.json({
      success: true,
      shouldReceiveQuestion: shouldReceive,
      details: result,
      summary: `User ${shouldReceive ? 'SHOULD' : 'should NOT'} receive a question at this time`
    });
    
  } catch (error) {
    console.error('Error in specific timezone test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;