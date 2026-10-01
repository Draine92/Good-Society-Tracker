import { q, dbUrl } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    database_url_present: Boolean(dbUrl()),
    auth_secret_present: Boolean(process.env.AUTH_SECRET),
    setup_key_present: Boolean(process.env.SETUP_KEY),
    database_connects: false,
    database_error: null,
  };
  if (checks.database_url_present) {
    try {
      await q('select 1');
      checks.database_connects = true;
    } catch (e) {
      checks.database_error = String(e.message || e).slice(0, 200);
    }
  }
  return Response.json(checks);
}
