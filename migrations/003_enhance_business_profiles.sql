-- Migration: Enhanced Business Profile Schema
-- Purpose: Add location, service areas, and products/services for better searchability

-- Add columns to businesses table
ALTER TABLE IF EXISTS businesses ADD COLUMN IF NOT EXISTS (
  primary_location VARCHAR(255),
  location_coordinates POINT,
  service_areas TEXT[] DEFAULT '{}',
  products_services TEXT[] DEFAULT '{}',
  service_radius_km INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_service_areas ON businesses USING GIN(service_areas);
CREATE INDEX IF NOT EXISTS idx_products_services ON businesses USING GIN(products_services);
CREATE INDEX IF NOT EXISTS idx_primary_location ON businesses(primary_location);
CREATE INDEX IF NOT EXISTS idx_location_coordinates ON businesses USING GIST(location_coordinates);

-- Create vetting_submissions table for CIPC/SARS verification
CREATE TABLE IF NOT EXISTS vetting_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- CIPC Verification
  cipc_registration_number VARCHAR(50),
  cipc_submission_date TIMESTAMP,
  cipc_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  cipc_document_url TEXT,
  cipc_notes TEXT,

  -- SARS Verification
  sars_tax_reference VARCHAR(50),
  sars_submission_date TIMESTAMP,
  sars_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  sars_document_url TEXT,
  sars_notes TEXT,

  -- Overall status
  overall_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected

  -- Admin review
  reviewed_by_admin_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for vetting
CREATE INDEX idx_vetting_business_id ON vetting_submissions(business_id);
CREATE INDEX idx_vetting_overall_status ON vetting_submissions(overall_status);
CREATE INDEX idx_vetting_cipc_status ON vetting_submissions(cipc_status);
CREATE INDEX idx_vetting_sars_status ON vetting_submissions(sars_status);

-- Create admin_users table for admin credential management
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email VARCHAR(255) UNIQUE NOT NULL,
  admin_username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- super_admin, admin, moderator
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
  last_login TIMESTAMP,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for admin lookups
CREATE INDEX idx_admin_username ON admin_users(admin_username);
CREATE INDEX idx_admin_email ON admin_users(admin_email);

-- Update subscription_tiers to support JSON features
ALTER TABLE IF EXISTS subscription_tiers ADD COLUMN IF NOT EXISTS tier_metadata JSONB DEFAULT '{}';

-- Log table for audit trail
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action_type VARCHAR(100),
  target_business_id UUID REFERENCES businesses(id),
  action_details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX idx_admin_action_logs_created_at ON admin_action_logs(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to vetting_submissions
DROP TRIGGER IF EXISTS update_vetting_updated_at ON vetting_submissions;
CREATE TRIGGER update_vetting_updated_at
  BEFORE UPDATE ON vetting_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
