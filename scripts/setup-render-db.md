# Setting up PostgreSQL Database on Render

## Step 1: Create PostgreSQL Database on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **PostgreSQL**
3. **Configure Database:**
   - Name: `textmasterquiz-db` (or your preference)
   - Database: `textmasterquiz`
   - User: `textmasterquiz_user` (or your preference)
   - Region: Same as your web service (for best performance)
   - Plan: Start with "Free" for testing

4. **Click "Create Database"**

## Step 2: Get Connection Details

After creation, Render provides:
- **External Database URL** (for connections from outside Render)
- **Internal Database URL** (for connections from Render services)

**Use the INTERNAL Database URL** for your web service since both will be on Render.

## Step 3: Configure Environment Variables

In your web service settings:

1. Go to **Environment** tab
2. Add these environment variables:

```
DATABASE_URL=<your_internal_database_url>
TWILIO_ACCOUNT_SID=<your_twilio_sid>
TWILIO_AUTH_TOKEN=<your_twilio_token>
TWILIO_PHONE_NUMBER=<your_twilio_phone>
GEMINI_API_KEY=<your_gemini_key>
SESSION_SECRET=<generate_random_string>
NODE_ENV=production
```

## Step 4: Initialize Database Schema

After the database is connected, you'll need to push the schema:

The app will try to run migrations automatically, but you may need to run:
```bash
npm run db:push
```

## Step 5: Import Your Data

Once the schema is created, import your existing data using the JSON export we created earlier.