<script lang="ts">
	interface Props {
		label: string;
		onprevious: () => void;
		onnext: () => void;
		ontoday: () => void;
	}

	let { label, onprevious, onnext, ontoday }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<button
		class="p-1.5 rounded-lg text-text hover:bg-border-light transition-colors"
		onclick={onprevious}
		aria-label="Previous"
	>
		<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	<button
		class="px-3 py-1.5 rounded-lg text-base font-semibold text-text hover:bg-border-light transition-colors"
		onclick={ontoday}
	>
		Today
	</button>

	<button
		class="p-1.5 rounded-lg text-text hover:bg-border-light transition-colors"
		onclick={onnext}
		aria-label="Next"
	>
		<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
		</svg>
	</button>

	<h2 class="text-xl font-bold ml-2">{label}</h2>
</div>
