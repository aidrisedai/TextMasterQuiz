#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

// Production readiness test runner
async function runTests() {
  console.log('🚀 Starting Production Readiness Test Suite');
  console.log('===============================================\n');

  const testFiles = [
    'server/tests/production-readiness.test.ts',
    'server/tests/api-endpoints.test.ts',
    'server/tests/performance.test.ts',
    'server/tests/integration.test.ts',
    'server/tests/health.test.ts',
    'server/tests/sms-commands.test.ts',
    'server/tests/sms-integration.test.ts',
  ];

  let passedTests = 0;
  let failedTests = 0;
  const results: { file: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  for (const testFile of testFiles) {
    console.log(`\n📋 Running: ${testFile}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await runSingleTest(testFile);
      if (result.success) {
        console.log(`✅ PASSED: ${testFile}`);
        results.push({ file: testFile, status: 'PASS' });
        passedTests++;
      } else {
        console.log(`❌ FAILED: ${testFile}`);
        console.log(`Error: ${result.error}`);
        results.push({ file: testFile, status: 'FAIL', details: result.error });
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${testFile}`);
      console.log(`Error: ${error}`);
      results.push({ file: testFile, status: 'FAIL', details: String(error) });
      failedTests++;
    }
  }

  // Summary
  console.log('\n🎯 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production deployment.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
    console.log('\nFailed tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.file}: ${r.details}`));
    process.exit(1);
  }
}

function runSingleTest(testFile: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const testProcess = spawn('npx', ['jest', testFile, '--verbose'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || stdout });
      }
    });

    testProcess.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };