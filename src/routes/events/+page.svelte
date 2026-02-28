<script lang="ts">
	import EventSection from '$lib/components/blocks/EventSection.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';
	import { Filter } from '@lucide/svelte';

	let { data } = $props();

	const allEvents = $derived(data.events ?? []);

	const eventTypes = [
		{ value: 'all', label: 'Alle' },
		{ value: 'turnier', label: 'Turniere' },
		{ value: 'veranstaltung', label: 'Veranstaltungen' },
		{ value: 'training', label: 'Trainings' },
		{ value: 'sonstiges', label: 'Sonstiges' }
	];

	let activeType = $state('all');

	const filteredEvents = $derived(
		activeType === 'all' ? allEvents : allEvents.filter((e) => e.type === activeType)
	);

	const typeColors: Record<string, string> = {
		all: 'bg-accent text-white',
		turnier: 'bg-accent text-white',
		veranstaltung: 'bg-secondary text-white',
		training: 'bg-primary text-white',
		sonstiges: 'bg-gray-dark text-white'
	};
</script>

<svelte:head>
	<title>Veranstaltungen | SV Koweg e.V.</title>
	<meta name="description" content="Alle Veranstaltungen, Turniere und Events des SV Koweg e.V. auf einen Blick." />
	<meta property="og:title" content="Veranstaltungen | SV Koweg e.V." />
	<meta property="og:description" content="Alle Veranstaltungen, Turniere und Events des SV Koweg e.V. auf einen Blick." />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="mb-12 mt-4 space-y-6 sm:mt-6 sm:space-y-8">
	<!-- Header -->
	<div>
		<Headline as="h1" headline="Veranstaltungen" />
		<p class="mt-2 text-base text-foreground/70 sm:text-lg">
			Alle Turniere, Veranstaltungen und Events auf einen Blick.
		</p>
	</div>

	<!-- Filter -->
	<div class="space-y-2 sm:space-y-3">
		<div class="flex items-center gap-2 text-xs font-semibold text-foreground/50 sm:text-sm">
			<Filter size={14} class="sm:hidden" />
			<Filter size={16} class="hidden sm:block" />
			<span>Filtern nach Typ</span>
		</div>
		<div class="flex flex-wrap gap-1.5 sm:gap-2">
			{#each eventTypes as type}
				<button
					onclick={() => (activeType = type.value)}
					class="px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm
						{activeType === type.value
							? typeColors[type.value] ?? 'bg-accent text-white'
							: 'bg-[#eee] text-foreground/60 hover:text-foreground'}"
				>
					{type.label}
					{#if type.value !== 'all'}
						<span class="ml-1 opacity-70">
							({allEvents.filter((e) => e.type === type.value).length})
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Events -->
	{#if filteredEvents.length > 0}
		<EventSection events={filteredEvents} linkBase="/events" />
	{:else}
		<div class="bg-[#eee] p-6 text-center sm:p-8">
			<p class="font-heading text-base font-semibold text-foreground/50 sm:text-lg">
				Keine Events in dieser Kategorie gefunden.
			</p>
		</div>
	{/if}
</div>
