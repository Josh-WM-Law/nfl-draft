# ON THE CLOCK — Project Manifesto (v5, post-review)
*An 8-team iPad league where my sons draft full NFL rosters, get an instant draft grade, then simulate a season to crown a champion.*

*v5 folds in reviews from Linus (architectural rot) and Neo (semantic coherence). Headline changes: sub-scores per player, structural asymmetry between grade and sim, UI-first build order, the 4-human queue trap addressed, ops specs spelled out, and the "architect for online" mandate killed.*

---

## 1. The One-Liner

A **full-roster, franchise-style mock draft league** for the boys. Eight teams — some real kids, the rest computer GMs — draft a 17-man team from current players. The moment the last pick is in, the app hands out a bold draft grade. Then they **simulate a season** — round-robin, playoffs, a champion. The grade predicts; the season proves it.

## 2. Why This Exists

Not a fantasy platform. A **football kid's dream**: build your *whole* team, run it through a season, and lift a trophy (or get told your O-line was a liability all along).

The arc is the hook:

- **Draft** a real team, both sides of the ball.
- **Get graded** instantly — bold, opinionated, a little savage.
- **Play the season** — 7 games, standings, playoffs, a champion.
- **Run it back** to dethrone your brother.

The instant grade is the *prediction*. The season is the *payoff*. For the arc to land, the grade has to *correlate* with the season — not *determine* it. Spoiler grades kill the story.

## 3. Decisions Locked

| # | Decision | Choice |
|---|---|---|
| 1 | Draft type | Fantasy-style — **current, real NFL players** |
| 2 | Play modes | **Both:** Solo (vs computer GMs) + Head-to-head (pass-the-iPad) |
| 3 | Platform | **iPad / tablet** first |
| 4 | Draft payoff | **Instant draft grade** — letter + score + unit callouts |
| 5 | Data freshness | **Refreshed once per season** (no live updates) |
| 6 | Audience | Boys aged **9–11** |
| 7 | Player value source | **Seed from all-position overall ratings (Madden-style 0–99), then I hand-tweak.** Override wins. |
| 8 | Player pool | **~350 players** — real depth at every position group (8 teams draft ~136) |
| 9 | Roster | **17 spots** — full O-line, slimmed one-deep defense, kicker |
| 10 | Draft mechanic | **Manual every pick**, with **queue + shot clock + sim-the-rest** options |
| 11 | Player photos | **Yes, for everyone** — by stable player ID, clean fallback card. Private family use. |
| 12 | Season refresh | **Script** rebuilds rosters + photos; **hand-tuned ratings persist** and carry forward |
| 13 | Teams | **8 teams** — 1–4 human seats (one per son), rest computer GMs. Configurable. |
| 14 | Season format | **7-game round-robin → top 4 → single-elim playoffs → champion** |
| 15 | Player model | **One `value` 0–99 + up to 3 position-appropriate sub-scores (−10..+10).** Sub-scores power matchups in the sim; `value` powers the grade. |
| 16 | Grade ≠ sim | **Different rollups, on purpose.** Grade rewards depth/balance/value-over-slot. Sim rewards concentration at high-leverage positions + matchup edges. Target grade↔final-standings correlation ≈ **0.55**. |
| 17 | Tiebreakers | Head-to-head → point differential → seeded coin flip (animated). |
| 18 | RNG | **Seed per league**, persisted. Reproducible replays. Never `Date.now()`. |
| 19 | Storage | localStorage + `schemaVersion` from day one. One `Game` blob per saved league. |
| 20 | Rookie fallback | Unrated player gets a **draft-capital prior** so the app is never broken pre-tuning. Flagged "needs rating." |
| 21 | ID authority | **One source pinned on day one.** Player ID stable across seasons. |

## 4. Core Principles

1. **Build for one. Period.** v1 runs on our iPad, no backend, no accounts. The discipline is **pure sim functions + seeded RNG** — that's what would survive into a future networked version, and it's a *good code* requirement anyway. No transport abstractions, no event sourcing, no "pluggable persistence" for a phantom v2.
2. **Ship the loop ugly. Tune the engine once you can feel it.** Build the boys a tappable draft in week two with a dumb grade, then improve.
3. **Depth without drag.** Instant CPU picks, sim-the-rest, **and** queue mode + shot clock for the 4-human case where the bottleneck is the iPad pass, not the deliberation.
4. **The grade and the trophy are the game.** Drafting is the setup; the grade and the season are the payoff. Polish lives there.
5. **Own the ratings, automate the rest.** Player value (+ sub-scores) powers the grade *and* the sim. It's hand-tuned and carried forward; everything else is scripted. Dad's judgment is the moat.
6. **No reading required to play.** Big photo cards, team colors, position badges, punchy scoreboards. **Callouts are icon + color + short phrase**, never sentences.

