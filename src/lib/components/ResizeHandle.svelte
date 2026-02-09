<script lang="ts">
	interface Props {
		orientation: 'horizontal' | 'vertical';
		onresize: (delta: number) => void;
		ariaLabel?: string;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let { orientation, onresize, ariaLabel = 'Resize', onkeydown }: Props = $props();

	let isDragging = $state(false);
	let startPos = $state(0);

	function handlePointerDown(e: PointerEvent) {
		isDragging = true;
		startPos = orientation === 'horizontal' ? e.clientY : e.clientX;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;

		const currentPos = orientation === 'horizontal' ? e.clientY : e.clientX;
		const delta = startPos - currentPos;
		startPos = currentPos;
		onresize(delta);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	let isHorizontal = $derived(orientation === 'horizontal');
	let containerClass = $derived(
		isHorizontal
			? 'h-4 flex items-center justify-center cursor-row-resize group shrink-0 select-none touch-none'
			: 'w-4 flex items-center justify-center cursor-col-resize group shrink-0 select-none touch-none'
	);
	let pillClass = $derived(isHorizontal ? 'w-12 h-1' : 'w-1 h-12');
</script>

<div
	class={containerClass}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onkeydown={onkeydown}
	role="button"
	aria-label={ariaLabel}
	tabindex="0"
>
	<div
		class="{pillClass} rounded-full bg-border-light transition-colors {isDragging
			? 'bg-blue-400'
			: 'group-hover:bg-border'}"
	></div>
</div>
