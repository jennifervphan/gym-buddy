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

The app is static files, so any host works. It is set up for **Netlify's Git integration**: connect
the repo once in the Netlify UI and every push to `main` builds and ships. No tokens or secrets are
involved.

**The tests gate the deploy.** The build command in `netlify.toml` is:

```
npm run check && npm run build
```

`npm run check` is typecheck, lint and the full test suite. If any of them fails the command exits
non-zero, Netlify fails the build, and the live site keeps serving the last good deploy — a red
commit never ships.

`.github/workflows/ci.yml` runs the same checks on pushes and pull requests. That is for reporting,
so a PR shows a pass/fail without you going to look at Netlify; the thing that actually gates what
ships is the build command above.

### Response headers

`public/_headers` and `public/_redirects` are copied into `dist/` by Vite, so they ship inside the
deployed folder and apply regardless of how the deploy happens. They set what matters for a PWA:
`sw.js` and the manifest served uncached so clients always pick up a new build, fingerprinted
assets under `/assets/` cached indefinitely, and a strict Content-Security-Policy locking the page
to same-origin (the app makes no network requests at runtime, so nothing needs relaxing).

Worth confirming once after the first deploy:

```
curl -I https://your-site.netlify.app/sw.js   # expect Cache-Control: public, max-age=0, must-revalidate
```

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
  consistency, and a nudge about exercises you haven't trained lately. Two **quick-start** buttons —
  Upper body and Lower body — begin a session in one tap, skipping the rotation.
- **Workout** — the session logger. Set rows are pre-filled with the planned weight, so logging is
  just typing rep counts. Rest timer starts automatically, warmup ramps are suggested for heavy
  work, and a trophy marks a set that beats your best estimated 1RM.
- **Progress** — weekly volume, working sets by muscle group, bodyweight over time, and per-exercise
  charts for estimated 1RM, top-set weight and volume. Every chart is backed by a table of the same
  numbers.
- **History** — every session, with the exact sets you logged and the plan you were given.
- **Library** — the exercise library (31 built-in exercises, fully editable, plus your own) and
  your routines. Sessions rotate through routines in order.

### Exercise reference

Every built-in exercise carries three cues — how to set up, how to do it, and the common mistake to
watch for — alongside a front/back body diagram highlighting the muscle group it trains. Both appear
on the exercise page (Progress → tap a lift) and behind a **How to do it** toggle in the workout
logger, so they are there when you need them and out of the way when you don't.

The diagram is one continuous silhouette drawn in `src/components/MuscleMap.tsx`, with the muscle
shapes clipped to it so they can never spill past the body's edge. Both views are drawn because
half the groups are posterior — highlighting hamstrings on a front view would say nothing.

These are written reference data (`src/lib/formCues.ts`), not photographs: text costs nothing to
ship, works offline, and cannot be subtly anatomically wrong the way a generated image can.
`Exercise.notes` remains your own field — the cues are refreshed from the library on load and never
overwrite anything you have edited.

### Programs

**Library → Routines → Browse programs** offers four ready-made splits:

| Program | Days | Suits |
|---|---|---|
| Upper / Lower | 4 | The default. Alternates A and B sessions. |
| Upper / Lower — simple | 2 | Least to keep track of. |
| Push / Pull / Legs | 3 | Split by movement rather than body half. |
| Full body | 3 | Each day hits everything, so a missed session costs less. |

Picking one replaces your routines. **Your logged sessions and exercise library are kept**, so
switching split never loses history or resets your progression — each exercise picks up from
whatever you last lifted on it.

### Quick start

The Upper body / Lower body buttons on Home skip the rotation. Which routine each one launches is
worked out from the muscle groups its exercises train (`routineFocus` in `src/lib/programs.ts`) —
nothing to tag, and custom routines are classified automatically. Core work counts towards neither,
and a routine with real work on both halves is treated as full body, so it won't appear under
either button. Where a focus has two matching routines, quick start picks whichever has gone
longest untrained, which alternates Upper A and Upper B by itself.

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

The trade-off is that your history is only as durable as this browser's storage. Clearing browsing
data deletes it, and browsers can evict the storage of a site you haven't opened in a while —
Safari is the strictest here, which is why installing to the home screen matters. The app defends
against this in two ways:

- **Install suggestion.** Once you have sessions logged, Home offers to install the app (or, on
  iOS where browsers can't trigger it, explains the Share → Add to Home Screen steps). Dismissable,
  and remembered.
- **Backup nudge.** Home prompts for an export once there is history worth protecting — after the
  first few sessions if you've never backed up, then again after 8 new sessions or 30 days.
  Settings always shows when you last backed up and how many sessions have been logged since.

The rules live in `src/lib/backup.ts` if you want them noisier or quieter.

## Schema versions

Stored data carries a `schemaVersion`; `migrate` in `src/lib/storage.ts` brings older payloads up to
date on load, so an old export always imports cleanly.

- **v2** — removed `rpe` from logged sets (it was never collected) and added the `lastBackup`
  record. Migration strips the stale field and defaults the new one.

Separately from versioning, every load merges in any **built-in exercises your library is missing**,
matched by name. The seed only runs on a first install, so without this an existing user would never
receive exercises added to the library in a later release. Anything you already have — renamed,
edited or archived — is left untouched, and nothing is added twice.
