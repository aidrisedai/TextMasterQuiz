// Broadcast service for SMS delivery
import { storage } from '../storage.js';
import { twilioService } from './twilio.js';
import type { Broadcast, User } from '@shared/schema';

class BroadcastService {
  private isProcessing = false;
  private RATE_LIMIT_MS = 100; // 10 messages per second

  async processBroadcast(broadcastId: number): Promise<void> {
    if (this.isProcessing) {
      console.log('Broadcast processor already running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      console.log(`🔄 Starting broadcast ${broadcastId} processing...`);

      const broadcast = await storage.getBroadcast(broadcastId);
      if (!broadcast) {
        console.error(`Broadcast ${broadcastId} not found`);
        return;
      }

      if (broadcast.status !== 'pending') {
        console.log(`Broadcast ${broadcastId} status is ${broadcast.status}, skipping...`);
        return;
      }

      // Get eligible users and create delivery records
      const eligibleUsers = await storage.getBroadcastEligibleUsers();
      console.log(`📊 Found ${eligibleUsers.length} eligible users for broadcast`);

      // Update broadcast with recipient count and mark as active
      await storage.updateBroadcast(broadcastId, {
        status: 'active',
        totalRecipients: eligibleUsers.length,
        startedAt: new Date(),
        estimatedDuration: Math.ceil(eligibleUsers.length * (this.RATE_LIMIT_MS / 1000) / 60), // minutes
      });

      // Create delivery records for all users
      const deliveryPromises = eligibleUsers.map(user =>
        storage.createBroadcastDelivery({
          broadcastId,
          userId: user.id,
          status: 'pending',
        })
      );
      await Promise.all(deliveryPromises);

      // Process deliveries with rate limiting
      await this.processDeliveries(broadcast, eligibleUsers);

      // Mark broadcast as completed
      const finalCounts = await this.getFinalCounts(broadcastId);
      await storage.updateBroadcast(broadcastId, {
        status: 'completed',
        completedAt: new Date(),
        sentCount: finalCounts.sent,
        failedCount: finalCounts.failed,
      });

      console.log(`✅ Broadcast ${broadcastId} completed: ${finalCounts.sent} sent, ${finalCounts.failed} failed`);

    } catch (error) {
      console.error(`❌ Broadcast ${broadcastId} failed:`, error);
      await storage.updateBroadcast(broadcastId, {
        status: 'failed',
        completedAt: new Date(),
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processDeliveries(broadcast: Broadcast, users: User[]): Promise<void> {
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        // Add broadcast identifier to message
        const message = `${broadcast.message}\n\nReply STOP to unsubscribe from broadcasts.`;
        
        // Send SMS
        const success = await twilioService.sendSMS({
          to: user.phoneNumber,
          body: message,
        });

        if (success) {
          // Update delivery status to sent
          const deliveries = await storage.getBroadcastDeliveries(broadcast.id);
          const userDelivery = deliveries.find(d => d.userId === user.id);
          if (userDelivery) {
            await storage.updateBroadcastDelivery(userDelivery.id, {
              status: 'sent',
              sentAt: new Date(),
            });
          }
          sentCount++;
        } else {
          throw new Error('SMS delivery failed');
        }

      } catch (error) {
        console.error(`Failed to send broadcast to ${user.phoneNumber}:`, error);
        
        // Update delivery status to failed
        const deliveries = await storage.getBroadcastDeliveries(broadcast.id);
        const userDelivery = deliveries.find(d => d.userId === user.id);
        if (userDelivery) {
          await storage.updateBroadcastDelivery(userDelivery.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        failedCount++;
      }

      // Update broadcast progress
      await storage.updateBroadcast(broadcast.id, {
        sentCount,
        failedCount,
      });

      // Rate limiting delay
      if (this.RATE_LIMIT_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS));
      }
    }
  }

  private async getFinalCounts(broadcastId: number): Promise<{ sent: number; failed: number }> {
    const deliveries = await storage.getBroadcastDeliveries(broadcastId);
    return {
      sent: deliveries.filter(d => d.status === 'sent').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
    };
  }

  async previewBroadcast(message: string): Promise<{
    recipientCount: number;
    estimatedDuration: number; // minutes
    characterCount: number;
    messagePreview: string;
  }> {
    const eligibleUsers = await storage.getBroadcastEligibleUsers();
    const fullMessage = `${message}\n\nReply STOP to unsubscribe from broadcasts.`;
    
    return {
      recipientCount: eligibleUsers.length,
      estimatedDuration: Math.ceil(eligibleUsers.length * (this.RATE_LIMIT_MS / 1000) / 60),
      characterCount: fullMessage.length,
      messagePreview: fullMessage,
    };
  }
}

export const broadcastService = new BroadcastService();