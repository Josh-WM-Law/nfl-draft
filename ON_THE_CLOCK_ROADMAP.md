# ON THE CLOCK — Build Roadmap (v1, off Manifesto v5)

*A milestone-based plan to ship v1 to the iPad. Each milestone ends with a real demo — usually one a 9-year-old can hold. Built around a managing-partner-with-three-sons cadence: finite weekends, no death-march sprints, every milestone independently valuable.*

---

## Operating Principles

1. **Every milestone is shippable.** If we stop after M3, the boys have a playable game. If we stop after M5, they have a playable game that refreshes itself each season. No "phase 7 is when it gets good."
2. **Ship the loop ugly.** Bad CSS, placeholder grades, no animations — fine. The hypothesis at each milestone is about the *fun*, not the polish.
3. **Demo to a kid, not a console.** Each milestone's "done" criterion is a 9-year-old can use the thing and tell you what's wrong with it.
4. **The 1000-league correlation harness is the truth-teller.** Once the sim exists (M2), it runs on every change. If grade↔standings correlation drifts outside ~0.45–0.65, we fix it before adding features.

---

## Pre-flight: Stack Decisions

Two calls to make before M0. Defaults proposed; override either.

| Decision | Default | Why |
|---|---|---|
| Frontend stack | **Vite + React + TypeScript** | Standard, fast iPad PWA story, easy testing of pure sim fns, big component ecosystem for bracket/trophy polish. |
| Styling | **Tailwind** | Big-photo iPad UI is mostly utility classes; speeds the "ugly but playable" pass. |
| State | **Zustand** | Light, no boilerplate; one store per `Game` blob fits v5's storage model. |
| Tests | **Vitest** | Same runtime as Vite; pure sim functions are the bulk of testing. |
| PWA | **vite-plugin-pwa** | Standard, handles service worker + offline cache + install prompt. |
| Player ID source | **Sleeper API IDs** (or ESPN, locked day one) | Stable across seasons, public docs, free, no auth. v5 §11 requires *one* pinned authority. |

---

## M0 — Foundation (weekend 1)

**Goal:** Empty room with the lights on.

**Deliverables:**
- Vite + React + TS repo initialized in `C:\Users\josh\git\NFL Draft\app`
- Tailwind, Zustand, Vitest, vite-plugin-pwa wired up
- iPad viewport tested in browser DevTools (768×1024 portrait + landscape)
- Repo structure: `src/{data,engine,state,ui,refresh}/`
- `Game` blob type defined in TS with `schemaVersion: 1`
- Persistence helper: `loadGame() / saveGame()` against localStorage with version check
- One smoke test: empty `Game` round-trips through save/load

**Done when:** `npm run dev` opens a blank "ON THE CLOCK" screen on iPad-sized viewport; `npm test` is green; `Game` blob persists across reloads.

**Demo:** Show the kid a blank app with their name on it. (Yes, really. Anchors the project.)

**Risk:** None. Pure scaffolding.

---

## M1 — First Playable Draft (weekends 2–3)

**Goal:** *Can a kid draft a team and feel the joy of picking Mahomes?*

**Deliverables:**
- **Player pool seed:** ~350 real current NFL players in `data/players.json`. Bootstrap from a published Madden-style rating dump or scrape Sleeper. Just `value` 0–99 for now; sub-scores zero.
- **Player card component:** photo (with fallback card), name, NFL team, position badge, value. Big enough to tap with kid hands.
- **Draft screen:** 8 teams shown, current pick highlighted, available player grid with position filter chips. Tap a card → it's picked.
- **Draft state machine:** snake order, 17 rounds, advance pick on tap. Pause/resume on relaunch (autosaved after every pick).
- **Dumbest possible grade reveal:** sum of `value` per team → letter on a flat curve. Big bold letter, no callouts yet. *Just to prove the moment lands.*

**Done when:** Josh + one son can sit down, do an 8-team draft (1 human + 7 CPU picking random best-available), and see grades for all 8 teams. Whole thing under 10 minutes.

**Demo:** A son drafts. Out loud. You watch his face when the grade hits.

**Risks:**
- **Player pool quality.** If the seed data is junk, the draft feels random. Mitigation: spot-check 20 marquee players; if their `value` is sane, ship it.
- **Card readability on iPad glare.** Test on the actual iPad, not just DevTools.

---

## M2 — Believable Football (weekends 4–5)

**Goal:** *Do simmed games produce upsets that feel honest?*

This is the highest-risk milestone in the project. If the sim is bad, the whole arc collapses. We test it before building the season UI on top of it.

