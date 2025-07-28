import { storage } from '../storage';

interface TimezoneTestResult {
  scenario: string;
  user: any;
  currentTime: Date;
  expectedResult: boolean;
  actualResult: boolean;
  passed: boolean;
  details: string;
}

class TimezoneSchedulerTester {
  private getCurrentHourInTimezone(date: Date, timezone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false
    });
    
    const hour = formatter.format(date);
    return parseInt(hour, 10);
  }

  private async shouldUserReceiveQuestion(user: any, currentTime: Date): Promise<boolean> {
    const userTimezone = user.timezone || 'America/Los_Angeles';
    
    // Check if user joined today - skip if they got welcome question
    const todayInUserTZ = currentTime;
    const joinDateInUserTZ = new Date(user.joinDate);
    
    if (this.isSameDayInTimezone(todayInUserTZ, joinDateInUserTZ, userTimezone)) {
      return false;
    }
    
    // Check if already received today's question
    if (user.lastQuizDate) {
      const lastQuizInUserTZ = new Date(user.lastQuizDate);
      if (this.isSameDayInTimezone(todayInUserTZ, lastQuizInUserTZ, userTimezone)) {
        return false;
      }
    }
    
    // Check for pending answers
    const pendingCount = await storage.getPendingAnswersCount(user.id);
    if (pendingCount > 0) {
      return false;
    }
    
    return true;
  }

  private isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
    const format: Intl.DateTimeFormatOptions = { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    return new Intl.DateTimeFormat('en-US', format).format(date1) === 
           new Intl.DateTimeFormat('en-US', format).format(date2);
  }

  private async checkUserEligibility(user: any, currentTime: Date): Promise<boolean> {
    const [preferredHour, preferredMinute] = user.preferredTime.split(':').map(Number);
    const userTimezone = user.timezone || 'America/Los_Angeles';
    
    // Get user's current hour in their timezone
    const userCurrentHour = this.getCurrentHourInTimezone(currentTime, userTimezone);
    
    // Check if current time matches user's preferred time
    if (userCurrentHour === preferredHour) {
      return await this.shouldUserReceiveQuestion(user, currentTime);
    }
    
    return false;
  }

  async runComprehensiveTests(): Promise<TimezoneTestResult[]> {
    const results: TimezoneTestResult[] = [];
    
    // Test scenarios with different timezones and times
    const testScenarios = [
      {
        name: "Pacific user at 9 PM (should receive)",
        user: {
          id: 'test-1',
          phoneNumber: '+15153570454',
          preferredTime: '21:00',
          timezone: 'America/Los_Angeles',
          joinDate: new Date('2025-07-20T00:00:00Z'), // 5 days ago
          lastQuizDate: new Date('2025-07-24T00:00:00Z'), // yesterday
          isActive: true
        },
        currentTime: new Date('2025-07-26T04:00:00Z'), // 9 PM Pacific
        expected: true
      },
      {
        name: "Pacific user at 8 PM (should not receive)",
        user: {
          id: 'test-2',
          phoneNumber: '+15153570454',
          preferredTime: '21:00',
          timezone: 'America/Los_Angeles',
          joinDate: new Date('2025-07-20T00:00:00Z'),
          lastQuizDate: new Date('2025-07-24T00:00:00Z'),
          isActive: true
        },
        currentTime: new Date('2025-07-26T03:00:00Z'), // 8 PM Pacific
        expected: false
      },
      {
        name: "Eastern user at 9 PM (should receive)",
        user: {
          id: 'test-3',
          phoneNumber: '+12125551234',
          preferredTime: '21:00',
          timezone: 'America/New_York',
          joinDate: new Date('2025-07-20T00:00:00Z'),
          lastQuizDate: new Date('2025-07-24T00:00:00Z'),
          isActive: true
        },
        currentTime: new Date('2025-07-26T01:00:00Z'), // 9 PM Eastern
        expected: true
      },
      {
        name: "User who already received today's question",
        user: {
          id: 'test-4',
          phoneNumber: '+15153570454',
          preferredTime: '21:00',
          timezone: 'America/Los_Angeles',
          joinDate: new Date('2025-07-20T00:00:00Z'),
          lastQuizDate: new Date('2025-07-25T04:00:00Z'), // today at 9 PM Pacific
          isActive: true
        },
        currentTime: new Date('2025-07-26T04:00:00Z'), // 9 PM Pacific next day
        expected: true // Should receive tomorrow's question
      },
      {
        name: "User who joined today (should not receive)",
        user: {
          id: 'test-5',
          phoneNumber: '+15153570454',
          preferredTime: '21:00',
          timezone: 'America/Los_Angeles',
          joinDate: new Date('2025-07-25T20:00:00Z'), // today
          lastQuizDate: null,
          isActive: true
        },
        currentTime: new Date('2025-07-26T04:00:00Z'), // 9 PM Pacific same day
        expected: false
      },
      {
        name: "UTC timezone user",
        user: {
          id: 'test-6',
          phoneNumber: '+447700900123',
          preferredTime: '18:00',
          timezone: 'UTC',
          joinDate: new Date('2025-07-20T00:00:00Z'),
          lastQuizDate: new Date('2025-07-24T00:00:00Z'),
          isActive: true
        },
        currentTime: new Date('2025-07-25T18:00:00Z'), // 6 PM UTC
        expected: true
      },
      {
        name: "DST transition test (Pacific)",
        user: {
          id: 'test-7',
          phoneNumber: '+15153570454',
          preferredTime: '21:00',
          timezone: 'America/Los_Angeles',
          joinDate: new Date('2025-07-20T00:00:00Z'),
          lastQuizDate: new Date('2025-07-24T00:00:00Z'),
          isActive: true
        },
        currentTime: new Date('2025-03-10T05:00:00Z'), // During DST transition
        expected: true
      }
    ];

    for (const scenario of testScenarios) {
      try {
        const actualResult = await this.checkUserEligibility(scenario.user, scenario.currentTime);
        
        const result: TimezoneTestResult = {
          scenario: scenario.name,
          user: scenario.user,
          currentTime: scenario.currentTime,
          expectedResult: scenario.expected,
          actualResult,
          passed: actualResult === scenario.expected,
          details: this.getTestDetails(scenario.user, scenario.currentTime, actualResult)
        };
        
        results.push(result);
      } catch (error) {
        results.push({
          scenario: scenario.name,
          user: scenario.user,
          currentTime: scenario.currentTime,
          expectedResult: scenario.expected,
          actualResult: false,
          passed: false,
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return results;
  }

  private getTestDetails(user: any, currentTime: Date, result: boolean): string {
    const timezone = user.timezone || 'America/Los_Angeles';
    const userHour = this.getCurrentHourInTimezone(currentTime, timezone);
    const [preferredHour] = user.preferredTime.split(':').map(Number);
    
    const currentTimeInTZ = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(currentTime);
    
    return `Current time in ${timezone}: ${currentTimeInTZ} (Hour: ${userHour}), Preferred: ${preferredHour}:00, Result: ${result}`;
  }

  printResults(results: TimezoneTestResult[]): void {
    console.log('\n=== TIMEZONE SCHEDULER TESTING RESULTS ===\n');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`Overall: ${passed}/${total} tests passed\n`);
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} - ${result.scenario}`);
      console.log(`   ${result.details}`);
      if (!result.passed) {
        console.log(`   Expected: ${result.expectedResult}, Got: ${result.actualResult}`);
      }
      console.log('');
    });
    
    if (passed === total) {
      console.log('🎉 All timezone tests passed! The scheduler logic is working correctly.');
    } else {
      console.log(`⚠️  ${total - passed} test(s) failed. Review the logic for these scenarios.`);
    }
  }
}

export async function runTimezoneTests(): Promise<void> {
  const tester = new TimezoneSchedulerTester();
  const results = await tester.runComprehensiveTests();
  tester.printResults(results);
}

// Run tests if this file is executed directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  runTimezoneTests().catch(console.error);
}