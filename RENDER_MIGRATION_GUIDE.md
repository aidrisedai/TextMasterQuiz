# 🚀 Text4Quiz Migration to Render - Complete Guide

This guide walks you through migrating your Text4Quiz application from Replit to Render.

## 📋 Prerequisites

- ✅ Render account created
- ✅ PostgreSQL client tools installed (pg_dump, psql)
- ✅ Current database credentials (DATABASE_URL)
- ✅ Twilio credentials
- ✅ Google Gemini API key

## 🗂 Phase 3: Step-by-Step Migration

### Step 1: Export Current Database

1. **Set your current database URL** (from Replit/Neon):
   ```bash
   export DATABASE_URL="postgresql://username:password@host:port/database"
   ```

2. **Run the export script**:
   ```bash
   ./scripts/export-database.sh
   ```

3. **Verify export files created**:
   ```bash
   ls -la database_exports/
   ```

### Step 2: Setup Render Services

#### 2.1 Create PostgreSQL Database

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"PostgreSQL"**
3. **Configure database**:
   - **Name**: `text4quiz-db`
   - **Database Name**: `text4quiz`
   - **User**: `text4quiz_user` 
   - **Region**: Choose closest to your users
   - **Plan**: Choose appropriate plan (Free tier available)

4. **Wait for database creation** (usually 2-3 minutes)
5. **Copy the connection string** - you'll need this

#### 2.2 Create Web Service

1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: 
   - Choose "Connect account" → GitHub
   - Select `aidrisedai/TextMasterQuiz`
3. **Configure service**:
   - **Name**: `text4quiz`
   - **Runtime**: `Node`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Choose appropriate plan

### Step 3: Configure Environment Variables

In your Render Web Service dashboard, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Fixed value |
| `DATABASE_URL` | `postgresql://...` | From your PostgreSQL service |
| `TWILIO_ACCOUNT_SID` | `AC...` | From your Twilio account |
| `TWILIO_AUTH_TOKEN` | `...` | From your Twilio account |
| `TWILIO_PHONE_NUMBER` | `+1...` | Your Twilio phone number |
| `GEMINI_API_KEY` | `...` | Your Google Gemini API key |
| `SESSION_SECRET` | Generate random string | Use: `openssl rand -base64 32` |

### Step 4: Initial Deploy & Verify

1. **Trigger deployment** in Render dashboard
2. **Monitor build logs** for any errors
3. **Wait for "Live" status** (usually 3-5 minutes)
4. **Test health endpoint**: `https://your-app.onrender.com/api/health`

### Step 5: Import Database Data

1. **Set the new database URL**:
   ```bash
   export NEW_DATABASE_URL="postgresql://user:pass@host:port/db"
   ```

2. **Run the import script**:
   ```bash
   ./scripts/import-database.sh database_exports/text4quiz_export_YYYYMMDD_HHMMSS.sql
   ```

3. **Verify data import**:
   - Check the script output for user/question counts
   - Access admin dashboard to verify data

### Step 6: Test SMS Functionality

1. **Access your app**: `https://your-app.onrender.com`
2. **Test user signup** with a real phone number
3. **Verify SMS welcome message** is received
4. **Test admin features**:
   - Login to admin dashboard
   - Send test SMS
   - Check delivery status

### Step 7: Final Validation

#### Health Checks
- ✅ Health endpoint responds: `/api/health`
- ✅ Database shows "connected"
- ✅ Admin login works
- ✅ User stats display correctly

#### SMS System Tests
- ✅ New user signup sends welcome SMS
- ✅ Daily questions are scheduled correctly  
- ✅ SMS commands (HELP, SCORE) work
- ✅ Answer processing functions

#### Performance Checks
- ✅ App loads within 3 seconds
- ✅ API responses < 500ms
- ✅ Database queries execute quickly

## 🛠 Troubleshooting

### Common Issues

#### Build Errors
- **Node version mismatch**: Render uses Node 18+ by default
- **TypeScript errors**: Run `npm run check` locally first
- **Missing dependencies**: Ensure all deps in package.json

#### Database Issues
- **Connection failed**: Verify DATABASE_URL format
- **Import errors**: Check PostgreSQL version compatibility
- **Schema mismatch**: Run `npm run db:push` to sync schema

#### SMS Issues
- **Credentials invalid**: Verify Twilio account SID and token
- **Phone number issues**: Ensure proper +1XXXXXXXXXX format
- **Rate limiting**: Check Twilio account balance and limits

### Environment Variables Debug

Use this script to verify your environment:
```bash
# Test environment variables (run on Render)
curl https://your-app.onrender.com/api/health
```

### Database Connection Test

```bash
# Test database connectivity
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## 🎯 Post-Migration Checklist

### Immediate Tasks
- [ ] Update DNS/domain if needed
- [ ] Update webhook URLs in Twilio console
- [ ] Test with real users
- [ ] Monitor error logs

### Long-term Tasks  
- [ ] Set up monitoring/alerting
- [ ] Configure automatic backups
- [ ] Review and optimize performance
- [ ] Plan scaling if needed

## 📞 Support

If you encounter issues:

1. **Check Render logs**: Dashboard → Service → Logs
2. **Verify environment variables**: All required vars set?
3. **Test components individually**: Use test scripts
4. **Check health endpoint**: Diagnose specific issues

## 🎉 Success!

Once completed, your Text4Quiz app will be:
- ✅ **Hosted on Render** with professional infrastructure
- ✅ **Auto-deploying** from GitHub on every push
- ✅ **Backed by PostgreSQL** with full data migration
- ✅ **SMS functional** with Twilio integration
- ✅ **Monitoring ready** with health checks

---

**Need help?** Check the troubleshooting section or reach out with specific error messages.