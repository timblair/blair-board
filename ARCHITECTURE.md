# Blair Board - Architecture Documentation

## iCal Feed Syncing, Updating, and Caching

This document explains how Blair Board fetches, processes, caches, and updates iCal calendar feeds.

---

## Overview

Blair Board uses a **two-tier caching architecture**:

1. **Server-side**: Caches raw iCal feed data with a configurable TTL
2. **Client-side**: Polls the server API periodically for updated event data

This design minimizes network requests to external calendar providers while ensuring the UI stays up-to-date.

---

## Server-Side Architecture

### 1. Raw iCal Caching

**File**: [`src/lib/server/cache.ts`](src/lib/server/cache.ts)

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

### 2. iCal Fetching and Processing

**File**: [`src/lib/server/calendar-fetcher.ts`](src/lib/server/calendar-fetcher.ts)

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

### 3. Multi-Calendar Fetching

**File**: [`src/lib/server/calendar-fetcher.ts`](src/lib/server/calendar-fetcher.ts)

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

---

## Client-Side Architecture

### 1. Initial Server-Side Rendering (SSR)

**File**: [`src/routes/+page.server.ts`](src/routes/+page.server.ts)

On first page load, SvelteKit pre-renders the calendar with data fetched server-side:

- Uses the **4-week view** to calculate the date range (ensures enough data for any persisted view)
- Extends the range to cover the agenda panel (`agendaDays` forward from today)
- Fetches events via `fetchCalendarEvents()`
- Returns events and sanitized client config (iCal URLs stripped for security)

**Why 4-week view for SSR?**
- The user's selected view is stored in localStorage
- Server can't access localStorage during SSR
- 4-week view covers the widest possible range, ensuring data is available regardless of the user's persisted view preference

### 2. Client-Side Polling

**File**: [`src/routes/+page.svelte`](src/routes/+page.svelte)

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

### 3. Manual Refresh on View/Date Changes

**File**: [`src/lib/stores/calendar.svelte.ts`](src/lib/stores/calendar.svelte.ts)

The client **immediately** fetches fresh data when:
- User switches views (Week → Month, etc.)
- User navigates to a different date (Previous/Next/Today buttons)

This ensures the UI always has data for the currently visible range, even if the cache doesn't cover it yet.

### 4. API Endpoint

**File**: [`src/routes/api/events/+server.ts`](src/routes/api/events/+server.ts)

The client-facing API endpoint:

1. **Parses query parameters**:
   - `view`: CalendarView type (week, weeknext, 4week, month)
   - `date`: Optional ISO 8601 date string (defaults to today)

2. **Calculates date range**:
   - Uses `getViewRange()` to determine start/end based on view type
   - Extends range to cover agenda panel

3. **Fetches and returns events**:
   - Calls `fetchCalendarEvents()` (which uses the server cache)
   - Returns JSON: `{ events: CalendarEvent[], config: ClientConfig }`

---

## Data Flow Example

Here's how data flows through the system over time:

### T+0 (Initial page load)
1. User visits `http://localhost:5173`
2. SvelteKit SSR runs `+page.server.ts`
3. Server calculates 4-week date range
4. Server fetches iCal feeds (cache miss → HTTP fetch)
5. Server caches raw iCal text (TTL: 15 minutes)
6. Server expands recurring events for 4-week range
7. Server converts to Europe/London timezone
8. HTML rendered with event data

### T+30s (User switches to Month view)
1. User clicks "Month" button
2. Client calls `GET /api/events?view=month&date=2025-02-07`
3. Server calculates month date range
4. Server checks cache (cache hit → uses cached iCal text)
5. Server expands events for month range (~10-50ms)
6. Client receives events and updates UI

### T+5m (Automatic poll)
1. Client's polling timer fires
2. Client calls `GET /api/events?view=month&date=2025-02-07`
3. Server checks cache (cache hit → uses cached iCal text)
4. Server expands events for month range
5. Client receives events (may include newly added events if upstream calendar changed)
6. UI updates if events changed

### T+15m (Cache expiry)
1. Server cache TTL expires (entry deleted on next access)
2. User navigates to next month
3. Client calls `GET /api/events?view=month&date=2025-03-07`
4. Server checks cache (cache miss → HTTP fetch to Google Calendar, etc.)
5. Server caches fresh iCal text (TTL: 15 minutes)
6. Server expands events for new month range
7. Client receives events and updates UI

---

## Performance Characteristics

### Cache Hit (Typical)
- **Time**: 10-50ms
- **Operations**: Parse iCal → Expand RRULE → Convert timezone → JSON serialize
- **Network**: None (uses cached iCal text)

