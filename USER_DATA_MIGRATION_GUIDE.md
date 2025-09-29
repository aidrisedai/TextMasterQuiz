# 👥 User Data Migration Guide

This guide walks you through migrating your users and user_answers data from your old database to the new Render PostgreSQL database.

## 🎯 What We're Migrating

- **Users Table**: All user accounts with their preferences, streaks, and scores
- **User Answers Table**: Complete history of all user question responses
- **Preserves**: Streaks, total scores, question history, user preferences
- **Benefits**: Users keep all their progress and data

## 📋 Pre-Migration Checklist

### 1. **Gather Database Connection Strings**
You'll need:
- **Old Database URL** (your current database with user data)
- **New Database URL** (your Render PostgreSQL - already working)

### 2. **Identify Your Old Database**
Your user data might be in:
- **Supabase** (if you were using Supabase before)
- **Neon** (if you used Neon PostgreSQL)
- **Another Render database** (if migrating between Render instances)
- **Local PostgreSQL** (if testing locally)

### 3. **Verify Database Access**
Make sure you have admin access to both databases.

## 🔧 Step-by-Step Migration Process

### Step 1: Analyze Both Databases
```bash
# Set your database URLs
export OLD_DATABASE_URL="postgresql://user:pass@old-host/database"
export NEW_DATABASE_URL="postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz"

# Run analysis to understand both databases
node scripts/analyze-databases-pre-migration.js
```

**Expected Output:**
- Table counts for both databases
- Column structures
- Sample data statistics
- Compatibility verification

### Step 2: Run the Migration
```bash
# Run the full user data migration
node scripts/migrate-user-data.js
```

**What happens:**
1. **Users Migration**: Transfers all user accounts and their data
2. **User Answers Migration**: Transfers all question responses with proper ID mapping
3. **Verification**: Compares counts and validates sample data
4. **Backup**: Creates JSON backups of all migrated data

### Step 3: Verify Migration Success
The script automatically verifies:
- User count comparison
- Answer count comparison  
- Sample user data validation
- ID mapping accuracy

## 📊 Migration Features

### 🔄 **Smart ID Mapping**
- Maps user IDs by phone number
- Maps question IDs by question text
- Handles schema differences between databases

### 🛡️ **Safety Features**
- **Duplicate Prevention**: Won't overwrite existing users
- **Automatic Backups**: Creates JSON files before migration
- **Rollback Support**: Backups can be used to restore if needed
- **Error Handling**: Continues migration even if some records fail

### 📈 **Progress Tracking**
- Real-time batch processing updates
- Detailed statistics and counts
- Success/skip/error reporting

## 🎯 Expected Results

### Before Migration (Example):
```
OLD DATABASE:
- users: 150 records
- user_answers: 2,500 records

NEW DATABASE (Render):
- users: 0 records  
- user_answers: 0 records
- questions: 84,820 records ✅
```

### After Migration:
```
OLD DATABASE: (unchanged)
- users: 150 records
- user_answers: 2,500 records

NEW DATABASE (Render):
- users: 150 records ✅ MIGRATED
- user_answers: 2,500 records ✅ MIGRATED  
- questions: 84,820 records ✅
```

## 🚨 Important Notes

### **Data Preservation**
- All user streaks will be preserved
- Total scores and statistics maintained
- Question history completely transferred
- User preferences and settings kept

### **Progressive Scoring Compatibility**
- Existing user answers keep their original points
- **New answers** will use the progressive scoring system
- Users immediately benefit from streak bonuses going forward

### **No Downtime Required**
- Migration can run while your app is live
- Users won't lose access during migration
- New signups during migration are handled safely

## 🔧 Common Migration Scenarios

### **Scenario 1: Supabase → Render**
```bash
export OLD_DATABASE_URL="postgresql://postgres:[password]@[host].supabase.co:5432/postgres"
export NEW_DATABASE_URL="postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz"
```

### **Scenario 2: Neon → Render**
```bash
export OLD_DATABASE_URL="postgresql://user:pass@[host].neon.tech/neondb"
export NEW_DATABASE_URL="postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz"
```

### **Scenario 3: Old Render → New Render**
```bash
export OLD_DATABASE_URL="postgresql://old_user:old_pass@old-host.render.com/old_db"
export NEW_DATABASE_URL="postgresql://textmasterquiz_user:yz6K26INTbEa46BvLFm8OcvewUxUufcD@dpg-d3blf5a4d50c73btdm00-a.oregon-postgres.render.com/textmasterquiz"
```

## 📁 Generated Files

After migration, you'll have:
- `user-backup-YYYY-MM-DD.json` - Complete backup of users table
- Migration logs showing detailed progress and statistics

## ✅ Post-Migration Verification

1. **Check User Counts**: Verify all users transferred
2. **Test User Login**: Ensure users can receive questions
3. **Verify Streaks**: Check that user streaks are preserved
4. **Test Progressive Scoring**: New answers should use enhanced scoring

## 🚨 Troubleshooting

### Connection Issues
- Verify database URLs are correct
- Check SSL requirements (render.com needs SSL)
- Ensure network access to both databases

### Partial Migrations
- Script continues even if some records fail
- Check logs for specific error messages
- Re-run migration - it safely skips existing records

### Data Validation
- Compare user counts before and after
- Check sample users for data accuracy
- Verify question ID mappings are working

## 🎉 Success Indicators

✅ **Users migrated successfully**
✅ **User answers transferred with correct mappings**  
✅ **Streaks and scores preserved**
✅ **No data loss or corruption**
✅ **App works normally with migrated data**
✅ **Progressive scoring active for new answers**

---

**Ready to migrate? Start with Step 1 and run the analysis script to understand your current data setup!**