# Blair Board — Claude Code Instructions

## Commands

- `pnpm dev` — start dev server (http://localhost:5173)
- `pnpm check` — TypeScript + Svelte type checking (run after changes)
- `pnpm build` — production build (outputs to `build/`)
- `node build/index.js` — run production server (port 3000)
- `pnpm rebuild esbuild` — fix esbuild after fresh `pnpm install`

## Git Workflow

- **Always work in feature branches** — never commit directly to main
- Create branches with descriptive names (e.g., `feature/spanning-events`, `fix/alignment-issue`)
- **Do not commit changes until explicitly instructed by the user** — wait for the user to say "commit"
- **Do not merge branches until explicitly instructed by the user** — wait for the user to say "merge"
- Only create commits when the user requests them
- Only merge to main after user approval

## Architecture at a Glance

See [TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md) for full details. The short version:

- **Server** fetches iCal feeds via `ical.js`, caches raw data in-memory (TTL), expands recurring events per-request using `ICAL.Event.iterator()`, converts timezones, serves via `GET /api/events`
- **Client** renders from SSR data on first paint, then polls `/api/events` every N minutes. All UI state lives in a `CalendarState` class using Svelte 5 runes. Persists view, hidden calendars, and agenda visibility to localStorage
- **Config** is in `config.json` at project root (gitignored). Validated with zod on server startup

## Conventions

### Svelte 5

This project uses Svelte 5 with runes. Follow these patterns:

- Component props: `let { prop1, prop2 }: Props = $props()`
- Reactive state: `$state()`, derived values: `$derived()` or `$derived.by(() => ...)`
- Side effects: `$effect()`
- **Never name a variable `state`** — it conflicts with the `$state` rune. Use `cal`, `store`, or a descriptive name instead
- Reactive state class pattern: class with `$state` fields and getter properties (see `src/lib/stores/calendar.svelte.ts`)
- Component callbacks: use `onchange`, `onclick` etc. (lowercase, Svelte 5 style), not `on:change`

### TypeScript

- Strict mode enabled
- zod v4 for validation — import from `zod/v4` (not `zod`)
- Types in `src/lib/types/`, server code in `src/lib/server/`

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no PostCSS config)
- Custom theme tokens defined in `src/app.css` under `@theme { }`
- Custom colours: `bg`, `surface`, `text`, `text-secondary`, `text-tertiary`, `border`, `border-light`, `today-bg`, `now-line`
- Calendar source colours are **dynamic** (from config) — use inline `style` attributes, not Tailwind classes
- Inter font (400, 500, 600 weights) via `@fontsource/inter`

### ical.js

- Use `ICAL.parse()` to parse iCal text, then `new ICAL.Component(parsed)` to create a component
- Use `ICAL.Event` with `.iterator(startTime)` for RRULE expansion
- Skip events with RECURRENCE-ID in the iteration loop — they're handled automatically by the iterator
- No built-in types — minimal type definitions are in `src/lib/types/ical.d.ts`
- Raw parsed iCal data is cached; RRULE expansion happens per-request (expansion is fast, HTTP fetch is slow)

### Date Handling

- All timezone conversion happens **server-side** — the client is timezone-unaware
- Use `date-fns` and `date-fns-tz` (not native Date methods for formatting)
- Date helpers and constants live in `src/lib/utils/date-helpers.ts`
- Events use ISO 8601 strings for JSON serialisation; parse with `parseISO()` on the client
- iCal RFC 5545: All-day events use exclusive DTEND — event ending on Feb 15 shows only on Feb 14

### Spanning Events

- Multi-day and all-day events in Week+Next, 4-Week, and Month views render as horizontal bars spanning day columns
- Shared logic is in `src/lib/utils/spanning-events.ts`
- Events spanning week boundaries appear as separate bars per week row (like Google Calendar)
- Row-packing algorithm minimizes vertical space by placing non-overlapping events on the same row

## Project Status

### Working

- iCal feed fetching, parsing, and caching via ical.js (tested with Google Calendar)
- Recurring event expansion (RRULE, EXDATE, RECURRENCE-ID overrides)
- `GET /api/events` endpoint
- SSR initial data load
- Four views: Week, Week+Next, 4-Week, Month
- Week view: time-grid with proportional positioning, overlapping events side-by-side, adaptive height display
- Week+Next view: current week time-grid plus simplified next week with spanning events
- 4-Week and Month views: day grid with spanning multi-day event bars
- Agenda panel (collapsible, configurable days)
- Calendar visibility toggle via legend
- View switching and date navigation
- View persistence to localStorage
- Client-side polling for auto-refresh
- Production build via adapter-node

### Needs Attention

- Responsive layout for narrow screens (agenda currently hidden below `md` breakpoint)
- No error UI shown to the user on fetch failures (errors are logged to console)

### Not Yet Built

- Touchscreen interactivity
- Dark mode
- OAuth-based calendar integration
- Cloud deployment / auth
