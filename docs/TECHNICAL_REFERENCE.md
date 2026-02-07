# Blair Board - Technical Reference

Complete technical documentation for developers working on Blair Board.

---

## Table of Contents

- [What Is It](#what-is-it)
- [Requirements](#requirements)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Data Flow](#data-flow)
  - [Server-Side](#server-side)
  - [Client-Side](#client-side)
  - [iCal Feed Syncing and Caching](#ical-feed-syncing-and-caching)
- [Configuration](#configuration)
- [Key Types](#key-types)
- [Design Decisions](#design-decisions)
- [File Map](#file-map)
- [Known Gotchas](#known-gotchas)
- [Future Plans](#future-plans)

---

## What Is It

A family kitchen dashboard web app that displays multiple calendars from various sources (Google Calendar, Apple/iCloud, Outlook, etc.) in a single glanceable interface. Inspired by dedicated hardware products like [Skylight](https://uk.myskylight.com/) and [Cozyla](https://www.cozyla.com/), but running as a self-hosted web app accessible from any browser.

Currently read-only. Future plans include touchscreen interactivity.

---

## Requirements

- **Calendar sources**: 5+ iCal feeds (any provider that exposes a public `.ics` URL), each with a configurable display colour
- **Views**: Four view options (week, week+next, 4-week, month) with a collapsible agenda sidebar
- **Week view**: Full time-grid with events positioned proportionally on a vertical time axis (configurable hours), all-day events in a bar above, overlapping events displayed side-by-side
- **Week+Next view**: Current week time-grid plus simplified next week preview with spanning events
- **4-Week view**: Four-week overview grid with spanning multi-day events
- **Month view**: Traditional grid with spanning multi-day event bars and stacked single-day events, "+N more" overflow
- **Agenda panel**: Shows events for today + tomorrow (configurable) in a scrolling list, grouped by day
- **Event display**: Title + time only (minimal)
- **Auto-refresh**: Client polls the server every N minutes for updated data
- **Design**: Clean and minimal, light mode only, Inter font, optimised for at-a-glance readability
- **Locale defaults**: Europe/London timezone, 24h clock, Monday week start, DD/MM/YYYY

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | SvelteKit 2 + Svelte 5 | Uses runes (`$state`, `$derived`, `$effect`, `$props`) |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` plugin, custom theme in `src/app.css` |
| Font | Inter | Self-hosted via `@fontsource/inter` |
| iCal parsing | `ical.js` | Handles RRULE expansion, EXDATE, RECURRENCE-ID overrides |
| Date utilities | `date-fns` + `date-fns-tz` | Timezone conversion, formatting, date math |
| Config validation | `zod` v4 | Import path is `zod/v4` |
| Adapter | `@sveltejs/adapter-node` | Produces standalone Node.js server |
| Package manager | pnpm | esbuild build scripts must be approved (`pnpm rebuild esbuild`) |

---

## Architecture

### Data Flow

```
iCal feeds (HTTP)
    |
    v
calendar-fetcher.ts ──> raw iCal data cached in-memory (TTL per source)
    |
    v                    RRULE expansion happens per-request from cached raw data
    |                    Timezone conversion to configured TZ happens server-side
    v
GET /api/events ──────> JSON response: { events: CalendarEvent[], config: ClientConfig }
    |                    (iCal URLs stripped from config for security)
    v
+page.server.ts ──────> SSR initial load (instant first paint, no loading spinner)
    |
    v
+page.svelte ─────────> CalendarState (rune-based class) manages all UI state
    |                    Polls /api/events every N minutes via setInterval
    |                    Persists view selection and hidden calendars to localStorage
    v
Components ───────────> CalendarWeek / CalendarWeekNext / CalendarMonth / AgendaPanel
```

### Server-Side

- **Config** ([`src/lib/server/config.ts`](../src/lib/server/config.ts)): Reads `config.json` from the project root, validates with zod, caches in a module-level variable
- **Cache** ([`src/lib/server/cache.ts`](../src/lib/server/cache.ts)): Generic `TTLCache<T>` class using a `Map` with timestamps. Module-level singleton persists across requests in the Node adapter
- **Calendar Fetcher** ([`src/lib/server/calendar-fetcher.ts`](../src/lib/server/calendar-fetcher.ts)): Core logic. Fetches iCal feeds via `ical.js`, caches raw parsed data, expands recurring events within the requested date range using `ICAL.Event.iterator()`, converts all times to the configured timezone, normalises to `CalendarEvent[]`. Uses `Promise.allSettled` so one failing feed doesn't break the others
- **API Endpoint** ([`src/routes/api/events/+server.ts`](../src/routes/api/events/+server.ts)): Accepts `?view=week|weeknext|4week|month&date=ISO`. Computes the date range (extends to cover both the calendar view and the agenda panel), calls the fetcher, strips iCal URLs from the config before responding

### Client-Side

- **Reactive State** ([`src/lib/stores/calendar.svelte.ts`](../src/lib/stores/calendar.svelte.ts)): A `CalendarState` class using Svelte 5 runes. Manages `events`, `currentView`, `referenceDate`, `loading`, `error`, `config`, `hiddenCalendarIds`, `agendaVisible`. Exposes derived getters: `agendaEvents`, `calendarViewEvents`, `visibleEvents`, `periodLabel`, `weekStartsOn`. Has methods for navigation (`navigatePrevious/Next/Today`), view switching, calendar visibility toggling, and fetching. Persists view selection, hidden calendars, and agenda visibility to localStorage
- **Page** ([`src/routes/+page.svelte`](../src/routes/+page.svelte)): Initialises state from SSR data, sets up polling via `onMount`, re-fetches on view/date changes via `$effect`
- **Components**: `CalendarWeek`, `CalendarWeekNext`, `CalendarMonth`, `AgendaPanel`, `EventChip`, `DayColumn`, `NextWeekDay`, `MonthDay`, `ViewSwitcher`, `DateNavigation`, `CalendarLegend`

### iCal Feed Syncing and Caching

Blair Board uses a **two-tier caching architecture** to minimize network requests to external calendar providers while keeping the UI up-to-date.

#### Server-Side Caching

**Raw iCal Caching**

The server maintains an in-memory `TTLCache` that stores **raw iCal feed text** (not parsed events):

```typescript
const rawCache = new TTLCache<string>();
```

**Cache behavior**:
- Each calendar source is cached by its `id`
- Cache entries expire after `serverCacheTTLMinutes` (default: 15 minutes)
- When a cache entry expires, it's automatically deleted on next access
- Cache invalidation happens lazily (on read) rather than actively

**Why cache raw text instead of parsed events?**
- Event expansion depends on the requested date range
- Different views need different date ranges
- Parsing and RRULE expansion is fast (~10-50ms)
- HTTP fetches are slow (~200-2000ms)

**iCal Fetching and Processing**

When the API endpoint receives a request:

1. **Fetch or retrieve from cache**:
   ```typescript
   let rawData = rawCache.get(source.id);
   if (!rawData) {
     const response = await fetch(source.url);
     rawData = await response.text();
     rawCache.set(source.id, rawData, ttlMs);
   }
   ```

2. **Parse with ical.js**:
   ```typescript
   const jcalData = ICAL.parse(icalData);
   const comp = new ICAL.Component(jcalData);
   const vevents = comp.getAllSubcomponents('vevent');
   ```

3. **Expand recurring events**:
   - For each VEVENT, create an `ICAL.Event` instance
   - Skip RECURRENCE-ID overrides (handled automatically by ical.js)
   - For recurring events, use `event.iterator()` to expand RRULE instances
   - Limit expansion to the requested date range (+ safety limit of 5000 iterations)

4. **Convert timezones**:
   - All events are converted to the configured timezone (default: `Europe/London`)
   - This happens **server-side only** — the client is timezone-unaware

5. **Return formatted events**:
   - Events are serialized as JSON with ISO 8601 date strings
   - Each event includes: `id`, `title`, `start`, `end`, `allDay`, `colour`, `calendarId`, `calendarName`

**Multi-Calendar Fetching**

All enabled calendars are fetched **in parallel** using `Promise.allSettled`:

```typescript
const results = await Promise.allSettled(
  sources
    .filter((s) => s.enabled)
    .map(async (source) => {
      // Fetch and expand each calendar
    })
);
```

This ensures:
- One slow/failing calendar doesn't block others
- Maximum parallelism for faster overall fetch times
- Graceful error handling (logged to console, doesn't crash the app)

#### Client-Side Architecture

**Initial Server-Side Rendering (SSR)**

On first page load, SvelteKit pre-renders the calendar with data fetched server-side:

- Uses the **4-week view** to calculate the date range (ensures enough data for any persisted view)
- Extends the range to cover the agenda panel (`agendaDays` forward from today)
- Fetches events via `fetchCalendarEvents()`
- Returns events and sanitized client config (iCal URLs stripped for security)

**Why 4-week view for SSR?**
- The user's selected view is stored in localStorage
- Server can't access localStorage during SSR
- 4-week view covers the widest possible range, ensuring data is available regardless of the user's persisted view preference

**Client-Side Polling**

After initial render, the client polls the `/api/events` endpoint periodically:

```typescript
setInterval(() => {
  cal.fetchEvents(cal.currentView, cal.referenceDate);
}, config.refresh.clientPollIntervalMinutes * 60 * 1000);
```

**Polling behavior**:
- Default interval: 5 minutes (`clientPollIntervalMinutes`)
- Fetches events for the **current view and date range**
- Uses `GET /api/events?view={view}&date={date}` endpoint
- Updates the `CalendarState` reactive store, triggering UI re-render

**Manual Refresh on View/Date Changes**

The client **immediately** fetches fresh data when:
- User switches views (Week → Month, etc.)
- User navigates to a different date (Previous/Next/Today buttons)

This ensures the UI always has data for the currently visible range, even if the cache doesn't cover it yet.

#### Data Flow Example

Here's how data flows through the system over time:

**T+0 (Initial page load)**
1. User visits `http://localhost:5173`
2. SvelteKit SSR runs `+page.server.ts`
3. Server calculates 4-week date range
4. Server fetches iCal feeds (cache miss → HTTP fetch)
5. Server caches raw iCal text (TTL: 15 minutes)
6. Server expands recurring events for 4-week range
7. Server converts to Europe/London timezone
8. HTML rendered with event data

**T+30s (User switches to Month view)**
1. User clicks "Month" button
2. Client calls `GET /api/events?view=month&date=2025-02-07`
3. Server calculates month date range
4. Server checks cache (cache hit → uses cached iCal text)
5. Server expands events for month range (~10-50ms)
6. Client receives events and updates UI

**T+5m (Automatic poll)**
1. Client's polling timer fires
2. Client calls `GET /api/events?view=month&date=2025-02-07`
3. Server checks cache (cache hit → uses cached iCal text)
4. Server expands events for month range
5. Client receives events (may include newly added events if upstream calendar changed)
6. UI updates if events changed

**T+15m (Cache expiry)**
1. Server cache TTL expires (entry deleted on next access)
2. User navigates to next month
3. Client calls `GET /api/events?view=month&date=2025-03-07`
4. Server checks cache (cache miss → HTTP fetch to Google Calendar, etc.)
5. Server caches fresh iCal text (TTL: 15 minutes)
6. Server expands events for new month range
7. Client receives events and updates UI

#### Performance Characteristics

**Cache Hit (Typical)**
- **Time**: 10-50ms
- **Operations**: Parse iCal → Expand RRULE → Convert timezone → JSON serialize
- **Network**: None (uses cached iCal text)

**Cache Miss (Every 15 minutes per calendar)**
- **Time**: 200-2000ms (depends on external calendar provider latency)
- **Operations**: HTTP fetch → Cache store → Parse → Expand → Convert → Serialize
- **Network**: 1 request per enabled calendar source

**Multi-Calendar Fetching**
- **Parallelism**: All calendars fetched simultaneously via `Promise.allSettled`
- **Total time**: Limited by slowest calendar (not sum of all calendars)

#### Common Troubleshooting Scenarios

**"My calendar updated but Blair Board doesn't show it"**

**Possible causes**:
1. **Server cache hasn't expired yet**: Wait up to `serverCacheTTLMinutes` (default: 15 minutes)
2. **Client hasn't polled yet**: Wait up to `clientPollIntervalMinutes` (default: 5 minutes)

**Solution**: Manually refresh the page to force SSR + cache bypass

**"Events show in wrong timezone"**

**Cause**: Timezone mismatch between `config.json` and your actual location

**Solution**: Update `timezone` in `config.json` to match your local timezone

**"Recurring events missing or incorrect"**

**Possible causes**:
1. **ical.js parsing error**: Check server console for errors
2. **RRULE edge case**: Some complex recurrence rules may not expand correctly
3. **RECURRENCE-ID override**: Verify the iCal feed is correctly formatted per RFC 5545

**Solution**: Check server logs, verify iCal feed with a validator like https://icalendar.org/validator.html

**"Server load spikes every 15 minutes"**

**Cause**: Cache TTL expiry causes all calendars to refetch simultaneously

**Solutions**:
1. Increase `serverCacheTTLMinutes` (reduces fetch frequency)
2. Implement staggered cache expiry (future enhancement)
3. Use a persistent cache (Redis, etc.) instead of in-memory cache (future enhancement)

---

## Configuration

All configuration lives in `config.json` at the project root (gitignored). See `config.example.json` for the schema.

| Section | Key | Type | Default | Description |
|---------|-----|------|---------|-------------|
| `calendars[]` | `id` | string | - | Unique identifier |
| | `name` | string | - | Display name |
| | `url` | string (URL) | - | iCal feed URL |
| | `colour` | string (hex) | - | CSS colour for events |
| | `enabled` | boolean | - | Whether to show this calendar |
| `display` | `defaultView` | `"week"` / `"weeknext"` / `"4week"` / `"month"` | `"week"` | Initial view on load |
| | `agendaDays` | number (1-14) | `2` | Days shown in agenda panel |
| | `weekStartsOn` | `0` / `1` | `1` | 0 = Sunday, 1 = Monday |
| | `timeFormat` | `"12h"` / `"24h"` | `"24h"` | Clock format |
| | `gridStartHour` | number (0-23) | `6` | Time grid start hour |
| | `gridEndHour` | number (1-24) | `22` | Time grid end hour |
| `refresh` | `clientPollIntervalMinutes` | number | `5` | Client polling frequency |
| | `serverCacheTTLMinutes` | number | `15` | Server-side cache duration |
| `timezone` | - | string (IANA) | `"Europe/London"` | Display timezone |

---

## Key Types

```typescript
// src/lib/types/events.ts
interface CalendarEvent {
  id: string;           // UID (+ instance timestamp for recurring)
  title: string;        // iCal SUMMARY
  start: string;        // ISO 8601
  end: string;          // ISO 8601
  allDay: boolean;
  colour: string;       // Hex from calendar config
  calendarId: string;
  calendarName: string;
}

// src/lib/types/config.ts — ClientConfig (sent to browser, no iCal URLs)
interface ClientConfig {
  display: DisplayConfig;
  calendars: Array<{ id: string; name: string; colour: string; enabled: boolean }>;
  refresh: RefreshConfig;
  timezone: string;
}
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **iCal feeds** (not Google Calendar API) | Keeps it source-agnostic (Google, Apple, Outlook all work). No OAuth complexity for multiple accounts. Simpler to set up. |
| **ical.js** (not node-ical) | node-ical has a bug where RECURRENCE-ID overrides (with higher SEQUENCE numbers) cause the base recurring event to be ignored. ical.js handles this correctly via `ICAL.Event.iterator()`. |
| **Server-side RRULE expansion** | Client stays simple — only deals with flat event objects. No need to ship ical.js to the browser. Raw iCal data is cached; expansion per request is fast in-memory. |
| **Server-side timezone conversion** | Dashboard always shows home timezone. Client is TZ-unaware. |
| **Polling** (not SSE/WebSockets) | Calendar data changes infrequently (minutes, not seconds). Simpler to implement and debug. No persistent connection management. Cloud-migration friendly. |
| **JSON config file** (not DB) | Single-household app. No auth/multi-user needed yet. Simple to edit. |
| **Inline styles for calendar colours** | Tailwind can't handle arbitrary runtime colour values in class names. Event chips use `style="border-left-color: {colour}"`. |
| **CalendarState class** (not context/stores) | Svelte 5 runes work naturally in classes. Single instance per page. No need for context propagation — passed as props or used directly. |
| **Per-week-row spanning** | Multi-day events in month/4-week views are rendered as separate bars for each week row they span (like Google Calendar). Simpler than full grid spanning and avoids complex wrap calculations. |

---

## File Map

```
blair-board/
├── config.json                          # Runtime config (gitignored)
├── config.example.json                  # Template for setup
├── docs/                                # Documentation
│   ├── CLAUDE.md                        # Instructions for Claude Code
│   ├── REFACTORING_PLAN.md              # Identified refactoring opportunities
│   └── TECHNICAL_REFERENCE.md           # This file
├── src/
│   ├── app.css                          # Tailwind v4 + theme tokens
│   ├── app.html                         # HTML shell
│   ├── app.d.ts                         # SvelteKit app types
│   ├── routes/
│   │   ├── +layout.svelte               # Root layout (imports CSS, sets title)
│   │   ├── +page.svelte                 # Main dashboard (all UI assembled here)
│   │   ├── +page.server.ts              # SSR data loader
│   │   └── api/events/+server.ts        # GET endpoint for calendar data
│   └── lib/
│       ├── components/
│       │   ├── AgendaPanel.svelte        # Today + tomorrow event list sidebar
│       │   ├── CalendarLegend.svelte     # Colour swatches (clickable to toggle)
│       │   ├── CalendarMonth.svelte      # Month/4-week grid view with spanning events
│       │   ├── CalendarWeek.svelte       # Time-grid week view
│       │   ├── CalendarWeekNext.svelte   # Week + simplified next week preview
│       │   ├── DateNavigation.svelte     # Prev / Today / Next + period label
│       │   ├── DayColumn.svelte          # Single day in week view (time axis)
│       │   ├── EventChip.svelte          # Single event: colour dot + time + title
│       │   ├── MonthDay.svelte           # Single cell in month/4-week grid
│       │   ├── NextWeekDay.svelte        # Single day cell in next-week preview
│       │   └── ViewSwitcher.svelte       # View toggle (Week/Week+/4Week/Month)
│       ├── server/
│       │   ├── cache.ts                  # Generic in-memory TTL cache
│       │   ├── calendar-fetcher.ts       # iCal fetch, RRULE expansion, normalisation
│       │   └── config.ts                 # Reads + validates config.json
│       ├── stores/
│       │   └── calendar.svelte.ts        # Svelte 5 rune-based reactive state class
│       ├── types/
│       │   ├── config.ts                 # Zod schemas + TypeScript types for config
│       │   ├── events.ts                 # CalendarEvent interface
│       │   └── ical.d.ts                 # Minimal type definitions for ical.js
│       └── utils/
│           ├── date-helpers.ts           # Date math, formatting, time grid constants
│           └── spanning-events.ts        # Shared logic for multi-day event spanning
├── svelte.config.js                     # adapter-node config
├── vite.config.ts                       # Tailwind + SvelteKit plugins
├── tsconfig.json
└── package.json
```

---

## Known Gotchas

- **Svelte 5 `$state` rune conflict**: Never name a variable `state` — it conflicts with the `$state` rune. Use `cal`, `store`, etc.
- **zod v4 import path**: Must import from `zod/v4`, not `zod`
- **ical.js has no built-in types**: Minimal type definitions are in `src/lib/types/ical.d.ts`
- **ical.js RECURRENCE-ID handling**: Skip events with RECURRENCE-ID in the iteration loop — they're handled automatically by the iterator
- **Homebrew Node.js + icu4c**: Upgrading icu4c breaks Node. Fix with `brew reinstall node`.
- **pnpm + esbuild**: esbuild's postinstall script needs approval. Run `pnpm rebuild esbuild` after fresh install.
- **Calendar colours**: Applied via inline `style` attributes, not Tailwind classes (Tailwind can't handle arbitrary runtime colours).
- **iCal RFC 5545 all-day events**: All-day events use exclusive DTEND — an event ending on Feb 15 only shows on Feb 14.

---

## Future Plans

These are not yet implemented but were considered in the architecture:

- **OAuth-based Google Calendar API**: Add `authType` field to `CalendarSourceConfig` and dispatch to iCal or OAuth fetcher. Cache and client layers stay the same.
- **Touchscreen interactivity**: Event detail popups, quick actions, drag-to-create
- **Dark mode / day-night switching**: Theme uses CSS custom properties — add `@media (prefers-color-scheme: dark)` or class-based override
- **Cloud deployment with auth**: Switch to cloud adapter, add auth layer
- **Additional calendar sources**: Apple/iCloud and Outlook are already supported via iCal. Native API integration could be added similarly to OAuth.
- **Staggered cache expiry**: Offset TTLs for each calendar to avoid thundering herd
- **Persistent cache**: Use Redis or file-based cache to survive server restarts
- **Incremental updates**: Support iCal `SEQUENCE` and `LAST-MODIFIED` to detect changes
- **Push notifications**: Webhook-based updates instead of polling (requires calendar provider support)
- **Client-side cache**: Cache events in browser to reduce server load during rapid view switching
- **Smart polling**: Increase/decrease poll interval based on time of day or activity
