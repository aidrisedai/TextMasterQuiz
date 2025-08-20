# Text4Quiz Platform Walkthrough for New Engineers

## System Overview
Text4Quiz is an SMS-based trivia application that delivers daily questions to users via Twilio. Users sign up with their phone number, set preferences, and receive automated trivia questions at their preferred time.

## Architecture Components
- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **SMS Service**: Twilio API
- **AI Service**: Google Gemini for question generation
- **Scheduler**: Queue-based delivery system (runs every 15 minutes)

---

## PART 1: USER SIGNUP FLOW

### Step 1.1: Frontend Signup Form
**File: `src/pages/HomePage.tsx`**

The user enters their phone number and preferences in a form:
```typescript
// User fills out:
- Phone number
- Preferred delivery time (e.g., "21:00")
- Timezone (e.g., "America/Los_Angeles")
- Question categories (optional)
```

### Step 1.2: API Endpoint Receives Signup
**File: `server/routes.ts` (lines ~50-80)**

```typescript
app.post('/api/signup', async (req, res) => {
  const { phoneNumber, preferredTime, timezone, categoryPreferences } = req.body;
  
  // Validation with Zod schema
  const validated = insertUserSchema.parse(req.body);
  
  // Create user in database
  const user = await storage.createUser({
    phoneNumber,
    preferredTime,  // e.g., "21:00"
    timezone,        // e.g., "America/Los_Angeles"
    categoryPreferences,
    isActive: true
  });
  
  // Send welcome SMS
  await twilioService.sendSMS({
    to: phoneNumber,
    body: "Welcome to Text4Quiz! You'll receive your first question at your preferred time."
  });
});
```

### Step 1.3: User Storage in Database
**File: `server/storage.ts` (createUser method)**

```typescript
async createUser(userData: InsertUser): Promise<User> {
  const [user] = await db.insert(users).values({
    ...userData,
    currentStreak: 0,
    longestStreak: 0,
    totalScore: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    isActive: true,
    createdAt: new Date(),
    lastQuizDate: null
  }).returning();
  return user;
}
```

---

## PART 2: DAILY QUEUE POPULATION (Midnight UTC)

### Step 2.1: Scheduler Initialization
**File: `server/services/queue-scheduler.ts` (lines 9-28)**

```typescript
init() {
  // Daily queue population at midnight UTC
  cron.schedule('0 0 * * *', async () => {
    await this.populateTomorrowQueue();
  });
  
  // Process queue every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await this.processDeliveryQueue();
  });
}
```

### Step 2.2: Queue Population Logic
**File: `server/storage.ts` (lines 481-542)**

This is where the magic happens - converting user preferences to UTC times:

```typescript
async populateDeliveryQueue(date: Date): Promise<number> {
  // Get all active users
  const activeUsers = await db.select().from(users).where(eq(users.isActive, true));
  
  for (const user of activeUsers) {
    // Parse preferred time (e.g., "21:00")
    const [hours, minutes] = user.preferredTime.split(':').map(Number);
    
    // Build local time string
    const localDateStr = `2025-08-20T21:00:00`;  // Example for 9 PM
    
    // Convert to UTC using binary search algorithm
    const utcTimestamp = this.localTimeToUTC(localDateStr, user.timezone);
    // For 21:00 Pacific → becomes 04:00 UTC next day
    
    // Insert into delivery queue
    await db.insert(deliveryQueue).values({
      userId: user.id,
      scheduledFor: utcTimestamp,  // Stored in UTC
      status: 'pending',
      attempts: 0
    });
  }
}
```

### Step 2.3: Timezone Conversion (The Critical Part!)
**File: `server/storage.ts` (lines 544-605)**

```typescript
private localTimeToUTC(localDateStr: string, timezone: string): Date {
  // Uses binary search to find exact UTC time
  // that corresponds to the user's local time
  
  let low = testDate.getTime() - 24 * 60 * 60 * 1000;
  let high = testDate.getTime() + 24 * 60 * 60 * 1000;
  
  while (high - low > 60000) { // Search until within 1 minute
    const mid = Math.floor((low + high) / 2);
    const midDate = new Date(mid);
    
    // Use Intl.DateTimeFormat to check what local time this UTC represents
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const formatted = formatter.format(midDate);
    // Compare and adjust search range
  }
  
  return result; // UTC timestamp
}
```

