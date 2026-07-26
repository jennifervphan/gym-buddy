# Gym Buddy

An installable web app (PWA) for tracking gym sessions and deciding what to lift next.

Log what you actually did; Gym Buddy works out the prescription for your next session using
**double progression** and explains its reasoning in a sentence. Everything is stored on your
device — no account, no server, works offline.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | oxlint |
| `npm run check` | Typecheck + lint + tests |

## Deploying

The app is static files, so any host works. It is set up to deploy to **Netlify from GitHub
Actions, gated on the tests** — `.github/workflows/ci.yml` runs typecheck, lint and the test suite,
and only deploys if they all pass. A red build never reaches the live site.

### One-time setup

1. **Create the Netlify site.** In Netlify, **Add new site → Import an existing project**, pick this
   repo, and let the first deploy run.
2. **Turn off Netlify's automatic builds**: Site configuration → Build & deploy → Continuous
   deployment → **Stop builds**. This matters — if Netlify keeps building on push, it deploys in
   parallel with the workflow and the test gate is bypassed.
3. **Add two repository secrets** under Settings → Secrets and variables → Actions:

   | Secret | Where to get it |
   |---|---|
   | `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → **New access token** |
   | `NETLIFY_SITE_ID` | Netlify → Site configuration → General → **Site ID** |

After that, every push to `main` runs the checks and deploys on success. Pull requests run the
checks only. The deployed files are the exact artifact the tests ran against, not a rebuild.

### Response headers

`public/_headers` and `public/_redirects` are copied into `dist/` by Vite, so they ship inside the
deployed folder and apply regardless of how the deploy happens. They set what matters for a PWA:
`sw.js` and the manifest served uncached so clients always pick up a new build, fingerprinted
assets under `/assets/` cached indefinitely, and a strict Content-Security-Policy locking the page
to same-origin (the app makes no network requests at runtime, so nothing needs relaxing).

`netlify.toml` holds only the build settings, used if Netlify-side builds are ever re-enabled.

### Installing it on your phone

Open the deployed URL in the phone's browser and use **Add to Home Screen**. It runs full-screen
and works offline; a service worker precaches everything. HTTPS is required for the service worker,
which Netlify provides automatically.

Because data lives in the browser's local storage, the installed app and the browser tab share the
same data on one device, but nothing syncs between devices. **Settings → Export backup** writes a
JSON file you can restore on another phone.

## How the progression works

Double progression means you only add weight once you've earned it with reps.

For each exercise you set a number of working sets, a rep range, and a weight step (for example
3 sets of 5–8, +2.5 kg). After each session the planner looks at your last performance of that
exercise and picks one of:

| Outcome | When | Next session |
|---|---|---|
| **New lift** | No history yet | Work up to a weight you can control for the rep range |
| **Add reps** | Every set landed inside the range | Same weight, aim for one more rep per set |
| **Finish sets** | Hit the top of the range, but not on every set | Same weight, complete all the sets |
| **Add weight** | Every set reached the top of the range | Weight + step, back to the bottom of the range |
| **Repeat** | Fell short of the bottom of the range | Same weight again |
| **Deload** | Fell short twice in a row at that weight | Cut ~10% and rebuild |

Two details worth knowing:

- Progress is judged by your **worst set at the top weight**, not your best. Three sets of 8 counts;
  8/8/5 doesn't.
- Only **finished** sessions count, and empty rows are discarded when you save, so an abandoned
  session never moves your plan.

The stall limit, deload size, weekly session target and units are all configurable in **Settings**.

## What's in the app

- **Home** — the next routine in your rotation, its full prescription with reasons, weekly
  consistency, and a nudge about exercises you haven't trained lately.
- **Workout** — the session logger. Set rows are pre-filled with the planned weight, so logging is
  just typing rep counts. Rest timer starts automatically, warmup ramps are suggested for heavy
  work, and a trophy marks a set that beats your best estimated 1RM.
- **Progress** — weekly volume, working sets by muscle group, and per-exercise charts for estimated
  1RM, top-set weight and volume. Every chart is backed by a table of the same numbers.
- **History** — every session, with the exact sets you logged and the plan you were given.
- **Library** — the exercise library (30 seeded exercises, fully editable, plus your own) and your
  routines. Sessions rotate through routines in order.

Seeded routines are a four-day Upper/Lower split; delete or rewrite them freely.

## Notes on the numbers

- Estimated 1RM uses the Epley formula, with reps capped at 12 — beyond that the estimate stops
  meaning much.
- Volume is weight × reps over working sets. Warmups are logged but excluded from volume, set
  counts and progression.
- Bodyweight exercises are logged at 0 weight (add weight for a loaded pull-up); their records are
  reported in reps rather than an estimated 1RM. `Plank` logs seconds in the reps field.
- Weeks run Monday to Sunday. The consistency streak counts back over weeks that hit your target;
  the current week can only extend it, never break it.
- Switching between kg and lb converts every stored weight, so your history keeps its meaning.

## Project layout

```
src/
  lib/          progression engine, stats, storage, formatting — all pure and unit-tested
  state/        reducer + React context store, persisted to localStorage
  components/   charts, sheet, rest timer, icons
  pages/        one file per screen
```

The interesting logic is deliberately kept out of the components:
`lib/progression.ts` decides what to lift next, `lib/stats.ts` computes records and trends, and
`state/reducer.ts` is a pure function over the app's data. Those three have thorough test coverage
(`npm test`); the React layer is a thin shell over them.

## Data and privacy

Nothing leaves your device. There is no analytics, no network request at runtime, and no account.
The trade-off is that clearing your browser data deletes your training history — export a backup
periodically.