## 5. The Core Experience (the loop)

1. **Set up the league** → 8 teams; pick how many are real kids vs CPU GMs; each kid names + colors their team (part of the ritual); snake order set.
2. **Draft** → on your turn, filter by position, tap a card to pick. Pre-favorite targets between turns ("the queue"). Shot clock counts down with a visible auto-pick default. CPU GMs pick instantly. Round-end summary screens during the pass ("steal of the round"). One **5-second undo** on a misclick. "Sim the rest" anytime.
3. **GRADE REVEAL** → each team gets a letter + score + unit callouts (biggest steal, biggest reach, strongest unit, thinnest spot). Distribution is curved — no league of six B+s.
4. **Play the season** → 7-game round-robin, standings, then top-4 single-elim playoffs. Headlines on every game.
5. **CROWN A CHAMPION** → trophy screen; banner goes in the **trophy case** (persistent across leagues — bragging needs receipts).
6. **Run it back** — same league with a new seed to see if the upset was real, or a fresh draft to dethrone your brother.

## 6. Game Design — The Draft

**Roster — 17 spots:**
- **Offense (10):** QB, RB, WR, WR, TE, LT, LG, C, RG, RT
- **Defense (6):** DE, DT, LB, CB, CB, S
- **Special teams (1):** K

**O-line as interchangeable spots:** any offensive lineman fills any of the five O-line slots (same flexibility on the corners). Cuts the data burden and the frustration.

**Draft format:** Snake, 17 rounds, 8 teams. CPU GMs pick best-available-by-`value` with a light position-need rule. With mostly-CPU leagues, only the human picks take real time; CPU picks are instant.

**The 4-human case (the hidden trap):** 68 human picks across 17 rounds. Without help, the bottleneck is the iPad pass, not the picking. Three mitigations, all required:
- **Queue:** each kid favorites 3–5 targets between their turns. On the clock, they tap their top still-available favorite.
- **Shot clock:** 20 seconds with a visible default pick. Runs out → auto-pick the top queued/best-available. Urgency, no "I dunno" stall.
- **Round-end summary** as a natural breath point and a handoff prompt.

**Pause/resume:** the draft state is autosaved after every pick. iPad sleeps, kid walks away, picks back up exactly where it left off. Same league resumes on relaunch.

**Team identity:** before the draft, each kid picks a team name + primary color from a curated palette. The team identity sticks across runs in the same league.

**"Sim the rest":** auto-pick uses best-available + need. A kid can sim just their remaining picks, or fast-forward the entire draft to the grade.

## 7. Game Design — The Season

**Structure:**
- **Regular season:** round-robin — each team plays the other 7 once → **7 games each (28 total)**.
- **Standings:** by record; tiebreakers in order — head-to-head → point differential → seeded coin flip (animated, so it feels fair).
- **Playoffs:** **top 4 seeds**, single elimination — semifinals (1v4, 2v3) → final. **31 games to a title.**
- **Champion** crowned, banner added to the trophy case.

**How a game is decided:** each roster rolls up to **unit strengths** built from player `value` *and matchup-relevant sub-scores* (your pass-rush sub-score eats their O-line pass-pro sub-score; your CB coverage sub-score meets their WR separation). Position weighting makes QB and the trenches matter more than K. A seeded RNG adds variance without inverting the matchup math. Output: a final score + the inputs for a headline that's actually true ("Secondary got torched" because the CB-vs-WR matchup actually lost).

**Reproducible replays:** every league owns its RNG seed. "Run it back with a new seed" is one tap — same rosters, new variance — so the boys can argue about whether the upset was real or a fluke.

**What you see:** a fast scoreboard, a one-line headline per game, a live standings table, and the playoff bracket. No play-by-play — punchy, not tedious.

**Two ways to run it:** sim the whole season instantly to the champion, or play it week-by-week and watch the standings move.

## 8. Data Model (sketch)

