<script lang="ts">
	import { onMount } from 'svelte';
	import { CalendarState } from '$lib/stores/calendar.svelte';
	import CalendarWeek from '$lib/components/CalendarWeek.svelte';
	import CalendarMonth from '$lib/components/CalendarMonth.svelte';
	import AgendaPanel from '$lib/components/AgendaPanel.svelte';
	import CalendarLegend from '$lib/components/CalendarLegend.svelte';
	import ViewSwitcher from '$lib/components/ViewSwitcher.svelte';
	import DateNavigation from '$lib/components/DateNavigation.svelte';

	let { data } = $props();

	const cal = new CalendarState();

	// Initialize from SSR data
	$effect(() => {
		cal.events = data.events;
		cal.config = data.config;
		cal.currentView = data.config.display.defaultView;
	});

	// Set up polling
	onMount(() => {
		const intervalMs = (cal.config?.refresh.clientPollIntervalMinutes ?? 5) * 60 * 1000;
		const interval = setInterval(() => cal.fetchEvents(), intervalMs);
		return () => clearInterval(interval);
	});

	// Re-fetch when view or date changes
	let previousView = $state(cal.currentView);
	let previousDate = $state(cal.referenceDate.toISOString());

	$effect(() => {
		const newView = cal.currentView;
		const newDate = cal.referenceDate.toISOString();

		if (newView !== previousView || newDate !== previousDate) {
			previousView = newView;
			previousDate = newDate;
			cal.fetchEvents();
		}
	});
</script>

<div class="h-screen flex flex-col bg-bg">
	<!-- Header -->
	<header class="relative shrink-0 px-4 py-3 bg-surface border-b border-border">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<h1 class="text-xl font-semibold">Blair Board</h1>
				<DateNavigation
					label={cal.periodLabel}
					onprevious={() => cal.navigatePrevious()}
					onnext={() => cal.navigateNext()}
					ontoday={() => cal.navigateToday()}
				/>
			</div>

			<div class="flex items-center gap-4">
				{#if cal.config}
					<CalendarLegend calendars={cal.config.calendars} />
				{/if}
				<ViewSwitcher
					currentView={cal.currentView}
					onchange={(view) => cal.setView(view)}
				/>
			</div>
		</div>

		{#if cal.loading}
			<div class="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/30 overflow-hidden">
				<div class="h-full w-1/3 bg-blue-500 animate-pulse"></div>
			</div>
		{/if}
	</header>

	<!-- Main content -->
	<div class="flex-1 flex min-h-0">
		<!-- Calendar view -->
		<main class="flex-1 p-4 min-w-0 overflow-hidden">
			{#if cal.currentView === 'week'}
				<CalendarWeek
					events={cal.calendarViewEvents}
					referenceDate={cal.referenceDate}
					weekStartsOn={cal.weekStartsOn}
					timeFormat={cal.config?.display.timeFormat}
				/>
			{:else}
				<CalendarMonth
					events={cal.calendarViewEvents}
					referenceDate={cal.referenceDate}
					weekStartsOn={cal.weekStartsOn}
					timeFormat={cal.config?.display.timeFormat}
				/>
			{/if}
		</main>

		<!-- Agenda sidebar -->
		<div class="w-72 shrink-0 hidden md:block">
			<AgendaPanel
				events={cal.agendaEvents}
				timeFormat={cal.config?.display.timeFormat}
				agendaDays={cal.config?.display.agendaDays}
			/>
		</div>
	</div>
</div>
