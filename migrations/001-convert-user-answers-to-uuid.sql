-- Migration: Convert user_answers table from SERIAL id to UUID
-- This script safely migrates existing data while preserving all relationships

BEGIN;

-- Step 1: Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Add new UUID column
ALTER TABLE user_answers ADD COLUMN new_id UUID DEFAULT gen_random_uuid();

-- Step 3: Populate the new UUID column for existing records
UPDATE user_answers SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- Step 4: Make the new column NOT NULL
ALTER TABLE user_answers ALTER COLUMN new_id SET NOT NULL;

-- Step 5: Drop the old primary key constraint
ALTER TABLE user_answers DROP CONSTRAINT user_answers_pkey;

-- Step 6: Drop the old id column
ALTER TABLE user_answers DROP COLUMN id;

-- Step 7: Rename new_id to id
ALTER TABLE user_answers RENAME COLUMN new_id TO id;

-- Step 8: Add the new primary key constraint
ALTER TABLE user_answers ADD CONSTRAINT user_answers_pkey PRIMARY KEY (id);

-- Step 9: Update the default for future inserts
ALTER TABLE user_answers ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;