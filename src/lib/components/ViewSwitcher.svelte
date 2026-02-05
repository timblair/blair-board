<script lang="ts">
	interface Props {
		currentView: 'week' | 'month';
		onchange: (view: 'week' | 'month') => void;
	}

	let { currentView, onchange }: Props = $props();
</script>

<div class="flex rounded-lg border border-border bg-surface overflow-hidden">
	<button
		class="px-3 py-1.5 text-sm font-medium transition-colors {currentView === 'week'
			? 'bg-text text-surface'
			: 'text-text-secondary hover:text-text'}"
		onclick={() => onchange('week')}
	>
		Week
	</button>
	<button
		class="px-3 py-1.5 text-sm font-medium transition-colors {currentView === 'month'
			? 'bg-text text-surface'
			: 'text-text-secondary hover:text-text'}"
		onclick={() => onchange('month')}
	>
		Month
	</button>
</div>
