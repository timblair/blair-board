<script lang="ts">
	interface Props {
		onresize: (deltaX: number) => void;
	}

	let { onresize }: Props = $props();

	let isDragging = $state(false);
	let startX = $state(0);

	function handlePointerDown(e: PointerEvent) {
		isDragging = true;
		startX = e.clientX;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;

		const deltaX = startX - e.clientX;
		startX = e.clientX;
		onresize(deltaX);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}
</script>

<div
	class="w-4 flex items-center justify-center cursor-col-resize group shrink-0 select-none touch-none"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	role="button"
	aria-label="Resize sidebar"
	tabindex="0"
>
	<div
		class="w-1 h-12 rounded-full bg-border-light transition-colors {isDragging
			? 'bg-blue-400'
			: 'group-hover:bg-border'}"
	></div>
</div>
