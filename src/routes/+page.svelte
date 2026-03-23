<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_DIRECTUS_URL } from '$env/static/public';

	const globals = $derived(page.data.globals);
	const directusURL = PUBLIC_DIRECTUS_URL;
	const lightLogoUrl = $derived(
		globals?.logo ? `${directusURL}/assets/${globals.logo}` : '/images/logo.svg'
	);
	const darkLogoUrl = $derived(
		globals?.logo_dark_mode ? `${directusURL}/assets/${globals.logo_dark_mode}` : ''
	);

	const socialLinks = $derived(globals?.social_links ?? []);

	const socialIconMap: Record<string, string> = {
		facebook: '/icons/social/facebook.svg',
		instagram: '/icons/social/instagram.svg',
		youtube: '/icons/social/youtube.svg',
		twitter: '/icons/social/twitter.svg',
		x: '/icons/social/twitter.svg',
		linkedin: '/icons/social/linkedin.svg',
		github: '/icons/social/github.svg',
		discord: '/icons/social/discord.svg'
	};
</script>

<svelte:head>
	<title>SV Koweg e.V.</title>
	<meta
		name="description"
		content="Wir betreiben Leistungssport mit unserer Homepage und machen sie fit für die Zukunft"
	/>
</svelte:head>

<!-- Hero-Bereich mit Akzentfarbe -->
<div class="relative overflow-hidden">
	<!-- Hintergrund-Fläche -->
	<div class="absolute inset-0 bg-accent">
		<!-- Diagonale Deko-Elemente -->
		<div class="absolute -right-20 -top-20 h-96 w-96 rotate-12 bg-white/5"></div>
		<div class="absolute -bottom-16 -left-16 h-72 w-72 -rotate-6 bg-white/5"></div>
		<div class="absolute right-1/4 top-1/3 h-40 w-40 rotate-45 bg-white/[0.03]"></div>
	</div>

	<div
		class="relative flex min-h-[80vh] flex-col items-center justify-center px-4 py-20 text-center"
	>
		<!-- Logo mit weißem Hintergrund -->
		<div class="mb-12 bg-white/95 p-6 shadow-xl sm:p-8 md:p-10">
			<img
				src={lightLogoUrl}
				alt="SV Koweg e.V."
				class="mx-auto h-auto w-[160px] sm:w-[220px] md:w-[280px]"
			/>
		</div>

		<!-- Haupttext -->
		<div class="max-w-3xl">
			<p
				class="font-heading text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl"
			>
				Wir betreiben <span class="text-white/80">Leistungssport</span> mit unserer Homepage
			</p>
			<div class="mx-auto my-6 h-[3px] w-24 bg-white/40 sm:my-8"></div>
			<p class="font-heading text-lg font-medium text-white/75 sm:text-xl md:text-2xl">
				und machen sie fit für die Zukunft
			</p>
		</div>

		<!-- Social Links -->
		<!-- {#if socialLinks.length > 0}
			<div class="mt-14 flex items-center gap-5">
				{#each socialLinks as social}
					{#if socialIconMap[social.service]}
						<a
							href={social.url}
							target="_blank"
							rel="noopener noreferrer"
							class="opacity-60 transition-opacity hover:opacity-100"
							aria-label={social.service}
						>
							<img
								src={socialIconMap[social.service]}
								alt={social.service}
								width="28"
								height="28"
								class="size-7 invert"
							/>
						</a>
					{/if}
				{/each}
			</div>
		{/if} -->
	</div>
</div>

<!-- Unterer Infobereich -->
<div class="bg-background py-16 sm:py-20">
	<div class="mx-auto max-w-2xl px-4 text-center">
		<div class="mb-6 flex items-center justify-center gap-3">
			<div class="h-2 w-2 animate-pulse bg-accent"></div>
			<p class="font-heading text-sm font-semibold uppercase tracking-widest text-accent">
				In Bearbeitung
			</p>
			<div class="h-2 w-2 animate-pulse bg-accent"></div>
		</div>
		<p class="font-heading text-base leading-relaxed text-foreground/70 sm:text-lg">
			Unsere neue Website wird gerade vorbereitet. Schaut bald wieder vorbei!
		</p>
	</div>
</div>
