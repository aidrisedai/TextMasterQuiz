# Text4Quiz Platform Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Database Schema](#database-schema)
5. [Key Services](#key-services)
6. [SMS Delivery System](#sms-delivery-system)
7. [Phone Validation](#phone-validation)
8. [Admin Panel](#admin-panel)
9. [API Endpoints](#api-endpoints)
10. [Deployment & Operations](#deployment--operations)
11. [Troubleshooting](#troubleshooting)
12. [Known Issues & Solutions](#known-issues--solutions)

---

## System Overview

Text4Quiz is a full-stack SMS-based trivia application that delivers daily multiple-choice questions to users via text messages. Users sign up with their phone number, set preferences for question categories and delivery times, and receive automated trivia questions through SMS.

### Key Metrics
- **Active Users**: 35 (as of August 2025)
- **Daily Deliveries**: ~35 messages
- **Delivery Success Rate**: 100% for valid USA phone numbers
- **Question Categories**: Science, History, Pop Culture, Technology, Sports, Geography

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **SMS Provider**: Twilio
- **AI Provider**: Google Gemini 2.5 Flash
- **Deployment**: Replit
- **UI Components**: shadcn/ui + Tailwind CSS

---

## Architecture

### Directory Structure
```
/
├── client/               # Frontend React application
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable UI components
│       └── lib/         # Utilities and helpers
├── server/              # Backend Express server
│   ├── routes.ts        # User-facing API endpoints
│   ├── routes-admin.ts  # Admin API endpoints
│   ├── storage.ts       # Database abstraction layer
│   └── services/        # Core business logic
│       ├── twilio.ts            # SMS messaging
│       ├── gemini.ts            # AI question generation
│       └── queue-scheduler.ts   # Delivery scheduling
├── shared/              # Shared types and schemas
│   ├── schema.ts        # Database schema definitions
│   └── phone-validator.ts # Phone validation logic
└── src/                 # Additional frontend code
    ├── components/      # UI components
    └── lib/            # Frontend utilities
```

### Data Flow
1. **User Registration** → Validates phone → Creates user record → Sends welcome SMS
2. **Question Delivery** → Scheduler checks queue → Generates/selects question → Sends SMS
3. **Answer Processing** → Webhook receives SMS → Validates answer → Updates statistics
4. **Admin Operations** → Authentication → Dashboard access → Broadcast/Analytics

---

## Core Features

### 1. User Management
- Phone number validation (USA only)
- Timezone-aware delivery scheduling
- Category preferences
- Streak tracking
- Statistics (accuracy, total score)

### 2. Question System
- AI-generated questions via Google Gemini
- Fallback to database questions
- Multiple choice format (A, B, C, D)
- Explanations after correct answers
- Category-based selection

### 3. Delivery System
- Queue-based scheduling (not real-time cron)
- Pre-calculated UTC delivery times
- 15-minute processing intervals
- Automatic retry on failure
- Self-healing on server restart

### 4. Admin Panel
- User management
- Broadcast messaging
- Analytics dashboard
- Question library management
- Delivery monitoring

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR UNIQUE NOT NULL,
  admin_username VARCHAR UNIQUE,
  admin_password_hash VARCHAR,
  preferred_time VARCHAR DEFAULT '12:00',
  timezone VARCHAR DEFAULT 'America/New_York',
  categories TEXT[],
  is_active BOOLEAN DEFAULT true,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_question_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Delivery Queue Table
```sql
CREATE TABLE delivery_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  question_id INTEGER,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Questions Table
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a VARCHAR NOT NULL,
  option_b VARCHAR NOT NULL,
  option_c VARCHAR NOT NULL,
  option_d VARCHAR NOT NULL,
  correct_answer VARCHAR(1) NOT NULL,
  explanation TEXT,
  category VARCHAR,
  difficulty VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### User Answers Table
```sql
CREATE TABLE user_answers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  question_id INTEGER REFERENCES questions(id),
  user_answer VARCHAR(1),
  is_correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT NOW()
);
```

---

## Key Services

### Queue Scheduler Service (`server/services/queue-scheduler.ts`)

The heart of the delivery system. Runs two critical jobs:

#### 1. Midnight Queue Population (0:00 UTC)
```javascript
cron.schedule('0 0 * * *', async () => {
  // Populates next day's delivery queue
  // Converts user preferred times to UTC
  await populateTomorrowQueue();
});
```

#### 2. Queue Processing (Every 15 minutes)
```javascript
cron.schedule('*/15 * * * *', async () => {
  // Processes pending deliveries
  // Sends SMS messages
  await processDeliveryQueue();
});
```

#### Critical Functions:
- `populateTodayQueueIfNeeded()` - Self-healing on startup
- `sendScheduledDelivery()` - Handles individual delivery
- `getQuestionForUser()` - Selects or generates question

### Twilio Service (`server/services/twilio.ts`)

Handles all SMS operations:

```javascript
class TwilioService {
  async sendSMS(to: string, message: string): Promise<boolean> {
    // Validates phone number
    // Sends via Twilio API
    // Handles test mode fallback
  }
  
  async sendBulkSMS(messages: Array): Promise<Results> {
    // Batch sending for broadcasts
    // Tracks delivery status
  }
}
```

### Gemini Service (`server/services/gemini.ts`)

Generates dynamic questions:

```javascript
class GeminiService {
  async generateQuestion(category: string): Promise<Question> {
    // Calls Google Gemini API
    // Returns structured question
    // Falls back to database on failure
  }
}
```

---

## SMS Delivery System

### How It Works

1. **Daily at Midnight UTC**:
   - System populates delivery queue for next 24 hours
   - Each user's preferred time is converted to UTC
   - Entries created with status='pending'

2. **Every 15 Minutes**:
   - System checks for deliveries due now
   - Sends SMS to each user
   - Updates status to 'sent' or 'failed'

3. **On Server Startup**:
   - Checks if today's queue exists
   - Auto-populates if missing (self-healing)

### Timezone Handling

User sets preferred time in their timezone:
- User: "9:00 PM Pacific"
- System converts: 9:00 PM PST = 5:00 AM UTC (next day)
- Delivery scheduled: 2025-08-23 05:00:00 UTC

### Message Format
```
🧠 Question #10: [Question text]

A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

Reply with A, B, C, or D
```

---

## Phone Validation

### Frontend Validation (`src/lib/phone-validator.ts`)
- Real-time formatting as user types
- Visual feedback (✓, ✗, ⚠)
- Auto-formats: (310) 384-4794 → +13103844794
- Rejects test numbers (555 prefix)

### Backend Validation (`shared/phone-validator.ts`)
- Double-checks all submissions
- Validates NANP rules
- Checks valid area codes
- Ensures 10-digit format

### Valid Format Requirements
- Must be 10 digits (NPA-NXX-XXXX)
- Area code cannot start with 0 or 1
- Exchange cannot start with 0 or 1
- Cannot use 555 prefix (test numbers)

---

## Admin Panel

### Access
- URL: `/admin`
- Authentication: Username/password (not OAuth)
- Session-based authentication

### Features

#### 1. Dashboard
- Active user count
- Today's delivery status
- System health metrics
- Recent activity log

#### 2. User Management
- View all users
- Edit preferences
- Activate/deactivate
- View individual statistics

#### 3. Broadcast System
- Send mass messages
- Target by category/timezone
- Track delivery status
- Schedule future broadcasts

#### 4. Analytics
- Daily active users
- Answer accuracy rates
- Popular categories
- Engagement metrics

#### 5. Question Management
- Add/edit questions
- Import bulk questions
- Category management
- Difficulty settings

---

## API Endpoints

### Public Endpoints

```typescript
POST /api/signup
Body: { phoneNumber, preferredTime, timezone, categories }
Response: { success, message, userId }

POST /api/webhook/twilio
Body: Twilio webhook payload
Response: TwiML response

GET /api/user/:phoneNumber
Response: { user, stats }
```

### Admin Endpoints (Requires Authentication)

```typescript
POST /api/admin/login
Body: { username, password }

GET /api/admin/users
Response: { users: User[] }

POST /api/admin/broadcast
Body: { message, targetFilters }

GET /api/admin/analytics
Response: { metrics, charts }

GET /api/admin/delivery-status
Response: { todayStatus, queueStatus }
```

---

## Deployment & Operations

### Environment Variables
```bash
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+18885962752
GEMINI_API_KEY=...
SESSION_SECRET=...
NODE_ENV=production
```

### Database Migrations
```bash
npm run db:push        # Apply schema changes
npm run db:push --force # Force apply (may lose data)
```

### Starting the Application
```bash
npm run dev   # Development mode
npm run build # Production build
npm start     # Production server
```

### Monitoring
- Check `/api/admin/delivery-status` for queue health
- Monitor server logs for cron job execution
- Verify midnight UTC population runs

---

## Troubleshooting

### Common Issues

#### 1. Users Not Receiving Messages
**Check:**
- Delivery queue populated? Check `delivery_queue` table
- Valid phone number? Check `users` table
- Twilio credentials valid? Check environment variables
- Server running at midnight UTC? Check logs

**Fix:**
```sql
-- Check today's deliveries
SELECT * FROM delivery_queue 
WHERE DATE(scheduled_for) = CURRENT_DATE;

-- Manually populate if missing
-- Run: npx tsx server/fix-deliveries.ts
```

#### 2. Timezone Issues
**Problem**: Times stored incorrectly
**Cause**: Using local time instead of UTC
**Fix**: Ensure all date operations use UTC methods:
```javascript
// WRONG
date.setHours(0, 0, 0, 0);

// CORRECT
date.setUTCHours(0, 0, 0, 0);
```

#### 3. Phone Validation Rejecting Valid Numbers
**Check:**
- Area code in valid list
- Not a test number (555)
- Proper formatting

#### 4. Midnight Job Not Running
**Cause**: Server not running 24/7
**Solutions:**
1. Deploy with always-on hosting
2. Use external scheduler
3. Rely on startup self-healing

---

## Known Issues & Solutions

### Issue 1: Midnight Queue Population Failure
**Symptom**: Users don't get messages for a day
**Cause**: Server sleeping at midnight UTC
**Solution**: 
1. System self-heals on restart
2. Manual fix: Run `npx tsx server/fix-deliveries.ts`
3. Long-term: Deploy with always-on hosting

### Issue 2: Invalid Phone Numbers in Database
**Symptom**: SMS failures with "Invalid To Phone Number"
**Examples**: +11806709317, +11234567890
**Solution**: Backend validation now prevents new invalid entries

### Issue 3: Duplicate Deliveries
**Symptom**: User gets same question twice
**Cause**: Queue population running multiple times
**Solution**: Check for existing entries before inserting

### Issue 4: Wrong Delivery Times
**Symptom**: Messages sent at wrong time
**Cause**: Timezone conversion errors
**Solution**: Fixed timezone handling in `localTimeToUTC()`

---

## Performance Metrics

- **Queue Population**: ~1 second for 35 users
- **SMS Send Time**: ~500ms per message
- **Question Generation**: ~2 seconds via Gemini
- **Database Queries**: <50ms average
- **Server Memory**: ~150MB
- **Daily API Calls**: ~40 Twilio, ~20 Gemini

---

## Contact & Support

For urgent issues:
1. Check server logs: `npm run dev`
2. Check database: Query `delivery_queue` table
3. Verify environment variables
4. Test Twilio manually: Use test mode
5. Contact Replit support for hosting issues

---

Last Updated: August 22, 2025
Version: 2.0 (Queue-based scheduler)