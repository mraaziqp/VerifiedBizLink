/**
 * Test harness for the POS suite.
 *
 * Starts a throwaway PostgreSQL server (embedded-postgres, real Postgres
 * binaries) in a temp directory, creates the handful of shared tables the POS
 * touches (users, businesses, payments, …) in the shape production uses,
 * applies the REAL POS migrations, and installs it as the app's database
 * driver. Nothing here can reach DATABASE_URL: the driver override is set
 * before any query runs, and DATABASE_URL is cleared.
 */
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import net from 'net';
import http from 'http';
import { WebSocketServer } from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { __setDbDriverForTests, sqlFor, neonPoolTransaction, type DbDriver, type Sql } from '../../src/lib/db';

/** 'pg' (default) or 'neon': run every transaction through Neon's real WebSocket Pool. */
export const TEST_DRIVER = process.env.POS_TEST_DRIVER === 'neon' ? 'neon' : 'pg';

process.env.DATABASE_URL = '';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'pos-test-secret-' + crypto.randomBytes(8).toString('hex');
process.env.PAYFAST_MERCHANT_ID = '10000100';
process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
process.env.PAYFAST_PASSPHRASE = 'pos-test-passphrase';
process.env.PAYFAST_URL = 'https://sandbox.payfast.co.za/eng/process';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.verifiedbizlink.local';
process.env.SMTP_HOST = '';
process.env.CRON_SECRET = 'pos-test-cron';
delete process.env.UPSTASH_REDIS_REST_URL;

let server: EmbeddedPostgres | null = null;
let pool: pg.Pool | null = null;
let dataDir = '';
let wsProxy: http.Server | null = null;
/** WebSocket connections opened through the proxy (neon mode). */
export const proxyStats = { connections: 0 };

/**
 * A minimal stand-in for Neon's WebSocket proxy: each WebSocket carries the
 * raw Postgres wire protocol, which is forwarded to the TCP address named in
 * ?address=host:port. This lets @neondatabase/serverless's Pool talk to the
 * local test server exactly as it talks to Neon.
 */
