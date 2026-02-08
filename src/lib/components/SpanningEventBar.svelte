<script lang="ts">
	import type { PackedSpanningEvent } from '$lib/utils/spanning-events';
	import { SPANNING_ROW_HEIGHT } from '$lib/utils/spanning-events';
	import { formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

	interface Props {
		packed: PackedSpanningEvent;
		topOffset?: number; // additional rem offset (e.g., for month view header: 2rem)
		rowHeight?: number; // row height in rem (defaults to SPANNING_ROW_HEIGHT)
		timeFormat?: '12h' | '24h';
	}

	let { packed, topOffset = 0, rowHeight = SPANNING_ROW_HEIGHT, timeFormat = '24h' }: Props = $props();
</script>

<div
	class="absolute pointer-events-auto z-10"
	style="
		left: calc({packed.startCol} / 7 * 100% + {packed.startCol === 0 ? 0 : 1}px);
		width: calc({packed.span} / 7 * 100% - {packed.startCol === 0 ? 0 : 1}px);
		top: calc({topOffset}rem + {packed.row * rowHeight + 0.25}rem);
	"
>
	<div
		class="text-sm px-1.5 py-0.5 mx-0.5 rounded truncate cursor-default font-semibold text-white"
		style="background-color: {packed.event.colour}; opacity: {isEventPast(packed.event.end) ? 0.5 : 1}"
		title="{packed.event.allDay ? 'All day' : formatTimeRange(packed.event.start, packed.event.end, timeFormat)}: {packed.event.title}"
	>
		{packed.event.title}
	</div>
</div>
