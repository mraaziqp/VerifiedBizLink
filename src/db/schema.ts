import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, doublePrecision, index, unique } from 'drizzle-orm/pg-core';

// ==========================================
// 1. Users Table
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('customer'),
  userType: varchar('user_type', { length: 50 }).default('customer'), // 'business' | 'customer' | 'job_seeker' | 'admin'
  requiresVerification: boolean('requires_verification').default(false),
  emailVerified: boolean('email_verified').default(false),
  isSuspended: boolean('is_suspended').default(false),
  suspendedReason: text('suspended_reason'),
  avatarUrl: text('avatar_url'),
  headline: text('headline'),
  location: varchar('location', { length: 255 }).default(''),
  connectionsCount: integer('connections_count').default(0),
  vettingScore: integer('vetting_score').default(0),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_user_type').on(table.userType),
  index('idx_users_role').on(table.role),
]);

// ==========================================
// 2. Businesses Table
// ==========================================
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 255 }).default(''),
  regNumber: varchar('reg_number', { length: 255 }).default(''),
  vatNumber: varchar('vat_number', { length: 255 }).default(''),
  status: varchar('status', { length: 50 }).default('unregistered'), // 'verified' | 'reviewing' | 'pending' | 'rejected' | 'unregistered'
  trustScore: integer('trust_score').default(0),
  description: text('description').default(''),
  website: varchar('website', { length: 255 }).default(''),
  phone: varchar('phone', { length: 50 }).default(''),
  address: text('address').default(''),
  location: varchar('location', { length: 255 }).default(''),
  coverImageUrl: text('cover_image_url'),
  tagline: text('tagline'),
  socialLinks: jsonb('social_links').default({}),
  highlights: jsonb('highlights').default([]),
  certificateSerial: varchar('certificate_serial', { length: 100 }),
  certificateCheckCode: varchar('certificate_check_code', { length: 100 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationPaid: boolean('verification_paid').default(false),
  verificationPaidAt: timestamp('verification_paid_at', { withTimezone: true }),
  connectionsCount: integer('connections_count').default(0),
  packageType: varchar('package_type', { length: 50 }).default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_businesses_user_id').on(table.userId),
  index('idx_businesses_status').on(table.status),
  index('idx_businesses_serial').on(table.certificateSerial),
]);

// ==========================================
// 3. Connections Table (Enterprise Messaging & Networking)
// ==========================================
export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userA: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userB: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending' | 'accepted' | 'declined' | 'blocked'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('uq_connections_pair').on(table.userA, table.userB),
  index('idx_connections_user_a').on(table.userA),
  index('idx_connections_user_b').on(table.userB),
  index('idx_connections_status').on(table.status),
]);

// ==========================================
// 4. Direct Messages Table
// ==========================================
export const directMessages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  readStatus: boolean('read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_direct_messages_pair').on(table.senderId, table.receiverId, table.createdAt),
  index('idx_direct_messages_receiver').on(table.receiverId, table.readStatus),
]);

// ==========================================
// 5. User Subscriptions Table (for Audit & CRON Billing)
// ==========================================
export const subscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tierId: uuid('tier_id'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'unpaid' | 'unprocessed' | 'cancelled' | 'paused'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  nextBillingDate: timestamp('renews_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  paypalSubscriptionId: varchar('paypal_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_subscriptions_user_id').on(table.userId),
  index('idx_subscriptions_status').on(table.status),
  index('idx_subscriptions_next_billing').on(table.nextBillingDate),
]);

// ==========================================
// 6. Job Posts & Talent Profiles
// ==========================================
export const jobPosts = pgTable('job_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requiredSkills: jsonb('required_skills').default([]),
  employmentType: varchar('employment_type', { length: 50 }).default('full_time'),
  locationType: varchar('location_type', { length: 50 }).default('onsite'),
  location: varchar('location', { length: 255 }),
  salaryMinCents: integer('salary_min_cents'),
  salaryMaxCents: integer('salary_max_cents'),
  salaryPeriod: varchar('salary_period', { length: 50 }).default('monthly'),
  applicationDeadline: timestamp('application_deadline', { withTimezone: true }),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const businessReviews = pgTable('business_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  reviewText: text('review_text'),
  response: text('response'),
  responseAt: timestamp('response_at', { withTimezone: true }),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_reviews_business_id').on(table.businessId),
  index('idx_reviews_reviewer_id').on(table.reviewerId),
]);
