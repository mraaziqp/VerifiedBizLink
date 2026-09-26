import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Android test builds, published by .github/workflows/android-build.yml to
 * the private Supabase Storage bucket "app-builds". Nothing here is public:
 * the admin API hands out short-lived signed links, one download at a time.
 */

const BUCKET = 'app-builds';
const FOLDER = 'builds';
// VerifiedBizLink-1.0.<run>-<sha7>-<test|release>.apk — anything else is refused,
// so a signed link can never be minted for some other object in storage.
const NAME_RX = /^VerifiedBizLink-(1\.0\.(\d+))-([0-9a-f]{7})-(test|release)\.apk$/;

export interface AppBuild {
  name: string;
  version: string;
  build: number;
  commit: string;
  kind: 'test' | 'release';
  sizeBytes: number | null;
  createdAt: string | null;
}

export type BuildsResult =
  | { ok: true; builds: AppBuild[] }
  | { ok: false; reason: 'not_configured' | 'no_bucket' | 'error'; message: string };

export function isBuildName(name: unknown): name is string {
  return typeof name === 'string' && NAME_RX.test(name);
}

export async function listBuilds(): Promise<BuildsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: 'not_configured', message: 'Supabase storage is not configured on this deployment.' };
  }
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .list(FOLDER, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) {
    const missing = /not found/i.test(error.message);
    return {
      ok: false,
      reason: missing ? 'no_bucket' : 'error',
      message: missing ? 'No builds have been published yet.' : error.message,
    };
  }
  const builds: AppBuild[] = [];
  for (const f of data ?? []) {
    const m = NAME_RX.exec(f.name);
    if (!m) continue;
    const size = (f.metadata as { size?: number } | null)?.size;
    builds.push({
      name: f.name,
      version: m[1],
      build: Number(m[2]),
      commit: m[3],
      kind: m[4] as AppBuild['kind'],
      sizeBytes: typeof size === 'number' ? size : null,
      createdAt: f.created_at ?? null,
    });
  }
  builds.sort((a, b) => b.build - a.build || (a.kind === 'release' ? -1 : 1));
  return { ok: true, builds };
}

/** A link that downloads the APK directly, valid for `seconds`. */
export async function signedDownloadUrl(name: string, seconds = 300): Promise<string | null> {
  if (!isBuildName(name)) return null;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(`${FOLDER}/${name}`, seconds, { download: name });
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
