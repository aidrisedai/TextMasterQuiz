import { runTimezoneTests } from './tests/timezone-scheduler-test';
import fs from 'fs/promises';
import path from 'path';

interface TestResult {
  testFile: string;
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

interface TestReport {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  overallDuration: number;
  suites: TestSuite[];
  overallScore: number;
}

class TestRunner {
  private testResults: TestSuite[] = [];

  async runAllTests(): Promise<TestReport> {
    const startTime = Date.now();
    
    console.log('🧪 Starting comprehensive test suite...\n');
    
    // Run timezone tests
    await this.runTimezoneTests();
    
    // Run API endpoint tests
    await this.runApiTests();
    
    // Run SMS logic tests
    await this.runSmsTests();
    
    const endTime = Date.now();
    const overallDuration = endTime - startTime;
    
    return this.generateReport(overallDuration);
  }

  private async runTimezoneTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Timezone & Scheduler Logic',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: 0
    };

    const startTime = Date.now();
    
    try {
      console.log('📅 Running timezone calculation tests...');
      
      // Capture console output from timezone tests
      const originalLog = console.log;
      let testOutput = '';
      
      console.log = (...args) => {
        testOutput += args.join(' ') + '\n';
      };
      
      await runTimezoneTests();
      
      console.log = originalLog;
      
      // Parse the test output to extract results
      const lines = testOutput.split('\n');
      let currentTest = '';
      
      for (const line of lines) {
        if (line.includes('✅ PASS') || line.includes('❌ FAIL')) {
          const passed = line.includes('✅ PASS');
          const testName = line.split(' - ')[1] || 'Unknown test';
          
          suite.results.push({
            testFile: 'timezone-scheduler-test.ts',
            testName,
            passed,
            error: passed ? undefined : 'Test failed - see details in output',
            duration: 50 // Estimated
          });
          
          if (passed) suite.passedTests++;
          else suite.failedTests++;
          suite.totalTests++;
        }
      }
      
    } catch (error) {
      suite.results.push({
        testFile: 'timezone-scheduler-test.ts',
        testName: 'Timezone test execution',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      });
      suite.failedTests++;
      suite.totalTests++;
    }
    
