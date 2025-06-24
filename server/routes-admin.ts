// Admin routes for testing and monitoring SMS delivery
import { Router } from 'express';
import { twilioService } from './services/twilio.js';
import { storage } from './storage.js';

const router = Router();

// Test SMS delivery with detailed monitoring
router.post('/test-delivery', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Send a simple test message
    const testMessage = {
      to: phoneNumber,
      body: 'Text4Quiz delivery test - reply RECEIVED if you get this message'
    };

    const sent = await twilioService.sendSMS(testMessage);
    
    res.json({ 
      message: 'Test message sent', 
      sent,
      note: 'Check server logs for delivery status in 3-5 seconds'
    });
  } catch (error) {
    console.error('Test delivery error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// Get SMS delivery statistics
router.get('/sms-stats', async (req, res) => {
  try {
    // This would require implementing SMS logging in the database
    // For now, return basic info
    res.json({
      message: 'SMS statistics endpoint',
      note: 'Check server console logs for delivery status',
      recommendation: 'Monitor Twilio console for detailed delivery analytics'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get SMS stats' });
  }
});

export { router as adminRoutes };