---

## PART 3: MESSAGE DELIVERY (Every 15 Minutes)

### Step 3.1: Queue Processor Runs
**File: `server/services/queue-scheduler.ts` (lines 58-79)**

```typescript
private async processDeliveryQueue() {
  const now = new Date();
  
  // Get messages that should be sent now
  const deliveries = await storage.getDeliveriesToSend(now);
  
  for (const delivery of deliveries) {
    await this.sendScheduledDelivery(delivery);
  }
}
```

### Step 3.2: Fetching Due Deliveries
**File: `server/storage.ts` (lines 608-622)**

This is the bulletproof UTC comparison:

```typescript
async getDeliveriesToSend(currentTime: Date): Promise<DeliveryQueue[]> {
  const windowEnd = new Date(currentTime);
  windowEnd.setMinutes(windowEnd.getMinutes() + 5); // 5 minute grace window
  
  return await db.select().from(deliveryQueue).where(and(
    eq(deliveryQueue.status, 'pending'),        // Only pending messages
    lte(deliveryQueue.scheduledFor, windowEnd), // THE KEY LINE: Is it time?
    lt(deliveryQueue.attempts, 3)               // Less than 3 attempts
  ));
}
```

### Step 3.3: Sending Individual Messages
**File: `server/services/queue-scheduler.ts` (lines 81-139)**

```typescript
private async sendScheduledDelivery(delivery: any) {
  // Get user details
  const user = await storage.getUser(delivery.userId);
  
  // Get or generate question
  const question = await this.getQuestionForUser(user);
  
  // Format message
  const message = `🧠 Question #${user.questionsAnswered + 1}: ${question.questionText}
  A) ${question.optionA}
  B) ${question.optionB}
  C) ${question.optionC}
  D) ${question.optionD}
  
  Reply with A, B, C, or D`;
  
  // Send via Twilio
  const smsSuccess = await twilioService.sendSMS({
    to: user.phoneNumber,
    body: message
  });
  
  if (smsSuccess) {
    // Mark as sent (prevents duplicates!)
    await storage.markDeliveryAsSent(delivery.id, question.id);
    
    // Create pending answer record
    await storage.recordAnswer({
      userId: user.id,
      questionId: question.id,
      userAnswer: null,  // Will be filled when user replies
      isCorrect: false,
      pointsEarned: 0
    });
  }
}
```

### Step 3.4: Twilio SMS Service
**File: `server/services/twilio.ts`**

```typescript
async sendSMS(params: { to: string; body: string }): Promise<boolean> {
  try {
    const message = await this.client.messages.create({
      body: params.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to
    });
    
    return message.status !== 'failed';
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
}
```

---

## PART 4: USER REPLIES & SCORING

### Step 4.1: Twilio Webhook Receives Reply
**File: `server/routes.ts` (lines ~300-350)**

```typescript
app.post('/api/webhook/sms', async (req, res) => {
  const { From: phoneNumber, Body: userResponse } = req.body;
  
  // Find user
  const user = await storage.getUserByPhone(phoneNumber);
  
  // Get their last unanswered question
  const pendingAnswer = await storage.getUserAnswers(user.id, 1)
    .find(a => a.userAnswer === null);
  
  // Process answer (A, B, C, or D)
  const isCorrect = userResponse.toUpperCase() === question.correctAnswer;
  
  // Update answer record
  await storage.updateAnswer(pendingAnswer.id, {
    userAnswer: userResponse,
    isCorrect,
    pointsEarned: isCorrect ? 10 : 0
  });
  
  // Update user stats
  await storage.updateUserStats(user.id, {
    totalScore: user.totalScore + (isCorrect ? 10 : 0),
    correctAnswers: user.correctAnswers + (isCorrect ? 1 : 0),
    questionsAnswered: user.questionsAnswered + 1
  });
  
  // Send feedback SMS
  const feedback = isCorrect ? "Correct! +10 points" : `Wrong. The answer was ${question.correctAnswer}`;
  await twilioService.sendSMS({
    to: phoneNumber,
    body: `${feedback}\n${question.explanation}`
  });
});
```

