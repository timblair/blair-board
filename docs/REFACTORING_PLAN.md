# Blair Board - Codebase Refactoring Plan

This plan identifies opportunities to reduce duplication, simplify complex patterns, and improve maintainability based on a comprehensive review of the codebase, commit history, and documentation.

**Last updated**: 2025-02-07

---

## Summary

Based on exploration of the codebase, commit history, and documentation, several patterns of duplication and complexity were identified. This plan prioritizes consolidation improvements that reduce code duplication without architectural changes.

**Total estimated line savings**: ~150+ lines of duplicated code

---

## Recent Changes Since Plan Creation

The following changes have been made since the initial plan was created:

1. **Styling updates** (feature/improve-contrast): Updated all event chips to use `text-sm`, `{colour}30` background opacity, `3px` border, and `0.5` opacity for past events
2. **Consistent spacing** (feature/improve-contrast): Unified 4px gaps between events across all views, `SPANNING_ROW_HEIGHT` now 1.625rem
3. **Now line feature** (feature/now-line): Added current time indicator to Week and Week+Next views
4. **Height thresholds** (feature/fix-event-height-thresholds): Two-line format threshold increased to 43px
5. **Text styling** (feature/unify-text-styling): Times use `text-text-secondary` consistently

The duplication patterns identified below still exist and would benefit from consolidation.

---

## High Priority

### 1. Create Shared Event Bar Component

**Problem**: Event bar styling (the colored background with left border style) is duplicated across calendar view components with identical patterns:
- `src/lib/components/CalendarMonth.svelte` (spanning bars)
- `src/lib/components/CalendarWeekNext.svelte` (spanning bars + next week events)
- `src/lib/components/MonthDay.svelte` (single-day events)
- `src/lib/components/NextWeekDay.svelte` (single-day events)
- `src/lib/components/DayColumn.svelte` (week view events)

**Note**: `EventChip.svelte` uses a different visual style (dot + text) for the Agenda panel and should remain separate.

**Pattern being duplicated** (~10 lines each):
```svelte
<div
  class="text-sm px-1.5 py-0.5 rounded truncate cursor-default"
  style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.5 : 1}"
  title={event.title}
>
  <span class="text-text-secondary tabular-nums">{formatTimeCompact(...)}</span>
  <span class="font-semibold">{event.title}</span>
</div>
```

**Solution**: Create `EventBar.svelte` as the shared component for calendar view event chips:

```svelte
<!-- src/lib/components/EventBar.svelte -->
<script lang="ts">
  import type { CalendarEvent } from '$lib/types/events';
  import { formatTimeCompact, formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

  interface Props {
    event: CalendarEvent;
    timeFormat?: '12h' | '24h';
    showTime?: boolean;           // false for all-day or spanning bars
    timeStyle?: 'compact' | 'range';  // compact = "14:00", range = "14:00 – 15:00"
    variant?: 'default' | 'spanning';
  }

  let { event, timeFormat = '24h', showTime = true, timeStyle = 'compact', variant = 'default' }: Props = $props();
  let isPast = $derived(isEventPast(event.end));
</script>

<div
  class="text-sm px-1.5 py-0.5 rounded truncate cursor-default"
  class:mx-0.5={variant === 'spanning'}
  style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isPast ? 0.5 : 1}"
  title="{showTime && !event.allDay ? formatTimeRange(event.start, event.end, timeFormat) + ': ' : ''}{event.title}"
>
  {#if showTime && !event.allDay}
    <span class="text-text-secondary tabular-nums">
      {timeStyle === 'range' ? formatTimeRange(event.start, event.end, timeFormat) : formatTimeCompact(event.start, timeFormat)}
    </span>
  {/if}
  <span class="font-semibold">{event.title}</span>
</div>
```

**Files to update**:
- New: `src/lib/components/EventBar.svelte`
- Update: `MonthDay.svelte`, `NextWeekDay.svelte`, `CalendarMonth.svelte`, `CalendarWeekNext.svelte`
- Note: `DayColumn.svelte` has adaptive height logic and may need a specialized variant

**Estimated impact**: Removes ~50 lines of duplicated styling code, centralizes event display logic.

---

### 2. Create Shared Spanning Event Bar Component

**Problem**: Spanning event bar rendering is duplicated in `CalendarMonth.svelte` and `CalendarWeekNext.svelte` with nearly identical positioning logic (~20 lines each).

**Pattern being duplicated**:
```svelte
{#each packedEvents as { event, startCol, span, row } (event.id)}
  <div
    class="absolute pointer-events-auto z-10"
    style="
      left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
      width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
      top: {row * SPANNING_ROW_HEIGHT + 0.25}rem;
    "
  >
    <div
      class="text-sm px-1.5 py-0.5 mx-0.5 rounded truncate cursor-default"
      style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.5 : 1}"
    >
      <span class="font-semibold">{event.title}</span>
    </div>
  </div>
{/each}
```

