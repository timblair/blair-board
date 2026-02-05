<script lang="ts">
	import type { CalendarView } from '$lib/utils/date-helpers';

	interface Props {
		currentView: CalendarView;
		onchange: (view: CalendarView) => void;
	}

	let { currentView, onchange }: Props = $props();

	const views: { value: CalendarView; label: string }[] = [
		{ value: 'week', label: 'Week' },
		{ value: 'weeknext', label: 'Week+Next' },
		{ value: '4week', label: '4 Week' },
		{ value: 'month', label: 'Month' }
	];
</script>

<div class="flex rounded-lg border border-border bg-surface overflow-hidden">
	{#each views as view (view.value)}
		<button
			class="px-3 py-1.5 text-sm font-medium transition-colors {currentView === view.value
				? 'bg-text text-surface'
				: 'text-text-secondary hover:text-text'}"
			onclick={() => onchange(view.value)}
		>
			{view.label}
		</button>
	{/each}
</div>
