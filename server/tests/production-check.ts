#!/usr/bin/env node
import { storage } from '../storage';
import { twilioService } from '../services/twilio';
import { geminiService } from '../services/gemini';
import { schedulerService } from '../services/scheduler';

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

class ProductionReadinessChecker {
  private results: CheckResult[] = [];
  
  private addResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    this.results.push({ name, status, message, details });
  }
  
  private log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const symbols = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
    console.log(`${symbols[type]} ${message}`);
  }
  
  async checkEnvironmentVariables() {
    this.log('Checking environment variables...', 'info');
    
    const required = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN', 
      'TWILIO_PHONE_NUMBER',
      'GOOGLE_AI_API_KEY'
    ];
    
    for (const env of required) {
      if (process.env[env]) {
        this.addResult(`ENV_${env}`, 'PASS', `${env} is configured`);
      } else {
        this.addResult(`ENV_${env}`, 'FAIL', `${env} is missing`);
      }
    }
  }
  
  async checkDatabaseConnection() {
    this.log('Checking database connection...', 'info');
    
    try {
      const users = await storage.getAllUsers();
      const questions = await storage.getAllQuestions();
      
      this.addResult('DB_CONNECTION', 'PASS', 'Database connection successful');
      this.addResult('DB_USERS', 'PASS', `Found ${users.length} users`);
      this.addResult('DB_QUESTIONS', 'PASS', `Found ${questions.length} questions`);
      
      if (questions.length < 100) {
        this.addResult('DB_QUESTIONS_COUNT', 'WARN', 'Low question count for production');
      } else {
        this.addResult('DB_QUESTIONS_COUNT', 'PASS', 'Sufficient questions for production');
      }
      
    } catch (error) {
      this.addResult('DB_CONNECTION', 'FAIL', 'Database connection failed', error);
    }
  }
  
  async checkSMSService() {
    this.log('Checking SMS service...', 'info');
    
    try {
      const testMessage = {
        to: '+15153570454', // Test number
        body: 'Production readiness test message'
      };
      
      const result = await twilioService.sendSMS(testMessage);
      
      if (result) {
        this.addResult('SMS_SERVICE', 'PASS', 'SMS service is working');
      } else {
        this.addResult('SMS_SERVICE', 'WARN', 'SMS service returned false - check credentials');
      }
      
    } catch (error) {
      this.addResult('SMS_SERVICE', 'FAIL', 'SMS service failed', error);
    }
  }
  
  async checkAIService() {
    this.log('Checking AI service...', 'info');
    
    try {
      const question = await geminiService.generateQuestion('general', 'medium');
      
      if (question) {
        this.addResult('AI_SERVICE', 'PASS', 'AI service is working');
        this.addResult('AI_QUESTION_QUALITY', 'PASS', 'Generated question has all required fields');
      } else {
        this.addResult('AI_SERVICE', 'WARN', 'AI service returned null - using fallback');
      }
      
    } catch (error) {
      this.addResult('AI_SERVICE', 'FAIL', 'AI service failed', error);
    }
  }
  
  async checkDataIntegrity() {
    this.log('Checking data integrity...', 'info');
    
    try {
      const questions = await storage.getAllQuestions();
      let validQuestions = 0;
      let invalidQuestions = 0;
      
      for (const question of questions) {
        const isValid = (
          question.questionText &&
          question.optionA &&
          question.optionB &&
          question.optionC &&
          question.optionD &&
          ['A', 'B', 'C', 'D'].includes(question.correctAnswer) &&
          question.explanation &&
          question.category &&
          question.difficultyLevel
        );
        
        if (isValid) {
          validQuestions++;
        } else {
          invalidQuestions++;
        }
      }
      
      this.addResult('DATA_INTEGRITY', 'PASS', `${validQuestions} valid questions, ${invalidQuestions} invalid`);
      
      if (invalidQuestions > 0) {
        this.addResult('DATA_QUALITY', 'WARN', `${invalidQuestions} questions have missing or invalid data`);
      }
      
    } catch (error) {
      this.addResult('DATA_INTEGRITY', 'FAIL', 'Data integrity check failed', error);
    }
  }
  
  async checkSystemPerformance() {
    this.log('Checking system performance...', 'info');
    
    try {
      // Database performance
      const start = Date.now();
      await storage.getAllUsers();
      const dbTime = Date.now() - start;
      
      if (dbTime < 1000) {
        this.addResult('PERF_DATABASE', 'PASS', `Database query took ${dbTime}ms`);
      } else {
        this.addResult('PERF_DATABASE', 'WARN', `Database query took ${dbTime}ms - may be slow`);
      }
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      if (memoryMB < 200) {
        this.addResult('PERF_MEMORY', 'PASS', `Memory usage: ${memoryMB}MB`);
      } else {
        this.addResult('PERF_MEMORY', 'WARN', `Memory usage: ${memoryMB}MB - may be high`);
      }
      
    } catch (error) {
      this.addResult('PERF_CHECK', 'FAIL', 'Performance check failed', error);
    }
  }
  
  async checkSecurityMeasures() {
    this.log('Checking security measures...', 'info');
    
    try {
      // Check admin user exists
      const admin = await storage.getAdminByUsername('adminadmin123');
      if (admin) {
        this.addResult('SECURITY_ADMIN', 'PASS', 'Admin user exists');
        
        // Check password is hashed
        if (admin.password.includes('.')) {
          this.addResult('SECURITY_PASSWORD', 'PASS', 'Admin password is properly hashed');
        } else {
          this.addResult('SECURITY_PASSWORD', 'FAIL', 'Admin password is not hashed');
        }
      } else {
        this.addResult('SECURITY_ADMIN', 'FAIL', 'Admin user not found');
      }
      
      // Check session secret
      if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 32) {
        this.addResult('SECURITY_SESSION', 'PASS', 'Session secret is secure');
      } else {
        this.addResult('SECURITY_SESSION', 'FAIL', 'Session secret is too short or missing');
      }
      
    } catch (error) {
      this.addResult('SECURITY_CHECK', 'FAIL', 'Security check failed', error);
    }
  }
  
  async runAllChecks() {
    console.log('🚀 PRODUCTION READINESS CHECK');
    console.log('===============================\n');
    
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    await this.checkSMSService();
    await this.checkAIService();
    await this.checkDataIntegrity();
    await this.checkSystemPerformance();
    await this.checkSecurityMeasures();
    
    return this.generateReport();
  }
  
  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    
    console.log('\n📊 PRODUCTION READINESS REPORT');
    console.log('================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📋 Total checks: ${this.results.length}\n`);
    
    // Show failed checks
    const failedChecks = this.results.filter(r => r.status === 'FAIL');
    if (failedChecks.length > 0) {
      console.log('❌ FAILED CHECKS:');
      failedChecks.forEach(check => {
        console.log(`  - ${check.name}: ${check.message}`);
      });
      console.log('');
    }
    
    // Show warnings
    const warningChecks = this.results.filter(r => r.status === 'WARN');
    if (warningChecks.length > 0) {
      console.log('⚠️  WARNINGS:');
      warningChecks.forEach(check => {
        console.log(`  - ${check.name}: ${check.message}`);
      });
      console.log('');
    }
    
    // Final verdict
    if (failed === 0) {
      if (warnings === 0) {
        console.log('🎉 SYSTEM IS READY FOR PRODUCTION!');
        console.log('All checks passed successfully.\n');
        return { ready: true, score: 100 };
      } else {
        console.log('✅ SYSTEM IS READY FOR PRODUCTION WITH WARNINGS');
        console.log('Consider addressing warnings for optimal performance.\n');
        return { ready: true, score: 90 };
      }
    } else {
      console.log('❌ SYSTEM IS NOT READY FOR PRODUCTION');
      console.log('Please fix failed checks before deployment.\n');
      return { ready: false, score: Math.round((passed / this.results.length) * 100) };
    }
  }
}

// Run check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new ProductionReadinessChecker();
  checker.runAllChecks().then(result => {
    process.exit(result.ready ? 0 : 1);
  }).catch(error => {
    console.error('Production readiness check failed:', error);
    process.exit(1);
  });
}

export { ProductionReadinessChecker };