**Deliverables:**
- **Sub-scores added** to ~50 marquee players (QBs, top RB/WR/edge/CB). Rest stay at zero — fine for now.
- **`teamStrength(roster, side, weights)`** — pure function, weighted rollup of `value` by position.
- **`matchupEdge(unitA, unitB, subscoreKeys)`** — pure function, sub-score deltas drive matchup asymmetry.
- **`simGame(teamA, teamB, seed)`** — pure function, returns `{ scoreA, scoreB, matchupNotes[] }`. Seeded RNG, never `Date.now()`.
- **`simSeason(league, seed)`** — 28-game round-robin + bracket + champion. Pure function.
- **The Correlation Harness:** test that builds 1000 random leagues, sims each, computes grade-rank ↔ final-standings rank correlation. Asserts 0.45 ≤ r ≤ 0.65.
- **Dev-only sim screen:** crude HTML table — load a saved draft from M1, run the season, show standings + bracket + headlines. No styling.

**Done when:** Correlation harness passes. Three test leagues simulated by hand pass the smell test — winners aren't always the highest-`value` team; headlines match the matchup deltas (a team with no pass rush actually loses to a team with elite WRs).

**Demo:** Show the son his team from M1, simulate the season three times with different seeds, and watch him react to "wait, why did I lose this time?"

**Risks:**
- **Correlation too high (sim is a spoiler).** Likely root cause: not enough sub-score variance, or sim weights too close to grade weights. Tune.
- **Correlation too low (grade is dishonest).** Likely root cause: sub-scores swamping `value`. Cap their influence.
- **Headlines feel generic.** Add 3–5 more matchup-note templates; pull `tier`/`notes` flavor.

---

## M3 — Full Season Loop (weekend 6)

**Goal:** *Can a kid play the whole arc — draft, grade, season, trophy — in one sitting?*

