# Blair Board - Codebase Refactoring Plan

This plan identifies opportunities to reduce duplication, simplify complex patterns, and improve maintainability based on a comprehensive review of the codebase, commit history, and documentation.

**Last updated**: 2025-02-09

---

## Summary

Based on exploration of the codebase, commit history, and documentation, several patterns of duplication and complexity were identified. This plan prioritizes consolidation improvements that reduce code duplication without architectural changes.

**Total estimated line savings**: ~60+ lines of duplicated code (revised down from ~150+ after recent consolidation work)

---

## Completed Refactorings

The following items from the original plan have been completed:

### ✅ EventBar Component (was High Priority #1)
- **Commit**: `f227e90` - "Extract shared EventBar and SpanningEventBar components"
- **Result**: `src/lib/components/EventBar.svelte` with `inline` and `stacked` layout variants
- **Impact**: Removed ~50 lines of duplicated styling code

### ✅ SpanningEventBar Component (was High Priority #2)
- **Commit**: `f227e90` - "Extract shared EventBar and SpanningEventBar components"
- **Result**: `src/lib/components/SpanningEventBar.svelte` with configurable props
- **Impact**: Removed ~40 lines of duplicated positioning code

### ✅ DayCell Consolidation (not originally planned)
- **Commit**: `0bba466` - "Consolidate NextWeekDay and MonthDay into unified DayCell component"
- **Result**: `src/lib/components/DayCell.svelte` with `variant` prop replaces both components
- **Impact**: Single location for visibility calculation and overflow logic

### ✅ ResizeHandle Component (not originally planned)
- **Commit**: `f0d5f13` - "Refactor resize handlers to use shared ResizeHandle component"
- **Result**: `src/lib/components/ResizeHandle.svelte` with `orientation` prop
- **Impact**: Removed ~51 lines of duplicate resize logic from CalendarWeekNext

---

## Recent Changes Since Plan Creation

1. **Solid event colors** (Feb 8): Changed from muted `{colour}30` backgrounds to solid `{colour}` with white text
2. **Resizable agenda sidebar** (Feb 9): Added drag handle with persistent width via localStorage
3. **Calendar-aware overflow** (Feb 8): "+X more" indicators now show which calendars have hidden events
4. **Various bug fixes**: Event spacing, all-day visibility, header text wrapping, time indicator clamping

---

## Remaining Refactoring Opportunities

### 1. Extract Dynamic Visibility Calculation Utility (Low Priority)

**Status**: Less urgent since `DayCell.svelte` consolidation (commit `0bba466`)

**Problem**: The visibility calculation logic (~70 lines) in `DayCell.svelte` could be extracted to a reusable utility. However, since `MonthDay` and `NextWeekDay` were consolidated into a single component, there's now only one location for this code.

**Current location**: `src/lib/components/DayCell.svelte` (lines 36-121)

**Potential solution**: If the logic needs to be reused elsewhere (e.g., week view time grid), extract to:

```typescript
// src/lib/utils/visibility-calculator.ts
interface VisibilityOptions {
  headerHeight: number;
  moreIndicatorHeight: number;
  spanningHeight: number;
  eventHeights: number | ((event: CalendarEvent) => number);
}

export function createVisibilityCalculator(
  containerEl: HTMLElement,
  events: CalendarEvent[],
  options: VisibilityOptions
): { maxVisible: number; cleanup: () => void }
```

**Recommendation**: Defer until the logic needs to be reused. Current single-location implementation is acceptable.

---

### 2. Consolidate localStorage Persistence Patterns (Medium Priority)

**Problem**: `CalendarState` in `src/lib/stores/calendar.svelte.ts` now has **4** identical patterns for localStorage persistence (up from 3):
- `currentView` with `localStorage.getItem/setItem('blair-board-current-view', ...)`
- `hiddenCalendarIds` with `localStorage.getItem/setItem('blair-board-hidden-calendars', ...)`
- `agendaVisible` with `localStorage.getItem/setItem('blair-board-agenda-visible', ...)`
- `agendaWidth` with `localStorage.getItem/setItem('blair-board-agenda-width', ...)` — **NEW**