async function startWsProxy(): Promise<number> {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  wss.on('connection', (socket, req) => {
    proxyStats.connections++;
    const address = new URL(req.url ?? '', 'http://x').searchParams.get('address') ?? '';
    const [host, port] = address.split(':');
    const tcp = net.connect(Number(port), host);
    const pending: Buffer[] = [];
    let open = false;
    tcp.on('connect', () => { open = true; for (const b of pending) tcp.write(b); pending.length = 0; });
    socket.on('message', (data) => { const b = Buffer.from(data as Buffer); if (open) tcp.write(b); else pending.push(b); });
    tcp.on('data', (b) => socket.readyState === socket.OPEN && socket.send(b));
    const close = () => { try { socket.close(); } catch { /* closed */ } tcp.destroy(); };
    tcp.on('error', close);
    tcp.on('close', close);
    socket.on('close', close);
    socket.on('error', close);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  wsProxy = server;
  return (server.address() as net.AddressInfo).port;
}

export let sql: Sql;

const BASE_TABLES = `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'business',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE user_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, revoked_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  package_type TEXT,
  payfast_token TEXT,
  subscription_status TEXT,
  auto_renew BOOLEAN DEFAULT FALSE,
  payment_failed_at TIMESTAMPTZ,
  payment_failed_reason TEXT,
  payment_failed_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  amount BIGINT,
  status TEXT,
  reference TEXT UNIQUE,
  payfast_reference TEXT,
  description TEXT,
  ad_id TEXT,
  purchase_type TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE notifications (id BIGSERIAL PRIMARY KEY, user_id UUID, type TEXT, title TEXT, content TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE billing_events (
  id BIGSERIAL PRIMARY KEY, event TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info', business_id TEXT, user_id TEXT,
  amount_cents INTEGER, reference TEXT, detail TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE payfast_itn_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), payment_reference TEXT, payfast_reference TEXT, payment_status TEXT,
  outcome TEXT NOT NULL, detail TEXT, raw_body TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number TEXT UNIQUE NOT NULL, user_id UUID NOT NULL, business_id UUID,
  tier_key TEXT, tier_name TEXT, description TEXT, amount_cents INT NOT NULL, currency TEXT NOT NULL DEFAULT 'ZAR',
  interval_months INT NOT NULL DEFAULT 1, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, next_billing_at TIMESTAMPTZ,
  renewal_price_cents INT, status TEXT NOT NULL DEFAULT 'paid', payment_reference TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), emailed_at TIMESTAMPTZ
);
`;

export async function startDatabase() {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbl-pos-test-'));
  const port = 54000 + Math.floor(Math.random() * 900);
  server = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {}, onError: () => {} });
  await server.initialise();
  await server.start();
  await server.createDatabase('pos_test');
  pool = new pg.Pool({ connectionString: `postgres://postgres:postgres@localhost:${port}/pos_test`, max: 30 });

  const p = pool;
  const connectionString = `postgres://postgres:postgres@localhost:${port}/pos_test`;
  let neonTransaction: DbDriver['transaction'] | null = null;
  if (TEST_DRIVER === 'neon') {
    const proxyPort = await startWsProxy();
    neonConfig.wsProxy = (host, pgPort) => `127.0.0.1:${proxyPort}/v1?address=${host}:${pgPort}`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
    neonTransaction = (fn) => neonPoolTransaction(connectionString, fn);
  }
  const driver: DbDriver = {
    sql: sqlFor(p as never),
    raw: async (text) => (await p.query(text)).rows,
    transaction: neonTransaction ?? (async (fn) => {
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        const r = await fn(sqlFor(client as never));
        await client.query('COMMIT');
        return r;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }),
  };
  __setDbDriverForTests(driver);
  sql = driver.sql;
  await p.query(BASE_TABLES);

  const { runPendingPosMigrations } = await import('../../src/lib/pos/schema');
  const applied = await runPendingPosMigrations();
  return { port, applied };
}

export async function stopDatabase() {
  __setDbDriverForTests(null);
  await pool?.end().catch(() => {});
  await new Promise((r) => (wsProxy ? wsProxy.close(r) : r(null)));
  await server?.stop().catch(() => {});
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* temp dir */ }
}

// ------------------------------------------------------------------ fixtures

export interface TestUser { id: string; email: string; fullName: string; role: string; token: string }
export interface TestMerchant { owner: TestUser; businessId: string; name: string }

export async function createUser(email: string, role = 'business'): Promise<TestUser> {
  const [u] = await sql`INSERT INTO users (email, full_name, role) VALUES (${email}, ${email.split('@')[0]}, ${role}) RETURNING *`;
  const { createSession } = await import('../../src/lib/auth');
  const token = await createSession({ id: u.id, email, fullName: u.full_name, role, avatarUrl: '', headline: '', emailVerified: true });
  return { id: u.id, email, fullName: u.full_name, role, token };
}

/** A business with an owner and an ACTIVE (paid-up) POS subscription, unless active=false. */
export async function createMerchant(name: string, opts: { plan?: string; active?: boolean; vat?: boolean } = {}): Promise<TestMerchant> {
  const owner = await createUser(`${name.toLowerCase().replace(/\W+/g, '')}-${crypto.randomBytes(3).toString('hex')}@test.local`);
  const [b] = await sql`INSERT INTO businesses (user_id, company_name, status) VALUES (${owner.id}, ${name}, 'verified') RETURNING id`;
  if (opts.active !== false) {
    await sql`
      INSERT INTO pos_merchant_subscriptions (business_id, plan_key, status, setup_fee_paid, payfast_token, recurring_amount_cents, renews_at, activated_at)
      VALUES (${b.id}, ${opts.plan ?? 'starter'}, 'active', true, ${'tok_' + crypto.randomBytes(6).toString('hex')}, 9900, NOW() + INTERVAL '30 days', NOW())
    `;
  }
  if (opts.vat) {
    await sql`INSERT INTO pos_settings (business_id, vat_registered, vat_number) VALUES (${b.id}, true, '4123456789')`;
  }
  return { owner, businessId: b.id, name };
}

