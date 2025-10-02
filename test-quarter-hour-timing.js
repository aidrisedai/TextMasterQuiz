// Test the quarter-hour timing calculation logic
function calculateNextQuarterHour() {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();
  
  console.log(`Current time: ${now.toLocaleTimeString()} (${currentMinute}:${currentSecond})`);
  
  // Find next quarter hour
  let nextQuarterMinute;
  if (currentMinute < 15) {
    nextQuarterMinute = 15;
  } else if (currentMinute < 30) {
    nextQuarterMinute = 30;
  } else if (currentMinute < 45) {
    nextQuarterMinute = 45;
  } else {
    nextQuarterMinute = 60; // Next hour at 0 minutes
  }
  
  // Calculate milliseconds until next quarter hour
  let msUntilNextQuarter;
  if (nextQuarterMinute === 60) {
    // Next hour
    msUntilNextQuarter = (60 - currentMinute) * 60 * 1000 - currentSecond * 1000;
  } else {
    // Within current hour
    msUntilNextQuarter = (nextQuarterMinute - currentMinute) * 60 * 1000 - currentSecond * 1000;
  }
  
  const nextRunTime = new Date(now.getTime() + msUntilNextQuarter);
  
  console.log(`Next quarter minute: ${nextQuarterMinute % 60}`);
  console.log(`Milliseconds until next quarter: ${msUntilNextQuarter}`);
  console.log(`Seconds until next quarter: ${Math.ceil(msUntilNextQuarter / 1000)}`);
  console.log(`Next run at: ${nextRunTime.toLocaleTimeString()}`);
  console.log(`Should align to: :${nextQuarterMinute % 60} minutes`);
}

calculateNextQuarterHour();