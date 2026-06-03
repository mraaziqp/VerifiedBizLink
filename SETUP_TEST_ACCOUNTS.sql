-- TEST ACCOUNTS SETUP FOR DEMO
-- Run this SQL in your database to create 3 demo accounts

-- TEST ACCOUNT 1: Regular User with Verified Business
INSERT INTO users (id, email, password_hash, full_name, headline, location, avatar_url, role, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'test1@verifiedbizlink.com',
  '$2b$10$aoaEiONT8rBtFticuoIDQuI47vPgoOSGmwK2euRgIQv3IvDQqjnJa', -- password123
  'James Mitchell',
  'CEO at TechCorp',
  'Cape Town, South Africa',
  'https://picsum.photos/seed/test1/200/200',
  'user',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO businesses (id, user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, phone, address, verified_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440010'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'TechCorp South Africa',
  'Technology',
  '2021/123456',
  '4501234567',
  'verified',
  95,
  'Leading technology solutions provider. Specializing in cloud infrastructure and digital transformation.',
  'https://techcorp.example.com',
  '+27 21 555 0100',
  '123 Tech Street, Cape Town, 8000',
  NOW()
) ON CONFLICT DO NOTHING;

---

-- TEST ACCOUNT 2: Another Verified Business User
INSERT INTO users (id, email, password_hash, full_name, headline, location, avatar_url, role, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'test2@verifiedbizlink.com',
  '$2b$10$aoaEiONT8rBtFticuoIDQuI47vPgoOSGmwK2euRgIQv3IvDQqjnJa', -- password123
  'Sarah van der Merwe',
  'Director at BuildRight',
  'Johannesburg, South Africa',
  'https://picsum.photos/seed/test2/200/200',
  'user',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO businesses (id, user_id, company_name, industry, reg_number, vat_number, status, trust_score, description, website, phone, address, verified_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440020'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'BuildRight Construction',
  'Construction',
  '2020/654321',
  '4509876543',
  'verified',
  92,
  'Premier construction and civil engineering firm. Over 15 years of experience in major projects.',
  'https://buildright.example.com',
  '+27 11 555 0200',
  '456 Build Avenue, Johannesburg, 2000',
  NOW()
) ON CONFLICT DO NOTHING;

---

-- TEST ACCOUNT 3: Admin/Banker Account
INSERT INTO users (id, email, password_hash, full_name, headline, location, avatar_url, role, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'admin@verifiedbizlink.com',
  '$2b$10$aoaEiONT8rBtFticuoIDQuI47vPgoOSGmwK2euRgIQv3IvDQqjnJa', -- password123
  'Ramone Daniels',
  'Compliance Officer',
  'Cape Town, South Africa',
  'https://picsum.photos/seed/admin/200/200',
  'banker',
  true
) ON CONFLICT DO NOTHING;

---

-- CREATE SAMPLE POSTS
INSERT INTO posts (id, user_id, content, likes_count, comments_count, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Excited to announce our new cloud solutions platform! We''ve just helped 50+ businesses migrate to secure, scalable infrastructure. The future of South African tech is here. 🚀',
  12,
  3,
  NOW() - INTERVAL '2 hours'
) ON CONFLICT DO NOTHING;

INSERT INTO posts (id, user_id, content, likes_count, comments_count, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'Just completed the Joburg Gateway tower project ahead of schedule. Proud of our team''s commitment to quality and safety. Looking forward to connecting with more verified businesses!',
  18,
  5,
  NOW() - INTERVAL '4 hours'
) ON CONFLICT DO NOTHING;

INSERT INTO posts (id, user_id, content, likes_count, comments_count, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440102'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Thrilled to be part of VerifiedBizLink. Connecting with trusted partners has never been easier!',
  8,
  2,
  NOW() - INTERVAL '6 hours'
) ON CONFLICT DO NOTHING;

---

-- NOTES:
-- Default password for all test accounts: password123
-- All accounts have email_verified = true (no email verification needed for demo)
-- Accounts 1 and 2 are verified businesses (status = 'verified', trust_score 90+)
-- Account 3 is an admin/banker who can review documents
-- Sample posts are pre-created so feed isn't empty
