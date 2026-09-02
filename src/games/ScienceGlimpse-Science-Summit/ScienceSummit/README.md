# Science Summit

A self-contained React + TypeScript vertical platformer for ScienceGlimpse.

The project structure supplied by ScienceGlimpse has a `src` directory with `components`, `context`, `data`, `hooks`, `lib`, and `pages`, so this game is intentionally isolated in its own folder rather than requiring changes to those existing systems.

## Install

Create:

```text
src/games/ScienceSummit/
```

and put these three files there:

```text
ScienceSummit.tsx
science-summit.css
index.ts
```

No new npm packages are required.

## Add a route

Wherever your existing routes live, import:

```tsx
import { ScienceSummit } from "@/games/ScienceSummit";
```

Then add the route using the router pattern already used by your app. For React Router, for example:

```tsx
<Route path="/games/science-summit" element={<ScienceSummit />} />
```

If your project does not use the `@` alias, use your existing relative import instead.

## ScienceGlimpse tokens as energy

Signed-in players play with their real ScienceGlimpse token balance as energy — the component reads it itself via `useAuth()` (`src/context/AuthContext.tsx`) and `useGameEnergy()` (`src/hooks/useGameEnergy.ts`), so no wiring is needed at the call site. Signed-out visitors get a fixed practice pool (`practiceEnergy`, default 35) that is never persisted.

- A player's token balance is the sum of three append-only Firestore subcollections under `users/{uid}`: `tokenLedger` (article-reading rewards), `tokenAdjustments` (moderator grants), and `gameLedger` (this game). See `src/lib/tokens.ts` for the shared balance calculation used everywhere tokens are shown (Profile, Mod, this game).
- Jumping is the only thing that spends energy: every `JUMPS_PER_TOKEN` (10) jumps — grounded or double-jump, counted the same way — spends `TOKENS_PER_CHARGE` (1) token, via a fixed-shape write to `users/{uid}/gameLedger`. Once a player's tokens hit 0, jumping is refused entirely.
- The on-screen number only ever shows whole tokens. Since each jump costs a tenth of a token, the display simply doesn't move until a full token is actually spent on the 10th jump — equivalent to always rounding up, without ever showing a decimal.
- The spend amount is a fixed constant validated by Firestore Security Rules (see the rules pasted into the Firebase console), so a modified client can't grant itself tokens — it can only harm its own balance, which rules don't need to guard against.

## Gameplay

- A / D or Left / Right: move
- Space / W / Up: jump (every 10 jumps costs 1 token; out of tokens, no more jumping)
- Second jump: double jump
- P: pause
- Mobile: on-screen controls
- Platforms are fully solid: they block horizontal movement into their sides, always stop a fall onto their top, and always stop a jump into their underside too — rising straight up through a platform is never allowed, even one the player is trying to land on. Reaching the top of a platform means jumping up beside it and coming down onto it, not rising through the middle. Consecutive platforms are always generated with a guaranteed horizontal gap (never stacked directly on top of one another), which is what makes that side approach possible in the first place.
- Falling: returns you to the most recent checkpoint
- Lava rises continuously from below and gets faster every 100m of altitude reached; touching it is instant death, no checkpoint reset
- New platforms are generated above the player, so the climb is effectively endless
- Best altitude is scoped to the signed-in account (`users/{uid}/gameStats/scienceSummit` in Firestore, via `useBestAltitude()` in `src/hooks/useBestAltitude.ts`), not the device — switching accounts on the same browser shows each account's own record. Signed-out play falls back to a per-device localStorage record, since there's no account to scope it to.

## Visual identity

This is an original ScienceGlimpse implementation. It does not use Gimkit assets, characters, maps, code, or branding.
