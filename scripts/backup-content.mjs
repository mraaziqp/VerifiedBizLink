/**
 * Point-in-time backup of user-generated content to a local JSON file.
 *
 * Posts, galleries, documents and their media URLs, straight from the live
 * database. Run it before anything risky and keep the file: restoring from a
 * JSON dump is tedious, but it is recoverable, whereas a dropped table is not.
 *
 *   node scripts/backup-content.mjs            -> backups/content-<timestamp>.json
 *   node scripts/backup-content.mjs --out=x.json
 */
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--'))
    .map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env.local', '.env.production', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const db = neon(databaseUrl());

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = args.out || path.join('backups', `content-${stamp}.json`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

async function grab(label, fn) {
  try {
    const rows = await fn();
    console.log(`  ${String(rows.length).padStart(5)}  ${label}`);
    return rows;
  } catch (e) {
    console.log(`  ERROR  ${label}: ${e.message}`);
    return [];
  }
}

console.log('Backing up user content from the live database:');

const backup = {
  takenAt: new Date().toISOString(),
  posts: await grab('posts', () => db`SELECT * FROM posts ORDER BY created_at`),
  postLikes: await grab('post_likes', () => db`SELECT * FROM post_likes`),
  postComments: await grab('post_comments', () => db`SELECT * FROM post_comments ORDER BY created_at`),
  businessGallery: await grab('business_gallery', () => db`SELECT * FROM business_gallery ORDER BY created_at`),
  // Vetting documents are base64 in the DB, so this file is the only copy
  // outside Postgres. Metadata only by default — see --with-documents.
  documents: await grab('documents (metadata only)', () => db`
    SELECT id, business_id, name, doc_type, status, grade, review_notes, uploaded_at,
           LENGTH(COALESCE(file_url, '')) AS file_bytes
    FROM documents ORDER BY uploaded_at`),
  businesses: await grab('businesses', () => db`
    SELECT id, user_id, company_name, status, package_type, logo_url, verified_at, badge_source
    FROM businesses ORDER BY created_at`),
  users: await grab('users (no secrets)', () => db`
    SELECT id, email, full_name, role, avatar_url, headline, created_at
    FROM users ORDER BY created_at`),
};

if (args['with-documents']) {
  backup.documentFiles = await grab('document file contents', () => db`SELECT id, file_url FROM documents`);
}

fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');
const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
console.log(`\nwritten: ${outPath} (${mb} MB)`);
console.log('Keep this file somewhere off this machine — it is the only copy of');
console.log('the post media URLs if the database is ever lost.');
