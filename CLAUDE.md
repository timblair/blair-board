# Blair Board — Claude Code Instructions

## Commands

- `pnpm dev` — start dev server (http://localhost:5173)
- `pnpm check` — TypeScript + Svelte type checking (run after changes)
- `pnpm build` — production build (outputs to `build/`)
- `node build/index.js` — run production server (port 3000)
- `pnpm rebuild esbuild` — fix esbuild after fresh `pnpm install`

## Architecture at a Glance

See `CONTEXT.md` for full details. The short version:

- **Server** fetches iCal feeds via `node-ical`, caches raw data in-memory (TTL), expands recurring events per-request, converts timezones, serves via `GET /api/events`
- **Client** renders from SSR data on first paint, then polls `/api/events` every N minutes. All UI state lives in a `CalendarState` class using Svelte 5 runes
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

### node-ical

- `ParameterValue` fields (e.g. `summary`) can be a string or `{ params, val }` — always use `getParameterValue()` helper in `calendar-fetcher.ts`
- `expandRecurringEvent()` returns instances with `.isFullDay`, `.summary`, `.start`, `.end`
- Raw parsed iCal data is cached; RRULE expansion happens per-request (expansion is fast, HTTP fetch is slow)

### Date Handling

- All timezone conversion happens **server-side** — the client is timezone-unaware
- Use `date-fns` and `date-fns-tz` (not native Date methods for formatting)
- Date helpers and constants live in `src/lib/utils/date-helpers.ts`
- Events use ISO 8601 strings for JSON serialisation; parse with `parseISO()` on the client

## Project Status

### Working

- iCal feed fetching, parsing, and caching (tested with Google Calendar)
- Recurring event expansion (RRULE, EXDATE)
- `GET /api/events` endpoint
- SSR initial data load
- Week view (time-grid with proportional positioning)
- Month view (day grid with event chips)
- Agenda panel (today + tomorrow)
- View switching (week/month) and date navigation
- Client-side polling for auto-refresh
- Production build via adapter-node

### Needs Attention

- Visual polish — the layout is functional but hasn't been refined with real multi-calendar data
- Overlapping events in week view — no side-by-side handling yet
- Multi-day event spanning in week view all-day bar
- Responsive layout for narrow screens (agenda currently hidden below `md` breakpoint)
- No error UI shown to the user on fetch failures (errors are logged to console)

### Not Yet Built

- Touchscreen interactivity
- Dark mode
- OAuth-based calendar integration
- Cloud deployment / auth
