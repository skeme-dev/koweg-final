<script lang="ts">
	import { ChevronLeft, ChevronRight, MapPin, Clock } from '@lucide/svelte';

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

	interface EventCalendarProps {
		events: Event[];
		linkBase?: string;
	}

	let { events = [], linkBase = '/events' }: EventCalendarProps = $props();

	const typeLabels: Record<string, string> = {
		turnier: 'Turnier',
		veranstaltung: 'Veranstaltung',
		training: 'Training',
		sonstiges: 'Sonstiges'
	};

	const typeDotColors: Record<string, string> = {
		turnier: 'bg-accent',
		veranstaltung: 'bg-secondary',
		training: 'bg-primary',
		sonstiges: 'bg-gray-dark'
	};

	const typeColors: Record<string, string> = {
		turnier: 'bg-accent text-white',
		veranstaltung: 'bg-secondary text-white',
		training: 'bg-primary text-white',
		sonstiges: 'bg-gray-dark text-white'
	};

	const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const monthNames = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];

	// Current displayed month
	let currentDate = $state(new Date());
	let selectedDate = $state<string | null>(null);

	const currentYear = $derived(currentDate.getFullYear());
	const currentMonth = $derived(currentDate.getMonth());

	function prevMonth() {
		currentDate = new Date(currentYear, currentMonth - 1, 1);
		selectedDate = null;
	}

	function nextMonth() {
		currentDate = new Date(currentYear, currentMonth + 1, 1);
		selectedDate = null;
	}

	function goToToday() {
		currentDate = new Date();
		selectedDate = null;
	}

	// Calendar grid computation
	const calendarDays = $derived.by(() => {
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);

		// Monday = 0, Sunday = 6
		let startWeekday = firstDay.getDay() - 1;
		if (startWeekday < 0) startWeekday = 6;

		const days: Array<{ date: Date; inMonth: boolean; dateKey: string }> = [];

		// Previous month padding
		for (let i = startWeekday - 1; i >= 0; i--) {
			const d = new Date(currentYear, currentMonth, -i);
			days.push({ date: d, inMonth: false, dateKey: toDateKey(d) });
		}

		// Current month
		for (let i = 1; i <= lastDay.getDate(); i++) {
			const d = new Date(currentYear, currentMonth, i);
			days.push({ date: d, inMonth: true, dateKey: toDateKey(d) });
		}

		// Next month padding (fill to 42 = 6 rows)
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const d = new Date(currentYear, currentMonth + 1, i);
			days.push({ date: d, inMonth: false, dateKey: toDateKey(d) });
		}

		return days;
	});

	function toDateKey(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// Map events to date keys
	const eventsByDate = $derived.by(() => {
		const map = new Map<string, Event[]>();
		for (const event of events) {
			const start = new Date(event.start_date);
			const end = event.end_date ? new Date(event.end_date) : start;

			// Add event to each day it spans
			const cursor = new Date(start);
			cursor.setHours(0, 0, 0, 0);
			const endDay = new Date(end);
			endDay.setHours(0, 0, 0, 0);

			while (cursor <= endDay) {
				const key = toDateKey(cursor);
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push(event);
				cursor.setDate(cursor.getDate() + 1);
			}
		}
		return map;
	});

	const todayKey = toDateKey(new Date());

	const selectedEvents = $derived(
		selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []
	);

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatFullDate(dateKey: string): string {
		const [y, m, d] = dateKey.split('-').map(Number);
		const date = new Date(y, m - 1, d);
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<div class="space-y-4">
	<!-- Header: Navigation -->
	<div class="flex items-center justify-between">
		<button
			onclick={prevMonth}
			class="flex h-10 w-10 items-center justify-center bg-[#eee] transition-colors hover:bg-accent hover:text-white"
			aria-label="Vorheriger Monat"
		>
			<ChevronLeft size={20} />
		</button>

		<div class="flex items-center gap-3">
			<h3 class="font-heading text-xl font-bold text-foreground md:text-2xl">
				{monthNames[currentMonth]} {currentYear}
			</h3>
			<button
				onclick={goToToday}
				class="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-white"
			>
				Heute
			</button>
		</div>

		<button
			onclick={nextMonth}
			class="flex h-10 w-10 items-center justify-center bg-[#eee] transition-colors hover:bg-accent hover:text-white"
			aria-label="Nächster Monat"
		>
			<ChevronRight size={20} />
		</button>
	</div>

	<!-- Kalender Grid -->
	<div class="border border-[#ddd]">
		<!-- Wochentage Header -->
		<div class="grid grid-cols-7 border-b border-[#ddd] bg-[#eee]">
			{#each weekdays as day}
				<div class="py-2 text-center text-sm font-semibold text-foreground/70">
					{day}
				</div>
			{/each}
		</div>

		<!-- Tage Grid -->
		<div class="grid grid-cols-7">
			{#each calendarDays as day, i}
				{@const dayEvents = eventsByDate.get(day.dateKey) ?? []}
				{@const isToday = day.dateKey === todayKey}
				{@const isSelected = day.dateKey === selectedDate}
				<button
					onclick={() => {
						if (dayEvents.length > 0) {
							selectedDate = selectedDate === day.dateKey ? null : day.dateKey;
						}
					}}
					class="relative flex min-h-[60px] flex-col items-center border-b border-r border-[#eee] p-1 transition-colors md:min-h-[80px] md:p-2
						{day.inMonth ? '' : 'bg-[#f9f9f9] text-foreground/30'}
						{isSelected ? 'bg-accent/10' : ''}
						{dayEvents.length > 0 ? 'cursor-pointer hover:bg-accent/5' : 'cursor-default'}"
				>
					<!-- Tag-Nummer -->
					<span
						class="flex h-7 w-7 items-center justify-center text-sm font-semibold md:h-8 md:w-8 md:text-base
							{isToday ? 'bg-accent text-white' : ''}"
					>
						{day.date.getDate()}
					</span>

					<!-- Event-Dots -->
					{#if dayEvents.length > 0}
						<div class="mt-1 flex flex-wrap justify-center gap-0.5">
							{#each dayEvents.slice(0, 3) as evt}
								<span
									class="h-1.5 w-1.5 rounded-full {typeDotColors[evt.type ?? 'sonstiges'] ?? 'bg-gray-dark'}"
								></span>
							{/each}
							{#if dayEvents.length > 3}
								<span class="text-[9px] font-bold text-foreground/50">+{dayEvents.length - 3}</span>
							{/if}
						</div>
						<!-- Event-Titel (nur Desktop, erster Event) -->
						<span class="mt-0.5 hidden w-full truncate text-center text-[10px] leading-tight text-foreground/60 md:block">
							{dayEvents[0].title}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Ausgewählter Tag: Event-Details -->
	{#if selectedDate && selectedEvents.length > 0}
		<div class="space-y-3">
			<h4 class="font-heading text-lg font-semibold text-foreground">
				{formatFullDate(selectedDate)}
			</h4>

			{#each selectedEvents as event}
				<a
					href="{linkBase}/{event.slug}"
					class="group flex gap-3 bg-[#eee] p-4 transition-shadow hover:shadow-md md:p-5"
				>
					<!-- Farbstreifen links -->
					<div class="w-1 flex-shrink-0 {typeDotColors[event.type ?? 'sonstiges'] ?? 'bg-gray-dark'}"></div>

					<div class="flex-1 space-y-1">
						<div class="flex items-start justify-between gap-2">
							<h5 class="font-heading text-base font-bold text-foreground group-hover:text-accent md:text-lg">
								{event.title}
							</h5>
							{#if event.type}
								<span
									class="flex-shrink-0 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {typeColors[event.type] ?? 'bg-gray-dark text-white'}"
								>
									{typeLabels[event.type] ?? event.type}
								</span>
							{/if}
						</div>

						<div class="flex flex-wrap gap-3 text-sm text-gray-dark">
							<div class="flex items-center gap-1">
								<Clock size={14} />
								<span>
									{formatTime(event.start_date)}
									{#if event.end_date}
										- {formatTime(event.end_date)}
									{/if}
									Uhr
								</span>
							</div>
							{#if event.location}
								<div class="flex items-center gap-1">
									<MapPin size={14} />
									<span>{event.location.title}</span>
								</div>
							{/if}
						</div>

						{#if event.description}
							<p class="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/70">
								{event.description}
							</p>
						{/if}
					</div>

					<div class="flex flex-shrink-0 items-center text-foreground/30 transition-colors group-hover:text-accent">
						<ChevronRight size={18} />
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