```
// ---- Generated by the refresh script each season (volatile) ----
PlayerCore {
  id,           // stable across seasons — ONE pinned authority
  name, nflTeam,
  position,     // QB RB WR TE | OL | DE DT LB CB S | K
  photoUrl,
  status        // 'active' | 'retired' | 'cut'  — tombstone instead of delete
}

// ---- Hand-tuned, persistent, carries forward (the moat) ----
PlayerRating {
  id,           // matches PlayerCore.id
  value,        // 0–99, drives the GRADE
  subscores,    // {} or e.g. {passRush: +6, runDef: -4} — drives MATCHUPS in sim
                //   pool by position: QB → {arm, mobility}; RB → {power, burst};
                //   WR → {separation, deep}; OL → {passPro, runBlock};
                //   DE/DT → {passRush, runDef}; LB → {coverage, runDef};
                //   CB/S → {coverage, ballHawk}; K → none
                //   keep it cheap; -10..+10 each; "needs rating" if missing
  tier,         // 'S' | 'A' | 'B' | 'C' — drives headlines, callouts, dinner-table arguments
  archetype,    // optional one-tag flavor: 'deep', 'possession', 'power', 'scat', etc.
  notes,        // savage flavor; surfaces in callouts. The moat the boys feel.
  needsRating   // true for rookies/unrated until tuned
}

Player = PlayerCore + PlayerRating

// Position changes: if PlayerCore.position changes between refreshes,
// rating is preserved but flagged "needsRating" — a 92 at S is not a 92 at LB.

// ---- v1 storage: ONE blob per saved league ----
Game {
  schemaVersion,  // bump on shape change; migrate on load
  id, name, createdAt,
  seed,           // owned per-league, persisted
  teams[8],       // { id, name, color, isComputer, ownerName, roster[17], grade, record }
  draft,          // { order, picks[], status, currentPickIdx, queueByTeam }
  season,         // { weeks[], results[], standings, bracket, champion }
}

// ---- Cross-league persistence ----
TrophyCase { banners[ {leagueName, championTeamName, ownerName, date, seedHash} ] }
```

The two-layer player split is deliberate: rebuild `PlayerCore` freely every season without touching tuned values. Sub-scores + tier + notes are what keep one scalar from collapsing the game into "the higher number wins."

## 9. The Grade Engine

The grade's job: be a *bold prediction* that the season can confirm or upend. Loud, defensible, **and not a spoiler**.

- **Value-over-slot:** a top-tier guard in round 12 = a steal; a round-12 value in round 2 = a reach.
- **Balance / needs:** all 17 spots filled sensibly, or holes left? Grade rewards completeness.
- **Depth bonus:** strong second WR / CB / OL beyond the starter slot. (The sim doesn't reward this much — that's the asymmetry.)
- **Score → grade:** value-over-slot + balance + depth → letter. **Forced curve:** roughly A:1, B+:1, B:2, B-:2, C+:1, C/D:1 across 8 teams. No league of six B+s.
- **Unit callouts:** O-line, front (DE/DT/LB), secondary, skill. **Icon + color + short phrase** ("O-LINE: 🛡️ FORTRESS", "SECONDARY: 🔥 ARSON"). Pull `tier` and `notes` for flavor. Reading-optional.
- **Prediction, not verdict:** the grade sets expectations the season then tests.

## 10. The Season Engine

The season's job: produce believable upsets, true headlines, and a story the grade didn't already tell.

- **Reuse `value` for baseline team strength**, *but* the sim layers matchup math on top:
  - Pass game: WR `separation` + QB `arm` vs. CB `coverage` + S `ballHawk`, modulated by pass-rush vs. pass-pro on the line.
  - Run game: RB `power`/`burst` + OL `runBlock` vs. DL `runDef` + LB `runDef`.
  - Kicker: small, mostly cosmetic — `K` `value` only.
- **Different weighting from the grade.** The sim leans hard on high-leverage positions (QB, edge, LT). A team with one elite QB and average everywhere else can absolutely win games the grade said it shouldn't.
- **`teamStrength(roster, side)`** is one shared util — but grade and sim call it with **different weights** and the sim also calls **`matchupEdge(unitA, unitB)`** for the asymmetry.
- **`simGame(teamA, teamB, seed)`** → score + the matchup deltas that drove it, so headlines are *generated from actual sim output*, not flavor-bolted-on.
- **`simSeason(league)`** → 28-game round-robin, standings, bracket, playoffs, champion. Pure function + seeded RNG (reproducible, debuggable).
- **Target correlation:** grade rank ↔ final standings ≈ **0.55**. Verifiable: a test harness sims 1000 leagues and reports the correlation. If it's >0.7, sim is too predictable; if <0.4, grade is dishonest. Tune.

