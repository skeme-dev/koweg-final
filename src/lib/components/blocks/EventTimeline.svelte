<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';
	import { CalendarDays, MapPin, Clock, ChevronRight } from '@lucide/svelte';

	interface Event {
		id: string;
		title: string;
		slug: string;
		description?: string;
		image?: { id: string };
		type?: 'turnier' | 'veranstaltung' | 'training' | 'sonstiges';
		start_date: string;
		end_date?: string;
		location?: {
			title: string;
			link?: string;
		};
		registration_form?: any;
	}

	interface EventTimelineProps {
		events: Event[];
		linkBase?: string;
	}

	let { events = [], linkBase = '/events' }: EventTimelineProps = $props();

	const typeLabels: Record<string, string> = {
		turnier: 'Turnier',
		veranstaltung: 'Veranstaltung',
		training: 'Training',
		sonstiges: 'Sonstiges'
	};

	const typeColors: Record<string, string> = {
		turnier: 'bg-accent text-white',
		veranstaltung: 'bg-secondary text-white',
		training: 'bg-primary text-white',
		sonstiges: 'bg-gray-dark text-white'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDay(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit' });
	}

	function formatMonth(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('de-DE', { month: 'short' }).toUpperCase();
	}

	function getYear(dateStr: string): number {
		return new Date(dateStr).getFullYear();
	}

	const sortedEvents = $derived.by(() => {
		return [...events].sort(
			(a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
		);
	});

	const upcomingEvents = $derived(
		sortedEvents.filter((e) => new Date(e.start_date) >= new Date())
	);

	const pastEvents = $derived(
		sortedEvents.filter((e) => new Date(e.start_date) < new Date())
	);

	// Group events by year
	function groupByYear(evts: Event[]): Map<number, Event[]> {
		const map = new Map<number, Event[]>();
		for (const e of evts) {
			const year = getYear(e.start_date);
			if (!map.has(year)) map.set(year, []);
			map.get(year)!.push(e);
		}
		return map;
	}

	const upcomingByYear = $derived(groupByYear(upcomingEvents));
	const pastByYear = $derived(groupByYear([...pastEvents].reverse()));

	const isMultiDay = (event: Event) => {
		if (!event.end_date) return false;
		const start = new Date(event.start_date).toDateString();
		const end = new Date(event.end_date).toDateString();
		return start !== end;
	};
</script>

{#snippet eventCard(event: Event, dimmed: boolean = false)}
	<div class="relative flex gap-3 sm:gap-4 md:gap-6" class:opacity-60={dimmed}>
		<!-- Datum-Badge -->
		<div class="relative z-10 flex-shrink-0">
			<div
				class="flex h-16 w-16 flex-col items-center justify-center rounded-none shadow-md sm:h-20 sm:w-20 md:h-24 md:w-24 {dimmed ? 'bg-gray text-gray-dark' : 'bg-accent text-white'}"
			>
				<span class="text-xl font-bold leading-none sm:text-2xl md:text-3xl">
					{formatDay(event.start_date)}
				</span>
				<span class="mt-0.5 text-[10px] font-semibold uppercase tracking-wider sm:mt-1 sm:text-xs md:text-sm">
					{formatMonth(event.start_date)}
				</span>
			</div>
		</div>

		{#if dimmed}
			<!-- Kompakte Karte für vergangene Events -->
			<div class="flex min-w-0 flex-1 flex-col gap-2 rounded-none bg-[#eee] p-3 sm:flex-row sm:items-center sm:p-4 md:p-5">
				<div class="min-w-0 flex-1">
					<h3 class="truncate font-heading text-base font-bold text-foreground sm:text-lg">
						{event.title}
					</h3>
					<span class="text-xs text-gray-dark sm:text-sm">
						{formatDate(event.start_date)}
					</span>
				</div>
				{#if event.type}
					<span
						class="self-start rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:self-auto sm:text-xs {typeColors[event.type] ?? 'bg-gray-dark text-white'}"
					>
						{typeLabels[event.type] ?? event.type}
					</span>
				{/if}
			</div>
		{:else}
			<!-- Volle Event Card -->
			<div
				class="group flex min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-[#eee] transition-shadow duration-300 hover:shadow-lg"
			>
				{#if event.image}
					<div class="relative h-32 w-full overflow-hidden sm:h-40 md:h-48">
						<DirectusImage
							uuid={event.image.id}
							alt={event.title}
							width={800}
							height={400}
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						{#if event.type}
							<div class="absolute left-2 top-2 sm:left-3 sm:top-3">
								<span
									class="rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-xs {typeColors[event.type] ?? 'bg-gray-dark text-white'}"
								>
									{typeLabels[event.type] ?? event.type}
								</span>
							</div>
						{/if}
					</div>
				{/if}

				<div class="flex flex-1 flex-col p-4 sm:p-5 md:p-6">
					{#if event.type && !event.image}
						<div class="mb-2">
							<span
								class="rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-xs {typeColors[event.type] ?? 'bg-gray-dark text-white'}"
							>
								{typeLabels[event.type] ?? event.type}
							</span>
						</div>
					{/if}

					<h3 class="font-heading text-lg font-bold text-foreground sm:text-xl md:text-2xl">
						{event.title}
					</h3>

					<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-dark sm:mt-3 sm:text-sm">
						<div class="flex items-center gap-1.5">
							<Clock size={14} class="flex-shrink-0 sm:hidden" />
							<Clock size={16} class="hidden flex-shrink-0 sm:block" />
							<span>
								{formatTime(event.start_date)}
								{#if event.end_date}
									- {formatTime(event.end_date)}
								{/if}
								Uhr
							</span>
						</div>

						{#if isMultiDay(event)}
							<div class="flex items-center gap-1.5">
								<CalendarDays size={14} class="flex-shrink-0 sm:hidden" />
								<CalendarDays size={16} class="hidden flex-shrink-0 sm:block" />
								<span class="hidden sm:inline">
									{formatDate(event.start_date)} – {formatDate(event.end_date)}
								</span>
								<span class="sm:hidden">
									Mehrtägig
								</span>
							</div>
						{/if}

						{#if event.location}
							<div class="flex items-center gap-1.5">
								<MapPin size={14} class="flex-shrink-0 sm:hidden" />
								<MapPin size={16} class="hidden flex-shrink-0 sm:block" />
								{#if event.location.link}
									<a
										href={event.location.link}
										class="group/loc font-semibold transition duration-300"
									>
										{event.location.title}
										<span
											class="block h-0.5 w-full max-w-0 bg-black transition-all duration-500 group-hover/loc:max-w-full"
										></span>
									</a>
								{:else}
									<span>{event.location.title}</span>
								{/if}
							</div>
						{/if}
					</div>

					{#if event.description}
						<p class="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/80 sm:mt-3 sm:text-base">
							{event.description}
						</p>
					{/if}

					<div class="mt-3 flex items-center gap-1 sm:mt-4">
						<a
							href="{linkBase}/{event.slug}"
							class="group/link flex items-center gap-1 font-heading text-xs font-bold uppercase tracking-wide text-accent transition-colors sm:text-sm"
						>
							<span>Details & Anmeldung</span>
							<ChevronRight
								size={16}
								class="transition-transform duration-300 group-hover/link:translate-x-1"
							/>
						</a>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet yearDivider(year: number, dimmed: boolean = false)}
	<div class="relative flex items-center gap-3 sm:gap-4 md:gap-6">
		<!-- Jahr-Badge an Timeline-Position -->
		<div class="relative z-10 flex-shrink-0">
			<div
				class="flex h-10 w-16 items-center justify-center rounded-none sm:w-20 md:w-24 {dimmed ? 'bg-gray-muted/30' : 'bg-accent/10'}"
			>
				<span class="font-heading text-sm font-bold tracking-widest {dimmed ? 'text-gray-muted' : 'text-accent'}">{year}</span>
			</div>
		</div>
		<!-- Linie -->
		<div class="h-[1px] flex-1 {dimmed ? 'bg-gray-muted/30' : 'bg-accent/15'}"></div>
	</div>
{/snippet}

{#if sortedEvents.length > 0}
	<div class="space-y-8">
		<!-- Kommende Events -->
		{#if upcomingEvents.length > 0}
			<div class="relative">
				<!-- Timeline Linie -->
				<div
					class="absolute left-[31px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-accent via-accent/50 to-accent/10 sm:left-[39px] md:left-[47px]"
				></div>

				<div class="space-y-6">
					{#each [...upcomingByYear.entries()] as [year, yearEvents], yearIndex}
						{#if upcomingByYear.size > 1}
							{@render yearDivider(year)}
						{/if}
						{#each yearEvents as event}
							{@render eventCard(event)}
						{/each}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Vergangene Events -->
		{#if pastEvents.length > 0}
			<details class="group/past">
				<summary
					class="flex cursor-pointer items-center gap-2 font-heading text-lg font-semibold text-foreground/60 transition-colors hover:text-foreground"
				>
					<ChevronRight
						size={20}
						class="transition-transform duration-300 group-open/past:rotate-90"
					/>
					Vergangene Events ({pastEvents.length})
				</summary>

				<div class="relative mt-6">
					<!-- Timeline Linie (gedimmt) -->
					<div
						class="absolute left-[31px] top-0 bottom-0 w-[2px] bg-gray/50 sm:left-[39px] md:left-[47px]"
					></div>

					<div class="space-y-4">
						{#each [...pastByYear.entries()] as [year, yearEvents], yearIndex}
							{#if pastByYear.size > 1}
								{@render yearDivider(year, true)}
							{/if}
							{#each yearEvents as event}
								{@render eventCard(event, true)}
							{/each}
						{/each}
					</div>
				</div>
			</details>
		{/if}
	</div>
{/if}
