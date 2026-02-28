<script lang="ts">
	import { List, Calendar } from '@lucide/svelte';
	import EventTimeline from './EventTimeline.svelte';
	import EventCalendar from './EventCalendar.svelte';

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

	interface EventSectionProps {
		events: Event[];
		linkBase?: string;
	}

	let { events = [], linkBase = '/events' }: EventSectionProps = $props();

	let view = $state<'timeline' | 'calendar'>('timeline');
</script>

{#if events.length > 0}
	<div class="space-y-4">
		<!-- View Toggle -->
		<div class="flex items-center justify-end gap-1">
			<button
				onclick={() => (view = 'timeline')}
				class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors
					{view === 'timeline' ? 'bg-accent text-white' : 'bg-[#eee] text-foreground/60 hover:text-foreground'}"
				aria-label="Timeline-Ansicht"
			>
				<List size={16} />
				<span class="hidden sm:inline">Timeline</span>
			</button>
			<button
				onclick={() => (view = 'calendar')}
				class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors
					{view === 'calendar' ? 'bg-accent text-white' : 'bg-[#eee] text-foreground/60 hover:text-foreground'}"
				aria-label="Kalender-Ansicht"
			>
				<Calendar size={16} />
				<span class="hidden sm:inline">Kalender</span>
			</button>
		</div>

		<!-- Content -->
		{#if view === 'timeline'}
			<EventTimeline {events} {linkBase} />
		{:else}
			<EventCalendar {events} {linkBase} />
		{/if}
	</div>
{/if}