export async function addStaff(m: TestMerchant, role: string, pin?: string): Promise<TestUser> {
  const u = await createUser(`${role}-${crypto.randomBytes(3).toString('hex')}@test.local`);
  const bcrypt = (await import('bcryptjs')).default;
  await sql`
    INSERT INTO pos_staff_roles (business_id, user_id, role, pin_hash)
    VALUES (${m.businessId}, ${u.id}, ${role}, ${pin ? await bcrypt.hash(pin, 4) : null})
  `;
  return u;
}

export async function createProduct(m: TestMerchant, name: string, priceCents: number, stock: number, costCents = Math.round(priceCents * 0.6)) {
  const [p] = await sql`
    INSERT INTO pos_products (business_id, name, selling_price_cents, cost_price_cents, stock_quantity)
    VALUES (${m.businessId}, ${name}, ${priceCents}, ${costCents}, ${stock}) RETURNING *
  `;
  return p;
}

// ------------------------------------------------------------------ requests

export interface CallOpts { user?: TestUser | null; body?: unknown; headers?: Record<string, string>; query?: Record<string, string> }

export function makeRequest(method: string, urlPath: string, opts: CallOpts = {}) {
  const url = new URL(`http://localhost${urlPath}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers ?? {}) };
  if (opts.user) headers.authorization = `Bearer ${opts.user.token}`;
  return new NextRequest(url, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- route handlers type their params individually
export type Handler = (req: NextRequest, ctx: any) => Promise<Response>;

/** process.env.NODE_ENV is typed read-only; tests need to flip it. */
export function setEnv(name: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}

export async function call(handler: Handler, method: string, urlPath: string, opts: CallOpts = {}, params: Record<string, string> = {}) {
  const res = await handler(makeRequest(method, urlPath, opts), { params: Promise.resolve(params) });
  const text = await res.text();
  let json: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { json = JSON.parse(text); } catch { json = { _text: text }; }
  return { status: res.status, json, text, headers: res.headers };
}

export const key = (prefix = 'k') => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

// ------------------------------------------------------------------ PayFast ITN

/**
 * Stubs PayFast's server-side ITN validation endpoint (and nothing else).
 * Any other outbound fetch fails, so a test can never reach the internet.
 */
export function installFetchStub() {
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.includes('/eng/query/validate')) return new Response('VALID', { status: 200 });
    if (url.includes('api.payfast.co.za') && url.includes('/cancel')) return new Response('{"code":200}', { status: 200 });
    throw new Error(`Blocked outbound fetch in tests: ${url}`);
  }) as typeof fetch;
  return calls;
}

/** Builds a correctly signed ITN body, as PayFast would POST it. */
export async function signedItn(fields: Record<string, string>) {
  const { signPayfast } = await import('../../src/lib/payfast');
  const data: Record<string, string> = {
    m_payment_id: '', pf_payment_id: String(Math.floor(Math.random() * 1e9)), payment_status: 'COMPLETE',
    item_name: 'test', amount_gross: '0.00', amount_fee: '0.00', amount_net: '0.00',
    custom_str1: '', custom_str2: '', custom_str3: '', custom_str4: '', custom_str5: '',
    custom_int1: '', custom_int2: '', name_first: 'T', name_last: 'Est', email_address: 'payer@test.local',
    merchant_id: process.env.PAYFAST_MERCHANT_ID!, token: '',
    ...fields,
  };
  const entries = Object.entries(data);
  const signature = signPayfast(entries, process.env.PAYFAST_PASSPHRASE, { includeBlanks: true });
  return new URLSearchParams([...entries, ['signature', signature]]).toString();
}
