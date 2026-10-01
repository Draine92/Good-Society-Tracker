# Good Society Tracker

A small shared web app for a D&D x Good Society campaign. The DM and players log in and share:

- **Public sheet:** each player character with concept, public ties, reputation tags (word, skill, scene, pips), inner conflict, Inspiration and monologue token.
- **Rumour board:** add rumours, spread them to create a Spark, cash a Spark in play. Closing a session fades unspread rumours.
- **NPC roster:** player-written NPCs tied to other characters, with Leverage tokens. Wants and secrets are visible only to the author and the DM.
- **DM screen:** create and manage player accounts, close sessions, session-zero decisions, story log, and all player secrets.

Page data refreshes automatically every few seconds, so changes show up live at the table.

## What is private

| Data | Who can see it |
|---|---|
| Public sheet, tags, rumours, NPC public details | Everyone logged in |
| A character's secret desire and private notes | That player and the DM |
| An NPC's want and secret | The NPC's author and the DM |

Privacy is enforced on the server, not just hidden in the page.

## Deploy on Vercel

1. **Push this repo to GitHub** (already done if you are reading this there).
2. **Import the repo in Vercel:** Add New > Project > select this repository. The framework is detected as Next.js.
3. **Add a Postgres database:** in the Vercel project, open Storage (or the Marketplace) and add Neon Postgres. This sets `DATABASE_URL` for you. Any Postgres connection string works.
4. **Set two more environment variables** (Project > Settings > Environment Variables):
   - `AUTH_SECRET`: a long random string. Generate one with `openssl rand -base64 32`.
   - `SETUP_KEY`: a one-time key you choose. You type it on the first-run setup page.
5. **Deploy.** Tables are created automatically on first load.
6. **Create the DM account:** visit `https://YOUR-SITE/setup`, enter the setup key, and pick your DM username and password. After that, `/setup` is closed.
7. **Add players:** sign in, open the DM page, and create an account for each player. Give them their username and starting password. They can change it on their My character page.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, SETUP_KEY
npm run dev
```

Open http://localhost:3000/setup to create the DM account.

## How the campaign rules map to the app

- **Tags:** max 3 positive and 3 negative per character. Add, deepen (pips 1-3) or remove them on My character. Each names a skill and a scene.
- **Inspiration:** capped at 3. Players adjust their own with the + and - buttons.
- **Monologue token:** one per session per player. Closing a session resets everyone's.
- **Inner conflict:** an "X vs Y" with up to 3 marks per side. A card shows "ready to resolve" at 3 marks on one side or 5 in total.
- **Rumours:** whispers become Sparks when spread. Closing a session marks unspread whispers as fading, and crosses off any that were already fading.
- **NPCs:** players can write up to 3 (two to start plus the mid-campaign slot), each tied to another player's character. Leverage runs 0-9 and is adjusted by the author or DM.

## Notes and limits

- Login attempts are throttled in memory, which resets when the server restarts. This is fine for a private table, but it is not a hardened login system.
- Passwords are stored as bcrypt hashes. Sessions are signed cookies that last 14 days.
- Rules text lives in the campaign docs, not in this app. The app only tracks state.

## Rules book and deck

The Rules book (`/rules`) and the Deck (`/deck`) are generated from the markdown in `content/`:

- `content/rules.md` is the rules doc. Each `## N. Title` section becomes a chapter. A section called "Still open" is left out.
- `content/setting-and-decks.md` holds the desire, relationship and connection cards and the Houses.

After editing either file, run `npm run content` to rebuild `lib/rules-data.js` and `lib/deck-data.js`, then commit. Adventure **Hook** lines on desire cards are only sent to the DM.
The world map goes in `public/world-map.jpg` (see `lib/world.js`).
