<script lang="ts">
	interface CalendarInfo {
		id: string;
		name: string;
		colour: string;
		enabled: boolean;
	}

	interface Props {
		calendars: CalendarInfo[];
		hiddenCalendarIds: Set<string>;
		ontoggle: (calendarId: string) => void;
	}

	let { calendars, hiddenCalendarIds, ontoggle }: Props = $props();
</script>

<div class="flex flex-wrap gap-x-4 gap-y-1">
	{#each calendars.filter((c) => c.enabled) as cal (cal.id)}
		{@const isVisible = !hiddenCalendarIds.has(cal.id)}
		<button
			class="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-100 {isVisible
				? 'text-text-secondary'
				: 'text-text-tertiary opacity-40'}"
			onclick={() => ontoggle(cal.id)}
			title={isVisible ? `Hide ${cal.name}` : `Show ${cal.name}`}
		>
			<span
				class="w-2.5 h-2.5 rounded-full shrink-0 transition-opacity"
				style="background-color: {cal.colour}; opacity: {isVisible ? 1 : 0.3}"
			></span>
			<span class={isVisible ? 'font-medium' : 'line-through'}>{cal.name}</span>
		</button>
	{/each}
</div>
