# ON THE CLOCK — Project Manifesto (v4, build-ready)
*An 8-team iPad league where my sons draft full NFL rosters, get an instant draft grade, then simulate a season to crown a champion.*

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

The instant grade is the *prediction*. The season is the *payoff*. Best bragging rights in the house.

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
| 10 | Draft mechanic | **Manual every pick**, with a **"sim the rest"** option |
| 11 | Player photos | **Yes, for everyone** — by player ID, clean fallback card. Private family use. |
| 12 | Season refresh | **Script** rebuilds rosters + photos; **hand-tuned ratings persist** and carry forward |
| 13 | Teams | **8 teams** — 1–4 human seats (one per son), rest computer GMs. Configurable. |
| 14 | Season format | **7-game round-robin → top 4 → single-elim playoffs → champion** |

## 4. Core Principles

1. **Build for one, architect for many.** v1 runs on our iPad, no backend, no accounts. Model the data so an online multi-device league could be added later without a rewrite.
2. **Depth without drag.** "Sim the rest," instant CPU picks, and fast season-sim mean a full league never *forces* a long sitting.
3. **The grade and the trophy are the game.** Drafting is the setup; the grade and the season are the payoff. Polish lives there.
4. **Own the ratings, automate the rest.** Player value powers the grade *and* the season sim. It's hand-tuned and carried forward; everything else is scripted. Dad's judgment is the moat.
5. **No reading required to play.** Big photo cards, team colors, position badges, punchy scoreboards.

## 5. The Core Experience (the loop)

1. **Set up the league** → 8 teams; choose how many are real kids (pass-the-iPad) vs computer GMs; snake order set.
2. **Draft** → on your turn, filter by position, tap a card to pick. CPU GMs auto-pick instantly. Live draft board. "Sim the rest" anytime.
3. **GRADE REVEAL** → each team gets a letter + score + callouts (biggest steal, biggest reach, strongest unit, thinnest spot).
4. **Play the season** → 7-game round-robin, standings, then top-4 single-elim playoffs.
5. **CROWN A CHAMPION** → trophy screen; see whether the draft grades held up.
6. **Run it back.**

## 6. Game Design — The Draft

**Roster — 17 spots:**
- **Offense (10):** QB, RB, WR, WR, TE, LT, LG, C, RG, RT
- **Defense (6):** DE, DT, LB, CB, CB, S
- **Special teams (1):** K

**O-line as interchangeable spots:** any offensive lineman fills any of the five O-line slots (same flexibility on the corners). Cuts the data burden and the frustration.

**Draft format:** Snake, 17 rounds, 8 teams. CPU GMs pick best-available-by-rating with a light position-need rule. With mostly-CPU leagues, only the human picks take real time; CPU picks are instant.

**"Sim the rest":** auto-pick uses best-available + need. A kid can sim just their remaining picks, or fast-forward the entire draft to the grade.

## 7. Game Design — The Season

**Structure:**
- **Regular season:** round-robin — each team plays the other 7 once → **7 games each (28 total)**.
- **Standings:** by record; point differential breaks ties.
- **Playoffs:** **top 4 seeds**, single elimination — semifinals (1v4, 2v3) → final (3 games).
- **Champion** crowned. 31 games to a title.

**How a game is decided:** each roster rolls up to **unit strengths** from player `value`, position-weighted (QB and the trenches carry more than K). Your offense strength meets their defense strength to set points, and vice-versa; a seeded random factor keeps every game live and upsets possible. Output: a final score plus the inputs for a headline.

**What you see:** a fast scoreboard and a one-line headline per game ("Secondary got torched," "O-line bullied the trenches"), plus a live standings table and the playoff bracket. No play-by-play — punchy, not tedious.

**Two ways to run it:** sim the whole season instantly to the champion, or play it week-by-week and watch the standings move.

## 8. Data Model (sketch)

