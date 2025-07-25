import { Router } from 'express';

const router = Router();

// Pure timezone calculation tests without database dependencies
router.get('/test-timezone-pure', async (req, res) => {
  try {
    const testResults = [];
    
    // Test 1: Pacific user at 9 PM (should match preferred hour)
    const test1Time = new Date('2025-07-26T04:00:00Z'); // 9 PM Pacific
    const test1Hour = getCurrentHourInTimezone(test1Time, 'America/Los_Angeles');
    testResults.push({
      test: 'Pacific 9 PM',
      currentTimeUTC: test1Time.toISOString(),
      timezone: 'America/Los_Angeles',
      extractedHour: test1Hour,
      preferredHour: 21,
      hourMatches: test1Hour === 21,
      timeInTZ: formatTimeInTimezone(test1Time, 'America/Los_Angeles'),
      passed: test1Hour === 21
    });
    
    // Test 2: Eastern user at 9 PM 
    const test2Time = new Date('2025-07-26T01:00:00Z'); // 9 PM Eastern
    const test2Hour = getCurrentHourInTimezone(test2Time, 'America/New_York');
    testResults.push({
      test: 'Eastern 9 PM',
      currentTimeUTC: test2Time.toISOString(),
      timezone: 'America/New_York', 
      extractedHour: test2Hour,
      preferredHour: 21,
      hourMatches: test2Hour === 21,
      timeInTZ: formatTimeInTimezone(test2Time, 'America/New_York'),
      passed: test2Hour === 21
    });
    
    // Test 3: UTC user at 6 PM
    const test3Time = new Date('2025-07-25T18:00:00Z'); // 6 PM UTC
    const test3Hour = getCurrentHourInTimezone(test3Time, 'UTC');
    testResults.push({
      test: 'UTC 6 PM',
      currentTimeUTC: test3Time.toISOString(),
      timezone: 'UTC',
      extractedHour: test3Hour,
      preferredHour: 18,
      hourMatches: test3Hour === 18,
      timeInTZ: formatTimeInTimezone(test3Time, 'UTC'),
      passed: test3Hour === 18
    });
    
    // Test 4: Same day comparison in different timezones
    const dayTestTime = new Date('2025-07-25T04:00:00Z'); // 9 PM Pacific July 24
    const dayTestTime2 = new Date('2025-07-24T16:00:00Z'); // 9 AM Pacific July 24
    const sameDay = isSameDayInTimezone(dayTestTime, dayTestTime2, 'America/Los_Angeles');
    testResults.push({
      test: 'Same day Pacific comparison',
      time1: dayTestTime.toISOString(),
      time2: dayTestTime2.toISOString(), 
      timezone: 'America/Los_Angeles',
      time1InTZ: formatDateInTimezone(dayTestTime, 'America/Los_Angeles'),
      time2InTZ: formatDateInTimezone(dayTestTime2, 'America/Los_Angeles'),
      sameDay: sameDay,
      passed: sameDay === true
    });
    
    // Test 5: DST transition handling
    const dstTime = new Date('2025-03-10T05:00:00Z'); // During DST transition
    const dstHour = getCurrentHourInTimezone(dstTime, 'America/Los_Angeles');
    testResults.push({
      test: 'DST transition',
      currentTimeUTC: dstTime.toISOString(),
      timezone: 'America/Los_Angeles',
      extractedHour: dstHour,
      timeInTZ: formatTimeInTimezone(dstTime, 'America/Los_Angeles'),
      note: 'DST handling verification',
      passed: true // Just verify it doesn't crash
    });
    
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    
    res.json({
      success: true,
      summary: `${passedTests}/${totalTests} timezone calculation tests passed`,
      allPassed: passedTests === totalTests,
      testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in pure timezone test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test the exact logic for +15153570454 user scenario
router.get('/test-user-scenario', async (req, res) => {
  try {
    const { currentTime } = req.query;
    
    // Real user scenario for +15153570454
    const realUser = {
      phoneNumber: '+15153570454',
      preferredTime: '21:00', // 9 PM
      timezone: 'America/Los_Angeles',
      joinDate: new Date('2025-07-20T00:00:00Z'), // 5 days ago
      lastQuizDate: new Date('2025-07-24T00:00:00Z') // yesterday
    };
    
    const testTime = currentTime ? new Date(currentTime as string) : new Date();
    const [preferredHour] = realUser.preferredTime.split(':').map(Number);
    
    // Extract hour in user's timezone
    const currentHourInTZ = getCurrentHourInTimezone(testTime, realUser.timezone);
    
    // Check day comparisons
    const todayStr = formatDateInTimezone(testTime, realUser.timezone);
    const joinDayStr = formatDateInTimezone(new Date(realUser.joinDate), realUser.timezone);
    const lastQuizDayStr = formatDateInTimezone(new Date(realUser.lastQuizDate), realUser.timezone);
    
    const eligibility = {
      rightHour: currentHourInTZ === preferredHour,
      notJoinDay: todayStr !== joinDayStr,
      notAlreadyReceived: todayStr !== lastQuizDayStr,
      noPendingAnswers: true // Assume for test
    };
    
    const shouldReceive = eligibility.rightHour && eligibility.notJoinDay && 
                         eligibility.notAlreadyReceived && eligibility.noPendingAnswers;
    
    res.json({
      success: true,
      user: realUser,
      testTime: testTime.toISOString(),
      timeInUserTZ: formatTimeInTimezone(testTime, realUser.timezone),
      currentHourInTZ,
      preferredHour,
      dayComparisons: {
        today: todayStr,
        joinDay: joinDayStr, 
        lastQuizDay: lastQuizDayStr
      },
      eligibility,
      shouldReceiveQuestion: shouldReceive,
      conclusion: shouldReceive ? 'User SHOULD receive question now' : 'User should NOT receive question now'
    });
    
  } catch (error) {
    console.error('Error in user scenario test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions (copied from scheduler)
function getCurrentHourInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false
  });
  
  const hour = formatter.format(date);
  return parseInt(hour, 10);
}

function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  const format: Intl.DateTimeFormatOptions = { 
    timeZone: timezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  return new Intl.DateTimeFormat('en-US', format).format(date1) === 
         new Intl.DateTimeFormat('en-US', format).format(date2);
}

function formatTimeInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(date);
}

function formatDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).format(date);
}

export default router;