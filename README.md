# Team management app ⚽

A team management app for staff and players. Hebrew, RTL, mobile-first, installable on a phone's home screen.

## Running it
```
npm install
npm run dev
```
Then open the address shown (on a phone on the same network, use the "Network" address).
Staff login code: **1234** (you can change it in Settings).

## Production build
`npm run build` → the `dist` folder can be uploaded to any free static host (Netlify / Vercel / GitHub Pages).

## What's included
- **Staff:** dashboard with alerts, squad and photos, match-day squads, lineup on a pitch, live match logging (goals, assists, subs, cards), ratings and man of the match, schedule with attendance confirmation and actual attendance, equipment and maintenance, kit sizes, finances and staff salaries, technical director (tasks, match-day checklist, medical clearances and player cards, scouting, log), backup.
- **Players:** confirm attendance, upcoming schedule, published lineup, personal stats and ratings, season tables.
- **WhatsApp sharing:** squad, lineup, match reminder and the week's schedule.

## Data
Data is currently stored on the device (localStorage). The whole state is a single JSON object (`src/store.ts`),
so it's easy to connect a cloud backend (Supabase / Firebase) and sync staff and players across devices.
