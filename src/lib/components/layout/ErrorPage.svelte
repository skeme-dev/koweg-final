<script lang="ts">
	import { page } from '$app/state';
	import Container from '$lib/components/ui/Container.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';

	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);

	/**
	 * Meldungen aus den Loadern ("Diese Abteilung gibt es nicht.") sind
	 * hilfreich, die generischen von SvelteKit ("Not Found") nicht.
	 */
	const rawMessage = $derived(page.error?.message ?? '');
	const message = $derived(
		['Not Found', 'Internal Error', 'Error'].includes(rawMessage) ? '' : rawMessage
	);

	const heading = $derived(isNotFound ? 'Seite nicht gefunden' : 'Da ist etwas schiefgelaufen');
	const explanation = $derived(
		isNotFound
			? 'Die Seite wurde vielleicht verschoben oder umbenannt. Über diese Wege kommst du weiter:'
			: 'Bitte versuche es später noch einmal. Falls der Fehler bleibt, schreib uns gern.'
	);

	const links = [
		{ href: '/', label: 'Zur Startseite' },
		{ href: '/events', label: 'Veranstaltungen' }
	];

	/**
	 * Eine Übersichtsseite /abteilungen gibt es nicht - die Navigation führt
	 * direkt zu den einzelnen Abteilungen. Deshalb hier dieselben Ziele
	 * anbieten, sofern die Layout-Daten beim Fehler geladen waren (siehe
	 * routes/abteilungen/+error.svelte).
	 *
	 * Auch die noch unveröffentlichten sind dabei - sie stehen ebenso in der
	 * Navigation und zeigen eine "Coming Soon"-Seite.
	 */
	const departments = $derived(
		(page.data?.departments ?? []).filter((dept: any) => dept?.slug && dept?.title)
	);
</script>

<svelte:head>
	<title>{heading} | SV Koweg e.V.</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<Container class="flex-grow py-16 md:py-24">
	<div class="mx-auto max-w-2xl space-y-6 text-center">
		<p class="font-heading text-6xl font-bold text-accent md:text-7xl">{status}</p>

		<Headline as="h1" headline={heading} />

		<p class="text-lg text-foreground/70">{explanation}</p>

		{#if message}
			<p class="text-foreground/60">{message}</p>
		{/if}

		<nav aria-label="Weiterführende Links" class="flex flex-wrap justify-center gap-3 pt-4">
			{#each links as link}
				<a
					href={link.href}
					class="border-input rounded-lg border px-5 py-2.5 text-foreground transition-colors hover:bg-accent hover:text-white"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		{#if isNotFound && departments.length > 0}
			<div class="space-y-3 pt-8">
				<p class="text-sm font-medium uppercase tracking-wide text-foreground/50">
					Unsere Abteilungen
				</p>
				<nav aria-label="Abteilungen" class="flex flex-wrap justify-center gap-2">
					{#each departments as dept}
						<a
							href="/abteilungen/{dept.slug}"
							class="rounded-md bg-gray px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-white dark:bg-[var(--background-variant-color)]"
						>
							{dept.title}
						</a>
					{/each}
				</nav>
			</div>
		{/if}
	</div>
</Container>
