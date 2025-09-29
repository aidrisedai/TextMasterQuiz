-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    category_preferences TEXT[] DEFAULT '{}',
    preferred_time TEXT NOT NULL DEFAULT '09:00',
    current_streak INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    last_quiz_date TIMESTAMP,
    last_answer TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'free',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    join_date TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    accepts_broadcasts BOOLEAN NOT NULL DEFAULT true,
    current_category_index INTEGER NOT NULL DEFAULT 0
);

-- Create user_answers table
CREATE TABLE IF NOT EXISTS user_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    points_earned INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_answered_at ON user_answers(answered_at);

-- Show created tables
\dt

-- Show users table structure
\d users

-- Show user_answers table structure  
\d user_answers