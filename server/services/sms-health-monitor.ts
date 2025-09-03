// SMS Delivery Health Monitor
export class SMSHealthMonitor {
  private failures = 0;
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private circuitOpen = false;
  private lastFailureTime = 0;

  // Method to manually reset circuit breaker
  forceReset() {
    console.log('🔄 Manually resetting SMS circuit breaker...');
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    console.log('✅ SMS circuit breaker manually reset');
  }

  isHealthy(): boolean {
    if (this.circuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
        console.log('🔄 Circuit breaker reset - attempting SMS recovery');
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
      } else {
        return false;
      }
    }
    return true;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.circuitOpen) {
      console.log('✅ SMS service recovered');
      this.circuitOpen = false;
    }
  }

  recordFailure() {
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      console.log('🚨 Circuit breaker opened - SMS service appears down');
      this.circuitOpen = true;
    }
  }

  getStatus() {
    return {
      healthy: this.isHealthy(),
      totalFailures: this.failures,
      consecutiveFailures: this.consecutiveFailures,
      circuitOpen: this.circuitOpen
    };
  }
}

export const smsHealthMonitor = new SMSHealthMonitor();