### Cache Miss (Every 15 minutes per calendar)
- **Time**: 200-2000ms (depends on external calendar provider latency)
- **Operations**: HTTP fetch → Cache store → Parse → Expand → Convert → Serialize
- **Network**: 1 request per enabled calendar source

### Multi-Calendar Fetching
- **Parallelism**: All calendars fetched simultaneously via `Promise.allSettled`
- **Total time**: Limited by slowest calendar (not sum of all calendars)

---

## Configuration Options

**File**: `config.json`

### Server Cache TTL
```json
{
  "refresh": {
    "serverCacheTTLMinutes": 15
  }
}
```

- How long to cache raw iCal feed data
- Lower = more frequent upstream fetches, fresher data, higher load on calendar providers
- Higher = fewer upstream fetches, staler data, lower load

**Recommended**: 15-30 minutes for most use cases

### Client Poll Interval
```json
{
  "refresh": {
    "clientPollIntervalMinutes": 5
  }
}
```

- How often the client polls `/api/events`
- Lower = more frequent polls, fresher UI, higher server load
- Higher = fewer polls, staler UI, lower server load

**Recommended**: 5-10 minutes for kitchen dashboard use case

### Timezone
```json
{
  "timezone": "Europe/London"
}
```

- All events are converted to this timezone server-side
- The client is timezone-unaware (displays dates as-is from server)

---

## Common Scenarios

### "My calendar updated but Blair Board doesn't show it"

**Possible causes**:
1. **Server cache hasn't expired yet**: Wait up to `serverCacheTTLMinutes` (default: 15 minutes)
2. **Client hasn't polled yet**: Wait up to `clientPollIntervalMinutes` (default: 5 minutes)

**Solution**: Manually refresh the page to force SSR + cache bypass

### "Events show in wrong timezone"

**Cause**: Timezone mismatch between `config.json` and your actual location

**Solution**: Update `timezone` in `config.json` to match your local timezone

### "Recurring events missing or incorrect"

**Possible causes**:
1. **ical.js parsing error**: Check server console for errors
2. **RRULE edge case**: Some complex recurrence rules may not expand correctly
3. **RECURRENCE-ID override**: Verify the iCal feed is correctly formatted per RFC 5545

**Solution**: Check server logs, verify iCal feed with a validator like https://icalendar.org/validator.html

### "Server load spikes every 15 minutes"

**Cause**: Cache TTL expiry causes all calendars to refetch simultaneously

**Solutions**:
1. Increase `serverCacheTTLMinutes` (reduces fetch frequency)
2. Implement staggered cache expiry (future enhancement)
3. Use a persistent cache (Redis, etc.) instead of in-memory cache (future enhancement)

---

## Future Improvements

Potential enhancements to the caching system:

1. **Staggered cache expiry**: Offset TTLs for each calendar to avoid thundering herd
2. **Persistent cache**: Use Redis or file-based cache to survive server restarts
3. **Incremental updates**: Support iCal `SEQUENCE` and `LAST-MODIFIED` to detect changes
4. **Push notifications**: Webhook-based updates instead of polling (requires calendar provider support)
5. **Client-side cache**: Cache events in browser to reduce server load during rapid view switching
6. **Smart polling**: Increase/decrease poll interval based on time of day or activity

---

## Related Files

- [`src/lib/server/cache.ts`](src/lib/server/cache.ts) - Generic TTL cache implementation
- [`src/lib/server/calendar-fetcher.ts`](src/lib/server/calendar-fetcher.ts) - iCal fetching, parsing, and expansion
- [`src/lib/server/config.ts`](src/lib/server/config.ts) - Config loading and validation
- [`src/routes/api/events/+server.ts`](src/routes/api/events/+server.ts) - Client-facing API endpoint
- [`src/routes/+page.server.ts`](src/routes/+page.server.ts) - SSR data loading
- [`src/routes/+page.svelte`](src/routes/+page.svelte) - Client polling setup
- [`src/lib/stores/calendar.svelte.ts`](src/lib/stores/calendar.svelte.ts) - Reactive state and fetch logic

---

## Key Takeaways

1. **Two-tier caching**: Server caches raw iCal text, client polls for events
2. **Server cache is smart**: Caches raw data, expands per-request to support any date range
3. **Client is simple**: No client-side cache, just periodic polling
4. **Timezone handling**: All conversions happen server-side, client is timezone-unaware
5. **Parallelism**: Multi-calendar fetching uses `Promise.allSettled` for maximum speed
6. **Graceful degradation**: One failing calendar doesn't break the entire app
7. **Configurable refresh**: Both server cache TTL and client poll interval are user-configurable