---

## KEY IMPROVEMENTS FROM OLD SYSTEM

### Old System (11-17% success rate):
```javascript
// Calculated timezone EVERY TIME - often failed
const userTime = convertToUserTimezone(now, user.timezone);
if (userTime.getHours() === preferredHour) { 
  send(); 
}
```

### New System (Near 100% success):
```javascript
// Pre-calculated UTC times, simple comparison
if (delivery.scheduledFor <= now) { 
  send(); 
}
```

---

## DATABASE SCHEMA

**File: `shared/schema.ts`**

```typescript
// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phoneNumber: varchar('phone_number', { length: 20 }).unique().notNull(),
  preferredTime: varchar('preferred_time', { length: 5 }).notNull(), // "HH:MM"
  timezone: varchar('timezone', { length: 50 }).notNull(),
  categoryPreferences: text('category_preferences').array(),
  isActive: boolean('is_active').default(true),
  totalScore: integer('total_score').default(0),
  currentStreak: integer('current_streak').default(0),
  // ... more fields
});

// Delivery Queue table (the key to reliability!)
export const deliveryQueue = pgTable('delivery_queue', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  scheduledFor: timestamp('scheduled_for').notNull(), // UTC timestamp
  status: varchar('status', { length: 20 }).default('pending'), // pending/sent/failed
  sentAt: timestamp('sent_at'),
  attempts: integer('attempts').default(0),
  questionId: integer('question_id'),
  errorMessage: text('error_message')
});

// Questions table
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 50 }),
  difficulty: varchar('difficulty', { length: 20 }),
  questionText: text('question_text').notNull(),
  optionA: text('option_a').notNull(),
  optionB: text('option_b').notNull(),
  optionC: text('option_c').notNull(),
  optionD: text('option_d').notNull(),
  correctAnswer: varchar('correct_answer', { length: 1 }).notNull(),
  explanation: text('explanation')
});

// User Answers table
export const userAnswers = pgTable('user_answers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  questionId: integer('question_id').references(() => questions.id),
  userAnswer: varchar('user_answer', { length: 1 }),
  isCorrect: boolean('is_correct'),
  pointsEarned: integer('points_earned').default(0),
  answeredAt: timestamp('answered_at').defaultNow()
});
```

---

## MONITORING & DEBUGGING

### Check Queue Status:
```sql
SELECT status, COUNT(*) 
FROM delivery_queue 
WHERE DATE(scheduled_for) = CURRENT_DATE 
GROUP BY status;
```

### Check User's Next Delivery:
```sql
SELECT u.phone_number, u.preferred_time, u.timezone,
       dq.scheduled_for, dq.status
FROM delivery_queue dq
JOIN users u ON dq.user_id = u.id
WHERE u.phone_number = '+15551234567';
```

### View Recent Deliveries:
```sql
SELECT u.phone_number, dq.sent_at, q.question_text
FROM delivery_queue dq
JOIN users u ON dq.user_id = u.id
JOIN questions q ON dq.question_id = q.id
WHERE dq.status = 'sent'
ORDER BY dq.sent_at DESC
LIMIT 10;
```

---

## ADMIN PANEL FEATURES

**File: `src/pages/AdminDashboard.tsx`**

The admin can:
1. View all users and their stats
2. Send broadcast messages
3. Monitor delivery success rates
4. Add/edit questions
5. View user engagement metrics

---

## SUMMARY FOR NEW ENGINEER

1. **Users sign up** → Stored in `users` table with timezone preferences
2. **Every midnight** → Queue builder pre-calculates UTC delivery times for all users
3. **Every 15 minutes** → Queue processor sends messages where `scheduled_for <= NOW()`
4. **Status tracking** → Prevents duplicates (`pending` → `sent`)
5. **User replies** → Webhook processes answers and updates scores
6. **Admin monitoring** → Dashboard shows all metrics

The key innovation is the **pre-calculated delivery queue** that converts timezone math once at midnight, then uses simple UTC comparisons for reliable delivery.

Welcome to the team! 🚀