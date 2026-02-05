# Spanning Multi-Day Events Implementation Guide

This document details the changes made to implement spanning multi-day events in the Week+Next view, which can be applied to Month and 4-Week views.

## Overview

The Week+Next view was refactored to display multi-day and all-day events as horizontal bars spanning across multiple day columns, with a row-packing algorithm to minimize vertical space when events overlap.

## Key Changes Made

### 1. Event Classification

Events are now split into two categories:

- **Spanning events**: Multi-day events or all-day events that span across day columns
- **Single-day timed events**: Regular timed events that appear within individual day cells

```typescript
// All events that overlap the week
let nextWeekEvents = $derived(
    events.filter((e) => {
        const start = parseISO(e.start);
        const end = parseISO(e.end);
        return nextWeekDays.some((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            return start <= dayEnd && end > dayStart;
        });
    })
);

// Multi-day or all-day events → rendered as spanning bars
let nextWeekMultiDayEvents = $derived(
    nextWeekEvents.filter((e) => {
        const start = startOfDay(parseISO(e.start));
        const end = startOfDay(parseISO(e.end));
        return end > start || e.allDay;
    })
);

// Timed single-day events → rendered in day cells
let nextWeekSingleDayEvents = $derived(
    nextWeekEvents.filter((e) => {
        const start = startOfDay(parseISO(e.start));
        const end = startOfDay(parseISO(e.end));
        return end <= start && !e.allDay;
    })
);
```

### 2. Column Span Calculation

Each spanning event is mapped to its start column, end column, and span width:

```typescript
interface SpanningEvent {
    event: CalendarEvent;
    startCol: number;  // 0-6 for days of week
    span: number;      // number of columns to span
}

let spanningEvents = $derived.by(() => {
    return nextWeekMultiDayEvents.map((event) => {
        const eventStart = startOfDay(parseISO(event.start));
        const eventEnd = startOfDay(parseISO(event.end));

        // Find which column the event starts in
        let startCol = nextWeekDays.findIndex(
            (day) => startOfDay(day).getTime() === eventStart.getTime()
        );
        if (startCol === -1) startCol = 0; // starts before visible week

        // Find which column the event ends in
        let endCol = nextWeekDays.findIndex(
            (day) => startOfDay(day).getTime() === eventEnd.getTime()
        );
        if (endCol === -1) endCol = nextWeekDays.length; // ends after visible week

        const span = endCol - startCol;
        return { event, startCol, span: Math.max(1, span) };
    });
});
```

### 3. Row-Packing Algorithm

Events are packed into rows to minimize vertical space. Events that don't overlap horizontally share the same row:

```typescript
interface PackedSpanningEvent extends SpanningEvent {
    row: number;  // which row to render in (0-indexed)
}

let packedSpanningEvents = $derived.by(() => {
    const rows: PackedSpanningEvent[][] = [];

    for (const se of spanningEvents) {
        let rowIndex = 0;

        // Find first row where this event doesn't overlap existing events
        while (rowIndex < rows.length) {
            const hasOverlap = rows[rowIndex].some(
                (existing) =>
                    se.startCol < existing.startCol + existing.span &&
                    existing.startCol < se.startCol + se.span
            );
            if (!hasOverlap) break;
            rowIndex++;
        }

        // Create new row if needed
        if (rowIndex >= rows.length) rows.push([]);

        const packed: PackedSpanningEvent = { ...se, row: rowIndex };
        rows[rowIndex].push(packed);
    }

    return rows.flat();
});
```

### 4. Layout Structure

The HTML structure was reorganized:

**Before** (simple day cells):
```svelte
<div class="grid grid-cols-7">
    {#each days as day}
        <div class="day-cell">
            <header>Day Header</header>
            <div class="events">
                {#each events as event}
                    <div class="event">{event.title}</div>
                {/each}
            </div>
        </div>
    {/each}
</div>
```

**After** (separated headers, absolute-positioned spans, day cells):
```svelte
<!-- Day headers -->
<div class="grid grid-cols-7">
    {#each days as day}
        <div class="header">{formatDayHeader(day)}</div>
    {/each}
</div>

<!-- Event area -->
<div class="relative">
    <!-- Spanning event bars (absolutely positioned) -->
    {#each packedSpanningEvents as { event, startCol, span, row }}
        <div
            class="absolute"
            style="
                left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
                width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
                top: {row * SPANNING_ROW_HEIGHT + 0.25}rem;
            "
        >
            <div class="event-bar">{event.title}</div>
        </div>
    {/each}

    <!-- Day columns (for single-day timed events) -->
    <div class="grid grid-cols-7">
        {#each days as day, dayIndex}
            {@const spanRows = spanningRowsForDay(dayIndex)}
            <div
                class="day-column"
                style="padding-top: calc({spanRows * SPANNING_ROW_HEIGHT}rem + 0.25rem)"
            >
                {#each singleDayEventsForDay(day) as event}
                    <div class="event">{event.title}</div>
                {/each}
            </div>
        {/each}
    </div>
</div>
```

