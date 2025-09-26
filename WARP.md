# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Text4Quiz is a full-stack SMS-based trivia application that delivers daily multiple-choice questions to users via text messages. Users sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS.

**Key Technologies:**
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express  
- Database: PostgreSQL (Neon) + Drizzle ORM
- SMS Provider: Twilio
- AI Provider: Google Gemini 2.5 Flash
- Deployment: Replit
- UI Components: shadcn/ui + Tailwind CSS

## Common Development Commands

### Development Setup
```bash
npm run dev          # Start development server (frontend + backend)
npm run build        # Build for production
npm start            # Start production server
npm run check        # TypeScript type checking
```

### Database Operations
```bash
npm run db:push      # Apply schema changes to database
npm run db:push --force  # Force apply (may lose data - use carefully)
```

### Testing Commands
```bash
# Manual SMS testing
npx tsx server/tests/manual-sms-tests.ts

# Test specific components
npx tsx server/services/twilio.ts      # Test Twilio service
npx tsx server/services/gemini.ts      # Test AI question generation
```

### Utility Scripts
```bash
# Generate questions for specific categories
npx tsx server/scripts/generate-questions.ts

# Fix delivery queue issues (emergency use)
npx tsx server/fix-deliveries.ts
```

## Architecture Overview

### Directory Structure
```
/
├── client/src/           # Frontend React application
│   ├── pages/           # Page components (admin, dashboard, home)
│   ├── components/      # Reusable UI components
│   ├── lib/            # Frontend utilities and API client
│   └── server/         # Client-side server utilities
├── server/              # Backend Express server
│   ├── services/       # Core business logic services
│   ├── scripts/        # Utility scripts
│   └── tests/          # Server-side tests
├── shared/             # Shared types and database schema
└── src/                # Additional frontend components
```

### Key Services Architecture

**Scheduler Services:** The application has multiple scheduler implementations:
- `scheduler.ts` - Legacy scheduler (mostly disabled)  
- `queue-scheduler.ts` - Queue-based delivery system (primary)
- `precision-scheduler.ts` - High-precision timing system
- `daily-cron.ts` - Daily maintenance jobs

**Message Delivery Flow:**
1. Queue population at midnight UTC (`queue-scheduler.ts`)
2. 15-minute batch processing checks pending deliveries
3. SMS sent via Twilio with delivery status tracking
4. User responses processed through webhook system

**Question Generation Pipeline:**
- AI-powered question generation via Google Gemini
- Fallback to database questions when AI unavailable
- Category-based rotation system for user preferences
- Question reuse prevention for individual users

### Database Schema

**Core Tables:**
- `users` - User profiles, preferences, and statistics
- `questions` - Question bank with categories and difficulty
- `user_answers` - Answer history and scoring
- `delivery_queue` - Scheduled message delivery system
- `admin_users` - Admin authentication
- `broadcasts` - Mass messaging system

**Key Relationships:**
- Users have many answers and delivery queue entries
- Questions can be answered by multiple users
- Broadcasts have delivery records per user

## Critical System Components

### SMS Delivery System
The delivery system uses a queue-based architecture with timezone-aware scheduling:

- **Midnight Population:** Daily at 00:00 UTC, the system calculates delivery times for all users
- **Batch Processing:** Every 15 minutes, pending deliveries are processed
- **Self-Healing:** On startup, missing queue entries are auto-populated
- **Single Attempt:** Messages are sent once without retries (by design preference)

### Phone Number Validation
Strict validation for USA phone numbers:
- Frontend: Real-time formatting and validation feedback
- Backend: Double validation with NANP rules
- Test number prevention (555 prefix blocked)
- Format: Must be 10 digits in +1XXXXXXXXXX format

### Admin Panel Features
- User management with statistics
- Broadcast messaging system
- Analytics dashboard with engagement metrics
- Question library management
- Delivery monitoring and health checks

## Environment Configuration

**Required Environment Variables:**
```bash
DATABASE_URL=postgresql://...         # Neon PostgreSQL connection
TWILIO_ACCOUNT_SID=AC...             # Twilio account identifier
TWILIO_AUTH_TOKEN=...                # Twilio authentication token
TWILIO_PHONE_NUMBER=+1...            # Sending phone number
GEMINI_API_KEY=...                   # Google Gemini API key
SESSION_SECRET=...                   # Express session secret
NODE_ENV=production                  # Environment mode
```

## Development Workflow

### Working with the Scheduler
The scheduler system is complex with multiple implementations. When making changes:

1. **Current Active System:** `queue-scheduler.ts` is the primary scheduler
2. **Testing Delivery:** Use manual SMS tests before deploying changes
3. **Debugging Queue Issues:** Check `delivery_queue` table for status
4. **Emergency Recovery:** Use `fix-deliveries.ts` script for queue corruption

### Database Development
- Schema changes go in `shared/schema.ts`
- Use `npm run db:push` to apply migrations
- Test changes locally before production deployment
- Monitor for breaking changes in production

### SMS Integration Testing
Always test SMS functionality thoroughly:
- Verify Twilio credentials are valid
- Test with real phone numbers (not test numbers)
- Check delivery status after sending
- Monitor for rate limiting issues

## Common Issues and Solutions

### Delivery System Problems
**Symptoms:** Users not receiving messages
**Common Causes:**
- Database connection failures
- Twilio authentication errors
- Queue population not running at midnight
- Invalid phone numbers in database

**Debugging Steps:**
1. Check `delivery_queue` table for pending entries
2. Verify Twilio credentials in environment
3. Test manual SMS sending
4. Check server logs for cron job execution

### TypeScript Errors in routes.ts
The main routes file has had recurring TypeScript issues. When editing:
- Always run `npm run check` before deployment
- Pay attention to type imports from `@shared/schema`
- Ensure proper error handling in async routes

### Timezone Handling
Critical for proper delivery timing:
- All database timestamps should be in UTC
- User timezone conversion happens at delivery time
- Use `Intl.DateTimeFormat` for timezone calculations
- Test thoroughly across different timezones

## Production Deployment Notes

### Replit Deployment
- Server runs on port 5000 (only non-firewalled port)
- Environment variables managed in Replit secrets
- Always-on hosting required for midnight queue population
- Monitor server uptime for delivery reliability

### Performance Considerations
- Queue population: ~1 second for 35 users
- SMS send time: ~500ms per message
- Question generation: ~2 seconds via Gemini
- Database queries: <50ms average
- Daily API usage: ~40 Twilio, ~20 Gemini calls

### Monitoring and Alerting
- Check `/api/admin/delivery-status` for queue health
- Monitor server logs for delivery failures
- Track user engagement through admin dashboard
- Watch for authentication failures in Twilio logs