**Deliverables:**
- **Season screen:** week-by-week scoreboard view, one-line headline per game, live standings table that updates as games complete.
- **Bracket screen:** visual single-elim bracket, top-4 seeded, advances as games sim.
- **Trophy screen:** big, animated (CSS only — we're still ugly-but-playable), team name + color + champion banner.
- **"Sim instantly" vs "play week-by-week"** toggle on season start.
- Glue: draft completion → grade reveal → season screen → trophy. The whole loop end-to-end.

**Done when:** Same son from M1's demo plays the entire arc start-to-finish on the iPad in under 20 minutes, no help.

**Demo:** Three sons, one league. They draft pass-the-iPad style (rough, no queue yet — that's M4), sim the season, crown a champion. Dad takes notes on what hurt.

**Risks:**
- **The pass-the-iPad pain Neo predicted shows up here.** Expected. Notes from this demo drive M4.

---

## M4 — Make the Draft Playable (weekends 7–8)

**Goal:** Kill the friction that the M3 demo exposed.

**Deliverables:**
- **Smarter CPU GMs:** best-available-by-`value` weighted by position need, light personality variance (random pick from top 3). Replaces the random picker from M1.
- **"Sim the rest"** — finish my picks for me OR fast-forward to grade.
- **Queue mode:** between turns, kid can favorite 3–5 targets. On the clock, top still-available favorite is the highlighted default.
- **Shot clock:** 20-second timer with visible auto-pick default. Runs out → take the default.
- **5-second undo** on a pick.
- **Round-end summary screen** as natural handoff prompt ("steal of the round").
- **Team naming + color** picker pre-draft.

**Done when:** All three sons together draft a full league in under 25 minutes without dad refereeing.

**Demo:** The "did we fix it" replay of M3's painful demo.

**Risk:** Shot clock feels mean to a kid who needs a minute. Default to 30s, make it tunable in settings.

---

## M5 — Grade v2 (weekend 9)

**Goal:** Make the grade reveal the moment §5 promises.

**Deliverables:**
- **Grade formula v2:** value-over-slot + balance + depth bonus → score → forced letter curve (A:1, B+:1, B:2, B-:2, C+:1, C:1).
- **Unit callouts:** icon + color + short phrase per unit (O-line, front, secondary, skill). Format: `O-LINE  🛡️  FORTRESS`. Pull `tier`/`notes`/`archetype` for flavor.
- **Steal-of-the-draft, reach-of-the-draft, strongest unit, thinnest spot** per team.
- **Animated reveal:** team-by-team grade card flip, big letter, callouts fade in.
- Verify correlation harness still passes after grade v2 ships.

**Done when:** Sons argue about the grades unprompted.

**Demo:** Family dinner. Dad reads grades aloud from the iPad. Volume goes up.

---

## M6 — Operational Maturity (weekend 10)

**Goal:** The app survives the year. Rookies don't break it. Dad's 20 min/year actually happens.

**Deliverables:**
- **Refresh script** (`npm run refresh`): pulls current rosters from pinned source, regenerates `PlayerCore`, runs reconciliation.
- **Reconciliation report:** lists retirements (tombstone applied), position changes (rating preserved, flagged needsRating), new players (draft-capital prior applied), any ID mismatches.
- **Draft-capital prior:** map rookie draft slot → default `value`. R1 picks 1–10 → 78; 11–20 → 75; 21–32 → 72; R2 → 68; … UDFA → 55. Tunable.
- **In-app rating tweaker:** dedicated screen, lists `needsRating` queue first. Tap player → slider for `value`, sliders for position-relevant sub-scores, text field for `notes`, dropdown for `tier` and `archetype`. Save persists immediately.
- **Schema migration switch:** on load, if `schemaVersion < current`, run migration; else load as-is.

**Done when:** Dad runs `npm run refresh` against a (fake) "new season" dump, gets a clean report, spends 20 minutes in the tweaker, and the app is ready to draft again.

**Demo:** Dad-only. This is invisible to the boys, but the project dies without it.

---

## M7 — Continuity (weekend 11)

**Goal:** Give the boys receipts. Make "run it back" one tap.

**Deliverables:**
- **Trophy case screen:** persistent across all leagues. Banners showing league name, champion team name + color, owner, date, seed hash.
- **Reproducible replay:** "Run it back with a new seed" button on the trophy screen. Same rosters, new variance, new champion (probably).
- **Saved leagues list:** load any past league, view its standings/bracket/trophy.

**Done when:** A son can swipe through every championship he's ever won. He will.

**Demo:** Show them the trophy case for the first time. Watch them open it five more times that day.

---

## M8 — Ship to iPad (weekend 12)

**Goal:** It's an app, not a localhost tab.

**Deliverables:**
- **PWA manifest** + service worker (via vite-plugin-pwa).
- **Photo bundling strategy:** bundle top-200 player photos in app shell; lazy-fetch + cache the rest on first sight.
- **"Add to Home Screen"** install flow tested on the actual iPad.
- **Offline mode** verified: airplane mode after first load → full app still works.
- **iPad performance pass:** profile a full season sim on the device; target < 2s for `simSeason`.
- **App icon, splash screen, status bar color.**

**Done when:** App is on the family iPad's home screen. Tap the icon, plane mode on, draft a full league, sim a season, see the trophy. Zero network.

**Demo:** Ceremonial. iPad gets handed over for keeps.

---

## Demo Cadence Summary

| Milestone | Demoable to a Kid | Hypothesis Tested |
|---|---|---|
| M0 | No (foundation only) | — |
| M1 | Yes — draft + grade reveal | Does the pick-and-grade moment land? |
| M2 | Yes — sim three times, watch reactions | Do upsets feel honest? |
| M3 | Yes — full loop end-to-end | Can a kid hold the whole arc? |
| M4 | Yes — multi-human draft | Did we fix the pass-the-iPad friction? |
| M5 | Yes — grade reveal | Do the boys argue about grades? |
| M6 | No (dad-only ops) | Does the year-over-year story work? |
| M7 | Yes — trophy case + replay | Do receipts matter as much as we think? |
| M8 | Yes — on the home screen | Is it a real thing now? |

---

## Risk Register (top 5)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sim correlation drifts and sim becomes a spoiler or randomizer | High | Critical | Correlation harness from M2 runs on every change; CI blocks if out of range. |
| Pool data is junk, draft feels arbitrary | Medium | High | Spot-check marquee players in M1; bias toward published Madden seed over scraping. |
| Shot clock feels mean to a 9-year-old | Medium | Medium | Default 30s, tunable in settings, never punitive (auto-picks a good default). |
| Refresh script breaks across season (ID source changes API) | Medium | High | Pin Sleeper IDs day one; refresh script outputs report before mutating; manual fallback if source breaks. |
| Photo licensing concern from family-shared screenshot leaking | Low | Medium | App stays private; no share buttons in v1; photos bundled or cached, never on a public URL. |

---

## Cut Lines (if weekends run short)

In rough cut order, latest first:

1. M8 polish (animations, splash screens) — ship as a localhost PWA install if needed.
2. M7 reproducible replay — trophy case is the must-have; replay can wait.
3. M5 forced curve — flat curve is fine for v1 if dad runs out of time.
4. M4 queue mode — shot clock alone solves 70% of the pain.
5. M2 sub-scores beyond top 50 — zeros are a survivable default.

Anything above the line is non-negotiable for v1. The arc collapses without M1, M2, M3, and M6.

---

*Next step: confirm the stack picks above, then start M0.*
