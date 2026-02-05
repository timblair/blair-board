<script lang="ts">
	interface CalendarInfo {
		id: string;
		name: string;
		colour: string;
		enabled: boolean;
	}

	interface Props {
		calendars: CalendarInfo[];
	}

	let { calendars }: Props = $props();
</script>

<div class="flex flex-wrap gap-x-4 gap-y-1">
	{#each calendars.filter((c) => c.enabled) as cal (cal.id)}
		<div class="flex items-center gap-1.5 text-xs text-text-secondary">
			<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {cal.colour}"></span>
			<span>{cal.name}</span>
		</div>
	{/each}
</div>
