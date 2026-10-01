import { redirect } from 'next/navigation';
import { getUser, userCount } from '@/lib/auth';
import { login } from '../actions';
import Flash from '@/components/Flash';

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/');
  if ((await userCount()) === 0) redirect('/setup');
  return (
    <div className="login card">
      <h1>Sign in</h1>
      <p className="sub">Your DM gave you a username and password.</p>
      <Flash searchParams={searchParams} />
      <form action={login}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <p><button type="submit">Enter</button></p>
      </form>
    </div>
  );
}