```
// ---- Generated by the refresh script each season (volatile) ----
PlayerCore { id, name, nflTeam, position /*QB RB WR TE | OL | DE DT LB CB S | K*/, photoUrl }

// ---- Hand-tuned, persistent, carries forward (the moat) ----
PlayerRating { id, value /*0–99, powers grade AND season sim*/, tier?, notes? }
// New players appear unrated → flagged "needs rating"

Player = PlayerCore + PlayerRating

League { id, teamIds[/*8*/], scheduleId, standings, status }
Draft  { id, mode, order, picks[], status }
Team   { id, name, isComputer, roster[/*17 by position*/], grade, record }
Season { id, weeks[/*round-robin*/], results[], bracket, champion }
```

The two-layer player split is deliberate: rebuild `PlayerCore` freely every season without touching tuned values.

## 9. The Grade Engine

Every player carries one `value` (0–99), covering every position — what makes grading a guard or a corner possible.

- **Value vs. slot:** a top-tier guard in round 12 = a steal; a round-12 value in round 2 = a reach.
- **Balance / needs:** all 17 spots filled sensibly, or holes left?
- **Score → grade:** value-over-slot + balance modifier → curve (A+ … D).
- **Unit callouts:** O-line, front (DE/DT/LB), secondary, skill. The part the boys argue about.
- **Prediction, not verdict:** the grade sets expectations the season then tests.

## 10. The Season Engine

- **Same value rollups as the grade engine** — build a `teamStrength(roster)` util once, reuse it for both.
- `simGame(teamA, teamB, seed)` → score + headline inputs. Pure function + seeded RNG (reproducible, debuggable).
- `simSeason(league)` → run the 28-game round-robin, build standings, seed the bracket, run playoffs, return a champion.
- Position weighting is a tunable config so you can dial how much QB / trenches / secondary swing games.

## 11. Data & Refresh Strategy

- **Once a season**, a refresh script pulls current rosters, positions, teams, and photo links → regenerate `PlayerCore`.
- **Ratings persist;** veterans keep tuned values, rookies surface in a "needs rating" queue. **≈ 20 min/year.**
- **Pool ≈ 350** — about the top 12–15 at each position group; deep enough that 8 teams drafting never hit scraps.
- **Seed `value` once** from a published all-position rating set, then tweak.
- **Photos** by player ID with clean fallback card. Private family use only.

## 12. Tech Approach (Claude Code)

- **Stack:** web app tuned for iPad, packaged as a **PWA** (home-screen install, offline once loaded).
- **No backend for v1.** Static `PlayerCore` JSON + persistent local ratings + on-device saved leagues/seasons.
- **All sim logic is pure functions + seeded RNG** — no server, fully testable.
- **Build order (de-risk first):**
  1. Player data file + ratings layer
  2. `teamStrength` rollup util
  3. Grade engine (placeholder data) — *is the grade fun?*
  4. Season engine — *are the games fun? do upsets feel right?*
  5. Draft UI + player cards
  6. Sim-the-rest + CPU GM logic
  7. Season UI — scoreboards, standings, bracket, trophy
  8. PWA packaging

## 13. v1 Scope

**In:** 8-team leagues (human + CPU mix), snake draft, "sim the rest," ~350 pool, 17-slot rosters, instant draft grade with unit callouts, **full season sim — round-robin + top-4 single-elim playoffs + champion**, instant or week-by-week season modes, photo cards w/ fallback, on-device saved leagues, season refresh script + persistent ratings.

**Out (deliberately):** online/multi-device play, accounts/cloud sync, live in-season NFL stats, trades/waivers/in-season roster management, multi-season dynasty mode.

## 14. Phase 2+ (parking lot)

- **Online multiplayer** — draft and play from different iPads (why we architect for it now).
- **Multi-season dynasty** — keep rosters across seasons, age players, draft rookies in.
- **Saved rivalries** between the brothers with running head-to-head and title records.
- **Computer GM personalities** — the homer, the gambler, the chalk-picker.

---

*Next step: turn this into a concrete build plan + starter specs for Claude Code — `PlayerCore`/`PlayerRating` data shape, the `teamStrength`/grade specs, and the `simGame`/`simSeason` season spec.*
