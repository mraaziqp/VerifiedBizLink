import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, boolean, timestamp, integer, bigint, date, jsonb, index, uniqueIndex, unique, primaryKey } from 'drizzle-orm/pg-core';

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
  imageUrl: text('image_url'),
  readStatus: boolean('read').default(false),
  // Messaging hub columns (added on first use by lib/messaging).
  isEdited: boolean('is_edited').notNull().default(false),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  replyToId: uuid('reply_to_id'),
  kind: text('kind').notNull().default('text'), // 'text' | 'quote' | 'payment_request'
  meta: jsonb('meta'),
  attachmentUrl: text('attachment_url'),
  attachmentName: text('attachment_name'),
  attachmentType: text('attachment_type'),
  attachmentSize: integer('attachment_size'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_direct_messages_pair').on(table.senderId, table.receiverId, table.createdAt),
  index('idx_direct_messages_receiver').on(table.receiverId, table.readStatus),
]);

/**
 * Per-person state of a conversation (a conversation is the pair of users).
 * Pinned / archived / category are each person's own view: Alice archiving
 * her chat with Bob does not archive it for Bob.
 */
export const messageThreadPrefs = pgTable('message_thread_prefs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  otherUserId: uuid('other_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPinned: boolean('is_pinned').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  category: text('category').notNull().default('general'), // 'general' | 'lead' | 'support' | 'verification'
  customLabel: text('custom_label'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.otherUserId] }),
]);

export const cannedResponses = pgTable('canned_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shortcutTrigger: text('shortcut_trigger').notNull(),
  fullText: text('full_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('canned_responses_user_shortcut').on(table.userId, table.shortcutTrigger),
]);

/** Private chat attachments, served only to the two people in the conversation. */
export const messageFiles = pgTable('message_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
// 6. Jobs & Talent
// ==========================================
// These describe the tables as they exist in the database. The tables
// themselves are created and upgraded by ensureTalentSchema() in
// lib/talent-schema.ts (and scripts/migrate-talent.mjs for a manual run), and
// every route reads them with tagged-template SQL — so a change here changes
// nothing in the database on its own. Keep the three in step.
//
// The previous definition in this section described a `job_posts` table that
// was never created; the real table has always been `job_postings`.

/** JobListing. status: 'draft' | 'open' (published) | 'paused' | 'closed'. */
export const jobPostings = pgTable('job_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  // Readable words plus a short random code; the public address /jobs/<slug>.
  // Issued once and never changed, so a shared link survives a retitle.
  slug: text('slug'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  benefits: text('benefits'),
  requiredSkills: text('required_skills').array().notNull().default([]),
  employmentType: text('employment_type').notNull().default('full_time'), // full_time | part_time | contract | temporary | internship | learnership
  locationType: text('location_type').notNull().default('on_site'), // on_site | hybrid | remote
  location: text('location'),
  // Cents, like every other money column. BIGINT so an annual figure cannot overflow.
  salaryMinCents: bigint('salary_min_cents', { mode: 'number' }),
  salaryMaxCents: bigint('salary_max_cents', { mode: 'number' }),
  salaryPeriod: text('salary_period').default('month'), // hour | day | month | year
  currency: text('currency').notNull().default('ZAR'),
  // The inverse of "hideSalary": false withholds the figures everywhere.
  salaryVisible: boolean('salary_visible').notNull().default(true),
  applicationDeadline: date('application_deadline'),
  status: text('status').notNull().default('open'),
  viewsCount: integer('views_count').notNull().default(0),
  // The number of applications is counted from job_applications when read,
  // not stored here: a counter column is one missed update away from being wrong.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('job_postings_slug_idx').on(table.slug),
  index('job_postings_business_idx').on(table.businessId),
  index('job_postings_open_idx').on(table.status, table.createdAt.desc()),
  index('job_postings_skills_idx').using('gin', table.requiredSkills),
]);

/** JobApplication. status: applied | reviewing | shortlisted | interview | hired | rejected | withdrawn. */
export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  applicantUserId: uuid('applicant_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  coverNote: text('cover_note'),
  // What the employer actually read, frozen at the moment of applying.
  snapshotHeadline: text('snapshot_headline'),
  snapshotSkills: text('snapshot_skills').array().notNull().default([]),
  snapshotCvUrl: text('snapshot_cv_url'), // the résumé sent with this application
  status: text('status').notNull().default('applied'),
  statusNote: text('status_note'), // what the candidate was told about the latest change
  employerNotes: text('employer_notes'), // the employer's private notes; never returned to the candidate
  statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
  statusChangedBy: uuid('status_changed_by').references(() => users.id, { onDelete: 'set null' }),
  matchScore: integer('match_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // appliedAt
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One application per person per job.
  uniqueIndex('job_applications_once_idx').on(table.jobId, table.applicantUserId),
  index('job_applications_job_status_idx').on(table.jobId, table.status),
  index('job_applications_applicant_idx').on(table.applicantUserId, table.createdAt.desc()),
]);

/**
 * An application's history, and its link to the conversation it lives in.
 * Direct messages are a pair of people (see `messages`), so the thread between
 * an employer and a candidate needs no table of its own; `messageId` records
 * which message told the candidate about a given stage change.
 */
export const jobApplicationEvents = pgTable('job_application_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: text('kind').notNull(), // applied | status | withdrawn
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  detail: text('detail'),
  messageId: uuid('message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('job_application_events_app_idx').on(table.applicationId, table.createdAt),
]);

export const savedJobs = pgTable('saved_jobs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.jobId] }),
  index('saved_jobs_job_idx').on(table.jobId),
]);

/** CandidateProfile. One per user. */
export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  headline: text('headline'),
  summary: text('summary'), // bio
  location: text('location'),
  yearsExperience: integer('years_experience'),
  skills: text('skills').array().notNull().default([]),
  workHistory: jsonb('work_history').notNull().default([]),
  education: jsonb('education').notNull().default([]),
  portfolioLinks: jsonb('portfolio_links').notNull().default([]), // [{ label, url }]
  cvUrl: text('cv_url'), // résumé; a permission-checked /api/talent/cv/<id> address
  cvText: text('cv_text'),
  videoIntroUrl: text('video_intro_url'),
  // Visibility: true lists the profile for verified businesses; false keeps
  // it unlisted, seen only by employers the person applies to.
  isPublished: boolean('is_published').notNull().default(false),
  openToWork: boolean('open_to_work').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('talent_profiles_skills_idx').using('gin', table.skills),
  index('talent_profiles_published_idx').on(table.isPublished, table.openToWork),
]);

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  business: one(businesses, { fields: [jobPostings.businessId], references: [businesses.id] }),
  applications: many(jobApplications),
  savedBy: many(savedJobs),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  job: one(jobPostings, { fields: [jobApplications.jobId], references: [jobPostings.id] }),
  candidate: one(users, { fields: [jobApplications.applicantUserId], references: [users.id] }),
  events: many(jobApplicationEvents),
}));

export const jobApplicationEventsRelations = relations(jobApplicationEvents, ({ one }) => ({
  application: one(jobApplications, { fields: [jobApplicationEvents.applicationId], references: [jobApplications.id] }),
  // The chat message that carried this update to the candidate, if one was sent.
  message: one(directMessages, { fields: [jobApplicationEvents.messageId], references: [directMessages.id] }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
  job: one(jobPostings, { fields: [savedJobs.jobId], references: [jobPostings.id] }),
}));

export const talentProfilesRelations = relations(talentProfiles, ({ one }) => ({
  user: one(users, { fields: [talentProfiles.userId], references: [users.id] }),
}));

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
