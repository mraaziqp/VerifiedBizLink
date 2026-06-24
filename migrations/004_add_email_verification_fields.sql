-- Add email verification fields to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create index on email_verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Create index on email_verified for filtering unverified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email_verified = FALSE;
