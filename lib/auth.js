import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { q } from './db';

const COOKIE = 'gs_session';
const MAX_AGE = 60 * 60 * 24 * 14;

function secretKey() {
  const s =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== 'production'
      ? 'dev-only-secret-change-me-dev-only-secret'
      : null);
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(secretKey());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function destroySession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const rows = await q(
      'select id, username, display_name, role from users where id = $1',
      [payload.uid]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireDM() {
  const user = await requireUser();
  if (user.role !== 'dm') redirect('/');
  return user;
}

export async function userCount() {
  const rows = await q('select count(*)::int as n from users');
  return rows[0].n;
}