**Solution**: Create `SpanningEventBar.svelte`:

```svelte
<!-- src/lib/components/SpanningEventBar.svelte -->
<script lang="ts">
  import type { PackedSpanningEvent } from '$lib/utils/spanning-events';
  import { SPANNING_ROW_HEIGHT } from '$lib/utils/spanning-events';
  import { formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

  interface Props {
    packed: PackedSpanningEvent;
    topOffset?: number;  // additional rem offset (e.g., for month view header)
    timeFormat?: '12h' | '24h';
  }

  let { packed, topOffset = 0, timeFormat = '24h' }: Props = $props();
  const { event, startCol, span, row } = packed;
</script>

<div
  class="absolute pointer-events-auto z-10"
  style="
    left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
    width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
    top: calc({topOffset}rem + {row * SPANNING_ROW_HEIGHT + 0.25}rem);
  "
>
  <div
    class="text-sm px-1.5 py-0.5 mx-0.5 rounded truncate cursor-default"
    style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.5 : 1}"
    title="{event.allDay ? 'All day' : formatTimeRange(event.start, event.end, timeFormat)}: {event.title}"
  >
    <span class="font-semibold">{event.title}</span>
  </div>
</div>
```

**Files to update**:
- New: `src/lib/components/SpanningEventBar.svelte`
- Update: `src/lib/components/CalendarMonth.svelte`
- Update: `src/lib/components/CalendarWeekNext.svelte`

**Estimated impact**: Removes ~40 lines of duplicated positioning code, centralizes spanning bar logic.

---

### 3. Extract Dynamic Visibility Calculation Utility

**Problem**: Nearly identical visibility calculation logic (~40 lines) exists in both `MonthDay.svelte` and `NextWeekDay.svelte`. Both use ResizeObserver to determine how many events fit in a container.

**Current pattern** (duplicated in both files):
```typescript
$effect(() => {
  if (!containerEl || !eventsContainerEl) return;

  const updateVisibility = () => {
    const containerHeight = containerEl!.clientHeight;
    const headerHeight = 30;
    const moreIndicatorHeight = 20;
    const spanningHeight = spanRows * spanningRowHeight * 16;
    const available = containerHeight - headerHeight - spanningHeight;

    // ... measurement and calculation logic
  };

  updateVisibility();
  const resizeObserver = new ResizeObserver(updateVisibility);
  resizeObserver.observe(containerEl!);
  return () => resizeObserver.disconnect();
});
```

**Solution**: Create a reusable utility:

```typescript
// src/lib/utils/visibility-calculator.ts
interface VisibilityOptions {
  headerHeight: number;
  moreIndicatorHeight: number;
  spanningHeight: number;
  eventHeight?: number;  // auto-measured if not provided
}

export function createVisibilityCalculator(
  containerEl: HTMLElement,
  eventsContainerEl: HTMLElement,
  eventCount: number,
  options: VisibilityOptions
): { maxVisible: number; cleanup: () => void } {
  // Shared calculation logic
  // Returns cleanup function for ResizeObserver
}
```

**Files to update**:
- New: `src/lib/utils/visibility-calculator.ts`
- Update: `src/lib/components/MonthDay.svelte`
- Update: `src/lib/components/NextWeekDay.svelte`

**Estimated impact**: Removes ~40 lines of duplicated visibility logic, easier to maintain and test.

---

## Medium Priority

### 4. Consolidate localStorage Persistence Patterns

**Problem**: `CalendarState` in `src/lib/stores/calendar.svelte.ts` has 3 identical patterns for localStorage persistence:
- `currentView` with `localStorage.getItem/setItem('calendar-view', ...)`
- `hiddenCalendarIds` with `localStorage.getItem/setItem('calendar-hidden', ...)`
- `agendaVisible` with `localStorage.getItem/setItem('calendar-agenda-visible', ...)`

Each follows the same pattern: load in constructor, save in setter, with try/catch and JSON parse/stringify.

**Solution**: Create a generic persisted state helper:

```typescript
// src/lib/utils/persisted-state.ts
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail on storage errors
  }
}

// Or as a rune-compatible pattern:
export function createPersistedState<T>(key: string, defaultValue: T) {
  let value = $state(loadFromStorage(key, defaultValue));

  return {
    get value() { return value; },
    set value(v: T) {
      value = v;
      saveToStorage(key, v);
    }
  };
}
```

**Files to update**:
- New: `src/lib/utils/persisted-state.ts`
- Update: `src/lib/stores/calendar.svelte.ts`

**Estimated impact**: Removes ~30 lines of repetitive localStorage code, provides consistent error handling.

---

### 5. Create Date Parsing Helper

**Problem**: The pattern `typeof date === 'string' ? parseISO(date) : date` appears 10+ times throughout the codebase.