## 11. Data & Refresh Strategy

- **One ID authority pinned on day one.** Player ID stable across seasons or the moat detaches.
- **Once a season**, a refresh script pulls current rosters, positions, teams, and photo links → regenerate `PlayerCore`.
- **Reconciliation rules** (the refresh script enforces them, surfaces a report):
  - Player gone from source → mark `status: retired` (tombstone). Rating kept; ignored at draft time.
  - Position changed → rating preserved, `needsRating: true`, surfaced in the tweak queue.
  - New player → `needsRating: true`, draft-capital prior applied as default `value`.
- **Ratings persist;** veterans keep tuned values, rookies surface in a "needs rating" queue. **≈ 20 min/year** in the **in-app rating tweaker** (mandatory — JSON edits won't happen).
- **Pool ≈ 350** — about the top 12–15 at each position group; deep enough that 8 teams drafting never hit scraps.
- **Seed `value` once** from a published all-position rating set, then tweak. Sub-scores seed from position-relevant published splits where available, otherwise zero.
- **Photos** by player ID with clean fallback card. Bundled into the PWA app shell where possible; cached aggressively. Private family use only.

## 12. Tech Approach (Claude Code)

- **Stack:** web app tuned for iPad, packaged as a **PWA** (home-screen install, offline once loaded).
- **No backend for v1.** Static `PlayerCore` JSON + persistent local ratings + on-device saved leagues/seasons.
- **All sim logic is pure functions + seeded RNG** — no server, fully testable. This is the only "future-proofing" we owe ourselves.
- **Build order (UI-first; ship the loop ugly):**
  1. **Player data file** — 50 real players is enough to start; expand to 350 later.
  2. **Draft UI + tappable player cards** — boys can pick teams by week two.
  3. **Dumbest possible grade** (sum of values + letter curve) — proves the loop.
  4. **`teamStrength` rollup + `simGame` with sub-scores and matchup math** — *do upsets feel right?*
  5. **Season UI** — scoreboards, standings, bracket, trophy.
  6. **CPU GM logic + sim-the-rest + queue/shot-clock + 5s undo** — the polish that makes the draft *playable*.
  7. **Grade engine v2** — depth/balance/forced curve, callouts pulled from sub-scores/tier/notes.
  8. **In-app rating tweaker + refresh script + reconciliation report.**
  9. **Trophy case + reproducible replay.**
  10. **PWA packaging + photo bundling.**

## 13. v1 Scope

**In:** 8-team leagues (human + CPU mix), snake draft with queue + shot clock + 5s undo, "sim the rest," ~350 pool, 17-slot rosters, instant draft grade with unit callouts and forced curve, **full season sim — round-robin + top-4 single-elim playoffs + champion**, instant or week-by-week season modes, photo cards w/ fallback, on-device saved leagues with `schemaVersion`, persistent per-league RNG seed + reproducible replays, trophy case across leagues, team naming + colors, in-app rating tweaker, season refresh script with reconciliation report + persistent ratings/sub-scores.

**Out (deliberately):** online/multi-device play, accounts/cloud sync, live in-season NFL stats, trades/waivers/in-season roster management, multi-season dynasty mode, transport/persistence abstractions for a phantom networked v2.

## 14. Phase 2+ (parking lot)

- **Online multiplayer** — if we get there, the netcode layer gets written then. The pure-sim discipline is the only prep we owe ourselves now.
- **Multi-season dynasty** — keep rosters across seasons, age players, draft rookies in.
- **Saved rivalries** between the brothers with running head-to-head and title records (the trophy case is the seed).
- **Computer GM personalities** — the homer, the gambler, the chalk-picker.

---

*Next step: turn this into a concrete build plan + starter specs for Claude Code — `PlayerCore`/`PlayerRating` data shape (with sub-scores), the `teamStrength` + `matchupEdge` + grade specs, the `simGame`/`simSeason` season spec, and the 1000-league correlation harness.*
