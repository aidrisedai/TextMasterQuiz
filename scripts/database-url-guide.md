# Getting the Correct Database URL from Render

## Problem
Your current DATABASE_URL is incomplete and causing connection failures.

## Solution: Get the Internal Database URL

### Step 1: Go to Your PostgreSQL Database in Render
1. Open Render Dashboard: https://dashboard.render.com
2. Click on your PostgreSQL database (not your web service)
3. Look for the **Connect** section or **Info** tab

### Step 2: Copy the INTERNAL Database URL
You'll see two types of URLs:
- **External Database URL** (for connections from outside Render)
- **Internal Database URL** (for connections from Render services) ← **USE THIS ONE**

The internal URL should look like:
```
postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@dpg-d3bib937mgec739o2p40-a.oregon-postgres.render.com:5432/text4quiz
```

Key differences from your current URL:
- ✅ Full hostname: `dpg-d3bib937mgec739o2p40-a.oregon-postgres.render.com`
- ✅ Port number: `:5432`
- ✅ Complete path structure

### Step 3: Update Environment Variable
Replace your current DATABASE_URL in Render with the complete internal URL.

### Step 4: Verify the Format
The correct format should be:
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

Where:
- username: text4quiz_user
- password: EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u  
- host: dpg-d3bib937mgec739o2p40-a.oregon-postgres.render.com
- port: 5432
- database: text4quiz

## Alternative: Use Connection Pooling URL
If available, you can also use the connection pooling URL for better performance:
```
postgresql://text4quiz_user:EGywydGfuDz3iQyNEej4Ho4k1cuK3y4u@dpg-d3bib937mgec739o2p40-a-pooler.oregon-postgres.render.com:5432/text4quiz
```