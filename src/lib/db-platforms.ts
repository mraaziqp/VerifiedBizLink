/**
 * Databases a customer's app can use — chosen when they order, connected
 * from their dashboard once the app is ready.
 *
 * We do not run customers' databases. The app is built around the platform
 * they pick (Agent Builder's DbKit gives it a data layer for that platform);
 * the customer creates the database on the platform themselves and pastes its
 * public keys into the Database panel on their dashboard. Agent Builder puts
 * them in the app and rebuilds it, and the live app saves there for everyone.
 *
 * A copy of the ARP hub's src/lib/db-platforms.ts (which mirrors Agent Builder's
 * DbKit): the hub checks the keys again, so the two only need to agree on ids
 * and key names. Safe to import in the browser: no server code here.
 *
 * Only keys that are safe in a web page are taken. A secret (Supabase's
 * service_role, anything marked secret or private) would be readable by every
 * visitor of the app, so it is refused; databases that need a secret
 * (MySQL, SQL Server, MongoDB) go through "My own API".
 */

export type DbPlatformId = 'local' | 'supabase' | 'firebase' | 'pocketbase' | 'appwrite' | 'rest';

export interface DbPlatformField {
  key: string;
  label: string;
  placeholder: string;
  optional?: boolean;
}

export interface DbPlatform {
  id: DbPlatformId;
  name: string;
  pitch: string;
  /** Where to get the keys, in a sentence. */
  howTo: string;
  signUpUrl: string | null;
  fields: DbPlatformField[];
}

export const DB_PLATFORMS: DbPlatform[] = [
  {
    id: 'local',
    name: 'Not sure yet',
    pitch: 'Built so a database can be plugged in later; until then data stays in each visitor’s browser.',
    howTo: 'Choose a platform here whenever you are ready.',
    signUpUrl: null,
    fields: [],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    pitch: 'Postgres with sign-in, free to start. The best all-round choice.',
    howTo: 'Create a project at supabase.com, then Project Settings → API: copy the Project URL and the anon public key.',
    signUpUrl: 'https://supabase.com/dashboard',
    fields: [
      { key: 'url', label: 'Project URL', placeholder: 'https://abcd1234.supabase.co' },
      { key: 'anonKey', label: 'anon public key', placeholder: 'eyJhbGciOi… (not the service_role key)' },
    ],
  },
  {
    id: 'firebase',
    name: 'Firebase (Firestore)',
    pitch: 'Google’s document database with sign-in.',
    howTo: 'Create a project at console.firebase.google.com, add a Web app and Firestore, then copy the Web API key and Project ID from Project settings.',
    signUpUrl: 'https://console.firebase.google.com',
    fields: [
      { key: 'apiKey', label: 'Web API key', placeholder: 'AIza…' },
      { key: 'projectId', label: 'Project ID', placeholder: 'my-app-12345' },
    ],
  },
  {
    id: 'pocketbase',
    name: 'PocketBase',
    pitch: 'One small server you run yourself. Free forever.',
    howTo: 'Run PocketBase on a server you control (or pockethost.io), then copy its public URL.',
    signUpUrl: 'https://pockethost.io',
    fields: [{ key: 'url', label: 'PocketBase URL', placeholder: 'https://my-app.pockethost.io' }],
  },
  {
    id: 'appwrite',
    name: 'Appwrite',
    pitch: 'Open-source backend, cloud or self-hosted.',
    howTo: 'Create a project, a database and a collection at cloud.appwrite.io, then copy the endpoint and the three IDs.',
    signUpUrl: 'https://cloud.appwrite.io',
    fields: [
      { key: 'endpoint', label: 'API endpoint', placeholder: 'https://cloud.appwrite.io/v1' },
      { key: 'projectId', label: 'Project ID', placeholder: '6650…' },
      { key: 'databaseId', label: 'Database ID', placeholder: '6650…' },
      { key: 'collectionId', label: 'Collection ID', placeholder: '6650…' },
    ],
  },
  {
    id: 'rest',
    name: 'My own API',
    pitch: 'Your own server: the safe way to use MySQL, SQL Server or MongoDB.',
    howTo: 'Give the base URL of your API (it keeps the database secrets on your server). A public key is optional.',
    signUpUrl: null,
    fields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.mybusiness.co.za' },
      { key: 'publicKey', label: 'Public API key', placeholder: 'optional', optional: true },
    ],
  },
];

export function dbPlatform(id: unknown): DbPlatform | null {
  return DB_PLATFORMS.find((platform) => platform.id === id) ?? null;
}

/** A key that must never be in a web page, with why; null when it is fine. */
export function secretKeyProblem(platform: DbPlatformId, key: string, value: string): string | null {
  if (platform === 'supabase' && key === 'anonKey') {
    try {
      const part = value.split('.')[1] ?? '';
      const payload = JSON.parse(typeof atob === 'function' ? atob(part.replace(/-/g, '+').replace(/_/g, '/')) : Buffer.from(part, 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') return 'That is the service_role key: it bypasses every rule. Use the anon public key.';
    } catch {
      // not a JWT; Supabase's sb_publishable_ keys are fine
    }
    if (/^sb_secret_/.test(value)) return 'That is a secret key. Use the publishable (anon) key.';
  }
  if (/secret|private|service[_-]?role|sk_live_/i.test(value) && value.length > 20) return 'That looks like a secret key. Only public keys belong in a web app; keep secrets on your own server.';
  return null;
}

/** The platform and keys a customer sent, checked: every required box filled, nothing secret, nothing odd. */
export function cleanDbKeys(
  platformId: unknown,
  raw: unknown,
): { ok: true; platform: DbPlatformId; values: Record<string, string> } | { ok: false; error: string } {
  const platform = dbPlatform(platformId);
  if (!platform) return { ok: false, error: 'Choose a database.' };
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const field of platform.fields) {
    const value = typeof input[field.key] === 'string' ? (input[field.key] as string).trim() : '';
    if (!value) {
      if (!field.optional) return { ok: false, error: `Fill in ${field.label}.` };
      continue;
    }
    if (value.length > 4000 || /[\r\n]/.test(value)) return { ok: false, error: `${field.label} does not look like a key.` };
    if (/url|endpoint/i.test(field.key) && !/^https:\/\/[^\s]+$/i.test(value)) return { ok: false, error: `${field.label} must start with https://` };
    const problem = secretKeyProblem(platform.id, field.key, value);
    if (problem) return { ok: false, error: problem };
    values[field.key] = value;
  }
  return { ok: true, platform: platform.id, values };
}
