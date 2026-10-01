import { redirect } from 'next/navigation';
import { userCount } from '@/lib/auth';
import { setupDM } from '../actions';
import Flash from '@/components/Flash';

export default async function SetupPage({ searchParams }) {
  if ((await userCount()) > 0) redirect('/login');
  return (
    <div className="login card">
      <h1>First-time setup</h1>
      <p className="sub">Create the DM account. You need the SETUP_KEY from your Vercel environment settings.</p>
      <Flash searchParams={searchParams} />
      <form action={setupDM}>
        <label htmlFor="key">Setup key</label>
        <input id="key" name="key" type="password" required />
        <label htmlFor="username">DM username</label>
        <input id="username" name="username" type="text" autoComplete="username" required />
        <label htmlFor="display_name">Display name</label>
        <input id="display_name" name="display_name" type="text" placeholder="Dungeon Master" />
        <label htmlFor="password">Password (8+ characters)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p><button type="submit">Create DM account</button></p>
      </form>
    </div>
  );
}
