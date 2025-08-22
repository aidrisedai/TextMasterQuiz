import { storage } from './storage';

async function fixMissingDeliveries() {
  console.log("🔧 Fixing missing August 22 deliveries...");
  
  // Populate for August 22, 2025
  const aug22 = new Date('2025-08-22T00:00:00Z');
  
  console.log(`📅 Populating deliveries for ${aug22.toISOString()}`);
  const count = await storage.populateDeliveryQueue(aug22);
  
  console.log(`✅ Successfully added ${count} deliveries for August 22`);
  
  // Check the status
  const status = await storage.getTodayDeliveryStatus();
  console.log(`📊 Total deliveries for today: ${status.length}`);
  
  process.exit(0);
}

fixMissingDeliveries().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});