### 5. Vertical Spacing Constants

```typescript
const SPANNING_ROW_HEIGHT = 1.75; // rem per spanning event row
```

This value accommodates:
- 1.5rem (24px) for the event bar (4px top padding + 16px text + 4px bottom padding)
- 0.25rem (4px) gap between rows

The top offset is `row * SPANNING_ROW_HEIGHT + 0.25` to add a 4px gap above the first row.

### 6. Dynamic Padding-Top for Day Columns

Each day column calculates how many spanning event rows are above it:

```typescript
function spanningRowsForDay(dayIndex: number): number {
    let maxRow = -1;
    for (const se of packedSpanningEvents) {
        if (dayIndex >= se.startCol && dayIndex < se.startCol + se.span) {
            maxRow = Math.max(maxRow, se.row);
        }
    }
    return maxRow + 1; // convert 0-indexed to count
}
```

The day column's `padding-top` is set to `spanRows * SPANNING_ROW_HEIGHT + 0.25rem` to create space for the spanning bars above.

### 7. Border-Aware Positioning

Spanning bars account for the 1px borders between day columns:

```svelte
style="
    left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
    width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
"
```

- First column (startCol === 0): no left border, so no adjustment. Width accounts for 1px right border.
- Other columns: +1px left offset to account for border. Width accounts for 2px (left + right borders).

### 8. Consistent Event Padding

All events (spanning and single-day) use consistent 4px internal padding:

**Spanning bars:**
```svelte
<div class="text-xs px-1 py-1 mx-1 rounded">
    <span class="font-medium">{event.title}</span>
</div>
```

**Single-day events:**
```svelte
<div
    class="text-xs rounded"
    style="padding: 4px 4px;"
>
    {#if !event.allDay}
        <div class="mb-0.5">{formatTime(event.start)}</div>
    {/if}
    <div class="font-medium truncate">{event.title}</div>
</div>
```

**Gap between events:**
```svelte
<div class="flex flex-col gap-1">  <!-- gap-1 = 4px -->
    {#each events as event}
        ...
    {/each}
</div>
```

## Applying to Month and 4-Week Views

### Month View Considerations

1. **More columns**: 7 columns × 4-6 rows = 28-42 day cells
2. **Spanning across weeks**: Events can span across the end of one week and into the next
3. **Padding from previous/next month**: Days from adjacent months are shown in the grid
4. **Tighter spacing**: Less vertical space available per day

**Suggested approach:**
- Use the same row-packing algorithm
- Calculate spans across all grid cells (not just 7-day weeks)
- Set a maximum number of spanning rows to display (e.g., 2-3) with "+N more" overflow
- Smaller `SPANNING_ROW_HEIGHT` (e.g., 1.5rem instead of 1.75rem)

### 4-Week View Considerations

Similar to Month view but always shows exactly 28 days (4 weeks × 7 days).

**Suggested approach:**
- Same as Month view
- No padding days from adjacent months
- Can afford slightly more vertical space than Month view

## Files Modified

- `src/lib/components/CalendarWeekNext.svelte` - All spanning event logic and layout

## Testing Checklist

When applying to other views:

- [ ] Single-day events appear in correct day cells
- [ ] Multi-day events span the correct number of columns
- [ ] All-day events are treated as spanning events
- [ ] Events starting before the visible range start at column 0
- [ ] Events ending after the visible range extend to the last column
- [ ] Events that don't overlap horizontally share the same row
- [ ] Consistent 4px padding inside all event boxes
- [ ] Consistent 4px gaps between event rows
- [ ] Day columns have correct padding-top to avoid overlapping spanning bars
- [ ] Border pixels are accounted for in positioning
- [ ] Layout works across different screen sizes
- [ ] Overflow handling works when too many events exist

## Performance Notes

- All derived calculations are reactive via `$derived` and `$derived.by()`
- Row-packing algorithm is O(n × r) where n = number of spanning events, r = number of rows
- In practice, r is very small (typically 1-3 rows)
- No DOM measurements required; all layout is CSS-based

## Future Enhancements

- Click/tap to expand collapsed "+N more" events
- Drag-and-drop to reschedule events
- Visual indication when events are truncated (start/end outside visible range)
- Different color intensity for past vs. future events
- Hover states with full event details