**Locations found**:
- `src/lib/utils/date-helpers.ts` (multiple functions)
- `src/lib/utils/spanning-events.ts`
- Various component files when processing event dates

**Solution**: Add a utility function to `src/lib/utils/date-helpers.ts`:

```typescript
/**
 * Ensures a value is a Date object, parsing ISO strings if necessary.
 */
export function ensureDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}
```

Then replace all instances of the inline pattern with `ensureDate(date)`.

**Files to update**:
- Update: `src/lib/utils/date-helpers.ts` (add function)
- Update: All files using the inline pattern

**Estimated impact**: Removes ~20 instances of inline type checking, improves readability.

---

### 6. Consolidate Single-Day Event Filtering

**Problem**: Single-day event filtering for a specific day is duplicated in `CalendarMonth.svelte` and `CalendarWeekNext.svelte`:

```typescript
function singleDayEventsForDay(singleDayEvents: CalendarEvent[], day: Date): CalendarEvent[] {
  return singleDayEvents
    .filter((e) => {
      const start = parseISO(e.start);
      const end = parseISO(e.end);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return start <= dayEnd && end > dayStart;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
```

**Solution**: Move to `src/lib/utils/spanning-events.ts`:

```typescript
export function getSingleDayEventsForDay(
  singleDayEvents: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return singleDayEvents
    .filter((e) => {
      const start = ensureDate(e.start);
      const end = ensureDate(e.end);
      return start <= dayEnd && end > dayStart;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
```

**Files to update**:
- Update: `src/lib/utils/spanning-events.ts` (add function)
- Update: `src/lib/components/CalendarMonth.svelte` (use shared function)
- Update: `src/lib/components/CalendarWeekNext.svelte` (use shared function)

**Estimated impact**: Removes ~16 lines of duplicated filtering logic.

---

## Low Priority

### 7. Simplify Navigation Logic in CalendarState

**Problem**: The navigation methods (`navigatePrevious`, `navigateNext`) in `CalendarState` have similar patterns for different views. The commit history shows multiple fixes to week boundary calculations, suggesting complexity.

**Current approach**: Switch statements that handle each view type differently.

**Potential solution**: Consider a data-driven approach:

```typescript
const VIEW_NAVIGATION: Record<CalendarView, { unit: 'weeks' | 'months'; amount: number }> = {
  week: { unit: 'weeks', amount: 1 },
  weeknext: { unit: 'weeks', amount: 1 },
  '4week': { unit: 'weeks', amount: 4 },
  month: { unit: 'months', amount: 1 }
};

navigatePrevious() {
  const { unit, amount } = VIEW_NAVIGATION[this.currentView];
  this.referenceDate = sub(this.referenceDate, { [unit]: amount });
}
```

**Estimated impact**: More maintainable navigation logic, easier to add new views.

**Note**: This is lower priority as the current implementation works. Only pursue if future bugs arise or when adding new views.

---

## Implementation Order

Recommended sequence for implementing these refactorings:

1. **EventBar component** (High Priority #1) - Foundation for other changes
2. **SpanningEventBar component** (High Priority #2) - Uses EventBar
3. **ensureDate helper** (Medium Priority #5) - Quick win, minimal risk
4. **getSingleDayEventsForDay** (Medium Priority #6) - Quick win
5. **Visibility calculator** (High Priority #3) - More complex, isolated change
6. **localStorage persistence** (Medium Priority #4) - Touches core state
7. **Navigation simplification** (Low Priority #7) - Optional polish

Each refactoring can be done as a separate commit or PR for easier review and rollback if needed.

---

## Verification Strategy

After each refactoring, verify:

1. **TypeScript**: Run `pnpm check` for type errors
2. **Visual inspection**: Check all four views (Week, Week+Next, 4-Week, Month)
3. **Spanning events**: Verify events span correctly across columns and week boundaries
4. **Past events**: Confirm 50% opacity on past events
5. **Overflow**: Verify "+X more" works in month/4-week views
6. **Now line**: Verify red time indicator appears on today's column (Week/Week+Next views)
7. **Persistence**: Check localStorage (view selection, hidden calendars, agenda visibility)
8. **Adaptive height**: Verify events switch to single-line format at 43px threshold
9. **Spacing**: Confirm 4px gaps between all event types
10. **Edge cases**:
    - All-day events
    - Multi-day events crossing week boundaries
    - Days with many events
    - Different time formats (12h/24h)
    - Events shorter than 30 minutes (single-line format)

---

## Notes

- All refactorings should be done in feature branches (per project workflow)
- No architectural changes are proposed - these are consolidation improvements
- The shared utilities approach aligns with existing codebase patterns (`spanning-events.ts`, `date-helpers.ts`)
- Consider adding unit tests for new utility functions (currently no test infrastructure)