    suite.duration = Date.now() - startTime;
    this.testResults.push(suite);
  }

  private async runApiTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'API Endpoint Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: 0
    };

    const startTime = Date.now();
    
    const apiTests = [
      {
        name: 'Pure timezone calculations',
        endpoint: 'http://localhost:5000/api/test/test-timezone-pure',
        expectKey: 'allPassed',
        expectValue: true
      },
      {
        name: 'User scenario test (9 PM Pacific)',
        endpoint: 'http://localhost:5000/api/test/test-user-scenario?currentTime=2025-07-26T04:00:00Z',
        expectKey: 'shouldReceiveQuestion',
        expectValue: true
      },
      {
        name: 'User scenario test (8 PM Pacific)',
        endpoint: 'http://localhost:5000/api/test/test-user-scenario?currentTime=2025-07-26T03:00:00Z',
        expectKey: 'shouldReceiveQuestion', 
        expectValue: false
      },
      {
        name: 'Timezone specific test',
        endpoint: 'http://localhost:5000/api/test/test-timezone-specific?timezone=America/Los_Angeles&hour=21&testTime=2025-07-26T04:00:00Z',
        expectKey: 'shouldReceiveQuestion',
        expectValue: true
      }
    ];

    for (const test of apiTests) {
      const testStartTime = Date.now();
      
      try {
        console.log(`🌐 Testing: ${test.name}`);
        
        const response = await fetch(test.endpoint);
        const data = await response.json();
        
        const passed = data[test.expectKey] === test.expectValue;
        
        suite.results.push({
          testFile: 'api-endpoints',
          testName: test.name,
          passed,
          error: passed ? undefined : `Expected ${test.expectKey}=${test.expectValue}, got ${data[test.expectKey]}`,
          duration: Date.now() - testStartTime
        });
        
        if (passed) suite.passedTests++;
        else suite.failedTests++;
        suite.totalTests++;
        
      } catch (error) {
        suite.results.push({
          testFile: 'api-endpoints',
          testName: test.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Network error',
          duration: Date.now() - testStartTime
        });
        suite.failedTests++;
        suite.totalTests++;
      }
    }
    
    suite.duration = Date.now() - startTime;
    this.testResults.push(suite);
  }

  private async runSmsTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'SMS Logic Tests', 
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: 0
    };

    const startTime = Date.now();
    
    const smsTests = [
      {
        name: 'SMS Commands Test',
        endpoint: 'http://localhost:5000/api/test/sms-commands'
      },
      {
        name: 'Manual SMS Tests',
        endpoint: 'http://localhost:5000/api/test/manual-sms-tests'
      }
    ];

    for (const test of smsTests) {
      const testStartTime = Date.now();
      
      try {
        console.log(`📱 Testing: ${test.name}`);
        
        const response = await fetch(test.endpoint);
        const data = await response.json();
        
        const passed = data.success === true && (!data.results || data.results.every((r: any) => r.success));
        
        suite.results.push({
          testFile: 'sms-tests',
          testName: test.name,
          passed,
          error: passed ? undefined : data.error || 'SMS test failed',
          duration: Date.now() - testStartTime
        });
        
        if (passed) suite.passedTests++;
        else suite.failedTests++;
        suite.totalTests++;
        
      } catch (error) {
        // SMS tests might fail due to missing credentials, which is expected
        suite.results.push({
          testFile: 'sms-tests', 
          testName: test.name,
          passed: false,
          error: 'SMS tests require Twilio credentials (expected)',
          duration: Date.now() - testStartTime
        });
        suite.failedTests++;
        suite.totalTests++;
      }
    }
    
    suite.duration = Date.now() - startTime;
    this.testResults.push(suite);
  }

  private generateReport(overallDuration: number): TestReport {
    const totalTests = this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = this.testResults.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = this.testResults.reduce((sum, suite) => sum + suite.failedTests, 0);
    const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    return {
      totalSuites: this.testResults.length,
      totalTests,
      totalPassed,
      totalFailed,
      overallDuration,
      suites: this.testResults,
      overallScore
    };
  }

  printReport(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Test Suites: ${report.totalSuites}`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.totalPassed} ✅`);
    console.log(`   Failed: ${report.totalFailed} ❌`);
    console.log(`   Score: ${report.overallScore}% 🎯`);
    console.log(`   Duration: ${report.overallDuration}ms ⏱️`);
    
    console.log('\n📋 DETAILED RESULTS BY SUITE:\n');
    
    report.suites.forEach((suite, index) => {
      const suiteScore = suite.totalTests > 0 ? Math.round((suite.passedTests / suite.totalTests) * 100) : 0;
      
      console.log(`${index + 1}. ${suite.name}`);
      console.log(`   Score: ${suiteScore}% (${suite.passedTests}/${suite.totalTests})`);
      console.log(`   Duration: ${suite.duration}ms`);
      
      if (suite.failedTests > 0) {
        console.log('   Failed tests:');
        suite.results
          .filter(r => !r.passed)
          .forEach(r => {
            console.log(`   ❌ ${r.testName}: ${r.error || 'Unknown error'}`);
          });
      }
      
      console.log('');
    });
    
    if (report.overallScore >= 80) {
      console.log('🎉 EXCELLENT! Test suite is in great shape.');
    } else if (report.overallScore >= 60) {
      console.log('⚠️  GOOD: Most tests passing, some areas need attention.');
    } else {
      console.log('🚨 NEEDS WORK: Multiple test failures detected.');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

export async function runAllTests(): Promise<TestReport> {
  const runner = new TestRunner();
  const report = await runner.runAllTests();
  runner.printReport(report);
  return report;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}