Each follows the same pattern: load in constructor, save in setter, with try/catch and `typeof window` SSR guard.

**Solution**: Create a generic persisted state helper:

```typescript
// src/lib/utils/persisted-state.ts
export function loadFromStorage<T>(key: string, defaultValue: T, parse?: (v: string) => T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return parse ? parse(stored) : JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T, serialize?: (v: T) => string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, serialize ? serialize(value) : JSON.stringify(value));
  } catch {
    console.warn(`Failed to persist ${key}:`, value);
  }
}
```

**Files to update**:
- New: `src/lib/utils/persisted-state.ts`
- Update: `src/lib/stores/calendar.svelte.ts`

**Estimated impact**: Removes ~40 lines of repetitive localStorage code (up from ~30), provides consistent error handling.

---

### 3. Create Date Parsing Helper (Low Priority)

**Status**: Reduced scope — now only 3 occurrences in `date-helpers.ts`

**Problem**: The pattern `typeof date === 'string' ? parseISO(date) : date` appears in `src/lib/utils/date-helpers.ts` (3 times). Previously appeared in more locations but component consolidation reduced occurrences.

**Solution**: Add a utility function to `src/lib/utils/date-helpers.ts`:

```typescript
/**
 * Ensures a value is a Date object, parsing ISO strings if necessary.
 */
export function ensureDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}
```

**Estimated impact**: Minor improvement (~3 lines), mainly for readability.

---

### 4. Consolidate Single-Day Event Filtering (Medium Priority)

**Problem**: Single-day event filtering for a specific day is duplicated in `CalendarMonth.svelte` and `CalendarWeekNext.svelte`:

```typescript
function singleDayEventsForDay(day: Date): CalendarEvent[] {
  return nextWeekSingleDayEvents.filter((e) => {
    const start = parseISO(e.start);
    const end = parseISO(e.end);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return start <= dayEnd && end > dayStart;
  });
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

  return singleDayEvents.filter((e) => {
    const start = parseISO(e.start);
    const end = parseISO(e.end);
    return start <= dayEnd && end > dayStart;
  });
}
```

**Files to update**:
- Update: `src/lib/utils/spanning-events.ts` (add function)
- Update: `src/lib/components/CalendarMonth.svelte` (use shared function)
- Update: `src/lib/components/CalendarWeekNext.svelte` (use shared function)

**Estimated impact**: Removes ~12 lines of duplicated filtering logic.

---

### 5. Simplify Navigation Logic in CalendarState (Low Priority)

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

Recommended sequence for implementing remaining refactorings:

1. **getSingleDayEventsForDay** (#4) - Quick win, minimal risk, ~12 lines saved
2. **localStorage persistence** (#2) - Higher impact, ~40 lines saved
3. **ensureDate helper** (#3) - Minor improvement, optional
4. **Visibility calculator** (#1) - Defer unless reuse is needed
5. **Navigation simplification** (#5) - Optional polish

Each refactoring can be done as a separate commit or PR for easier review and rollback if needed.

---

## Verification Strategy

After each refactoring, verify:

1. **TypeScript**: Run `pnpm check` for type errors
2. **Visual inspection**: Check all four views (Week, Week+Next, 4-Week, Month)
3. **Spanning events**: Verify events span correctly across columns and week boundaries
4. **Past events**: Confirm 50% opacity on past events
5. **Overflow**: Verify "+X more" works in month/4-week views with calendar names
6. **Now line**: Verify red time indicator appears on today's column (Week/Week+Next views)
7. **Persistence**: Check localStorage (view selection, hidden calendars, agenda visibility, agenda width)
8. **Resize handles**: Test sidebar resize and Week+Next split ratio
9. **Spacing**: Confirm 4px gaps between all event types
10. **Edge cases**:
    - All-day events
    - Multi-day events crossing week boundaries
    - Days with many events
    - Different time formats (12h/24h)

---

## Notes

- All refactorings should be done in feature branches (per project workflow)
- No architectural changes are proposed - these are consolidation improvements
- The shared utilities approach aligns with existing codebase patterns (`spanning-events.ts`, `date-helpers.ts`)
- Consider adding unit tests for new utility functions (currently no test infrastructure)