# ON THE CLOCK

A personal NFL draft + season simulator for the Woolsey family.

8 teams snake-draft 18-player rosters from current NFL players (plus
the family's custom players), get an instant draft grade, then sim a
7-game regular season + top-4 single-elim playoffs. Quarter-by-quarter
playoff reveals, season awards, the works.

## Tech

Vite + React + TypeScript + Tailwind + Zustand. PWA via
`vite-plugin-pwa`. No backend; all state lives in `localStorage`.
Sim logic is pure functions with seeded RNG (Mulberry32).

## Local dev

```bash
cd app
npm install
npm run dev
```

Opens on `http://localhost:5173`.

## Data refresh (~once per season)

```bash
cd app
npm run refresh          # pulls active NFL rosters from Sleeper API
npm run madden           # applies Madden NFL top-100 OVR ratings on top
```

Custom family players live in `src/data/customPlayers.ts` — these are
preserved across refreshes.

## Disclaimers

Not affiliated with the NFL, EA, Madden, or Sleeper. Player names,
team codes, and ratings are used under fair use for non-commercial,
educational family use.
