<script lang="ts">
	import Headline from '$lib/components/ui/Headline.svelte';
	import FormBuilder from '$lib/components/forms/FormBuilder.svelte';
	import DirectusImage from '$lib/components/shared/DirectusImage.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize';
	import { CalendarDays, MapPin, Clock, Users, ArrowLeft } from '@lucide/svelte';

	let { data } = $props();

	const event = $derived(data.event);

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
		return new Date(dateStr).toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatTime(dateStr: string): string {
		return new Date(dateStr).toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const isMultiDay = $derived.by(() => {
		if (!event?.end_date) return false;
		return new Date(event.start_date).toDateString() !== new Date(event.end_date).toDateString();
	});

	const isPast = $derived(event ? new Date(event.start_date) < new Date() : false);
	const hasForm = $derived(!!event?.registration_form);
</script>

<svelte:head>
	{#if event}
		<title>{event.title} | SV Koweg e.V.</title>
		<meta name="description" content={event.description ?? ''} />
		<meta property="og:title" content="{event.title} | SV Koweg e.V." />
		<meta property="og:description" content={event.description ?? ''} />
		<meta property="og:type" content="event" />
	{/if}
</svelte:head>

{#if event}
	<div class="mb-12 mt-4 space-y-6 sm:mt-6 sm:space-y-8 md:space-y-10">
		<!-- Zurück-Link -->
		<a
			href="/events"
			class="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/60 transition-colors hover:text-foreground"
		>
			<ArrowLeft size={16} class="transition-transform group-hover:-translate-x-1" />
			Alle Veranstaltungen
		</a>

		<!-- Header -->
		<div class="space-y-3 sm:space-y-4">
			<!-- Type Badge + Status -->
			<div class="flex flex-wrap items-center gap-2">
				{#if event.type}
					<span
						class="rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-xs {typeColors[event.type] ?? 'bg-gray-dark text-white'}"
					>
						{typeLabels[event.type] ?? event.type}
					</span>
				{/if}
				{#if isPast}
					<span class="rounded-none bg-gray-muted/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-muted sm:px-3 sm:py-1 sm:text-xs">
						Vergangen
					</span>
				{/if}
			</div>

			<!-- Titel -->
			<Headline as="h1" headline={event.title} />
		</div>

		<!-- Hero Bild -->
		{#if event.image}
			<div class="w-full overflow-hidden">
				<DirectusImage
					uuid={event.image.id}
					alt={event.title}
					width={1200}
					height={500}
					class="h-48 w-full object-cover sm:h-64 md:h-96"
				/>
			</div>
		{/if}

		<!-- Info-Karten Zeile -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
			<!-- Datum -->
			<div class="flex items-start gap-3 bg-[#eee] p-4 sm:p-5">
				<CalendarDays size={20} class="mt-0.5 flex-shrink-0 text-accent sm:size-[22px]" />
				<div class="min-w-0">
					<span class="text-xs font-semibold uppercase tracking-wide text-foreground/50 sm:text-sm">Datum</span>
					<p class="mt-0.5 font-heading text-sm font-bold text-foreground sm:text-base">
						{formatDate(event.start_date)}
					</p>
					{#if isMultiDay}
						<p class="text-xs text-gray-dark sm:text-sm">
							bis {formatDate(event.end_date!)}
						</p>
					{/if}
				</div>
			</div>

			<!-- Uhrzeit -->
			<div class="flex items-start gap-3 bg-[#eee] p-4 sm:p-5">
				<Clock size={20} class="mt-0.5 flex-shrink-0 text-accent sm:size-[22px]" />
				<div>
					<span class="text-xs font-semibold uppercase tracking-wide text-foreground/50 sm:text-sm">Uhrzeit</span>
					<p class="mt-0.5 font-heading text-sm font-bold text-foreground sm:text-base">
						{formatTime(event.start_date)}
						{#if event.end_date}
							– {formatTime(event.end_date)}
						{/if}
						Uhr
					</p>
				</div>
			</div>

			<!-- Ort -->
			{#if event.location}
				<div class="flex items-start gap-3 bg-[#eee] p-4 sm:p-5">
					<MapPin size={20} class="mt-0.5 flex-shrink-0 text-accent sm:size-[22px]" />
					<div class="min-w-0">
						<span class="text-xs font-semibold uppercase tracking-wide text-foreground/50 sm:text-sm">Ort</span>
						{#if event.location.link}
							<a
								href={event.location.link}
								target="_blank"
								rel="noopener noreferrer"
								class="group/loc mt-0.5 block font-heading text-sm font-bold text-foreground sm:text-base"
							>
								{event.location.title}
								<span class="block h-0.5 w-full max-w-0 bg-accent transition-all duration-500 group-hover/loc:max-w-full"></span>
							</a>
						{:else}
							<p class="mt-0.5 font-heading text-sm font-bold text-foreground sm:text-base">
								{event.location.title}
							</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Max Teilnehmer -->
			{#if event.max_participants}
				<div class="flex items-start gap-3 bg-[#eee] p-4 sm:p-5">
					<Users size={20} class="mt-0.5 flex-shrink-0 text-accent sm:size-[22px]" />
					<div>
						<span class="text-xs font-semibold uppercase tracking-wide text-foreground/50 sm:text-sm">Plätze</span>
						<p class="mt-0.5 font-heading text-sm font-bold text-foreground sm:text-base">
							max. {event.max_participants} Teams
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Inhalt + Formular -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
			<!-- Beschreibung / Content -->
			<div class="lg:col-span-2">
				{#if event.content}
					<div class="prose prose-sm max-w-none sm:prose-base md:prose-lg">
						{@html sanitizeHtml(event.content)}
					</div>
				{:else if event.description}
					<p class="text-base leading-relaxed text-foreground/80 sm:text-lg">
						{event.description}
					</p>
				{/if}
			</div>

			<!-- Anmeldeformular (Sidebar) -->
			{#if hasForm && !isPast}
				<div class="lg:col-span-1">
					<div class="sticky top-6 space-y-4">
						<Headline as="h3" headline="Anmeldung" class="text-xl sm:text-2xl md:text-3xl" />
						<FormBuilder form={event.registration_form} />
					</div>
				</div>
			{:else if isPast}
				<div class="lg:col-span-1">
					<div class="bg-[#eee] p-5 text-center sm:p-6">
						<p class="font-heading text-base font-semibold text-foreground/50 sm:text-lg">
							Diese Veranstaltung hat bereits stattgefunden.
						</p>
					</div>
				</div>
			{:else}
				<div class="lg:col-span-1">
					<div class="bg-[#eee] p-5 text-center sm:p-6">
						<p class="font-heading text-base font-semibold text-foreground/50 sm:text-lg">
							Keine Anmeldung erforderlich.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- 404 -->
	<div class="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
		<Headline as="h1" headline="Event nicht gefunden" />
		<p class="mt-4 text-base text-foreground/60 sm:text-lg">
			Dieses Event existiert nicht oder wurde entfernt.
		</p>
		<a
			href="/events"
			class="mt-6 bg-accent px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-secondary sm:px-6 sm:py-3 sm:text-sm"
		>
			Alle Veranstaltungen
		</a>
	</div>
{/if}
