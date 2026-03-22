<script lang="ts">
	let { data }: TrainingCardProps = $props();

	interface TrainingCardProps {
		data: {
			schedule: {
				title?: string;
				day: string;
				start: string;
				end: string;
				location: {
					title: string;
					link: string;
				};
				min_age?: number;
				max_age?: number;
			};
		};
	}

	const dayTranslations: Record<string, string> = {
		mon: 'Montag',
		tue: 'Dienstag',
		wed: 'Mittwoch',
		thu: 'Donnerstag',
		fri: 'Freitag',
		sat: 'Samstag',
		sun: 'Sonntag'
	};

	const { schedule } = $derived(data);

	const startTime = $derived(schedule.start.split(':').slice(0, 2).join(':'));
	const endTime = $derived(schedule.end.split(':').slice(0, 2).join(':'));
</script>

<div class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
	<div class="bg-accent px-5 py-3">
		<span class="text-lg font-bold text-white">{dayTranslations[schedule.day]}</span>
	</div>

	<div class="flex flex-1 flex-col gap-3 p-5">
		{#if schedule.title}
			<div class="text-sm font-semibold text-gray-dark">{schedule.title}</div>
		{/if}

		<div class="flex items-center gap-2 text-gray-dark">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 opacity-60">
				<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
				<path d="M12 7v5.5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<span class="text-sm font-medium">{startTime} – {endTime} Uhr</span>
		</div>

		<div class="flex items-start gap-2 text-gray-dark">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mt-0.5 shrink-0 opacity-60">
				<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
				<circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2" />
			</svg>
			<a
				href={schedule.location.link}
				class="group/link text-sm font-semibold leading-tight transition-colors hover:text-accent"
				target="_blank"
				rel="noopener noreferrer"
			>
				{schedule.location.title}
			</a>
		</div>

		{#if schedule.min_age || schedule.max_age}
			<div class="flex items-center gap-2 text-gray-dark">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 opacity-60">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					<circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span class="text-sm">
					{#if schedule.min_age && schedule.max_age}
						{schedule.min_age} – {schedule.max_age} Jahre
					{:else if schedule.min_age}
						Ab {schedule.min_age} Jahre
					{:else}
						Bis {schedule.max_age} Jahre
					{/if}
				</span>
			</div>
		{/if}
	</div>
</div>
