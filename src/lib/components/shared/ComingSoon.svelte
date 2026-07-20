<script lang="ts">
	import { CalendarClock } from '@lucide/svelte';

	interface ComingSoonProps {
		/** Name der Abteilung bzw. Mannschaft */
		title?: string | null;
		/** Steuert die Textbausteine */
		kind: 'department' | 'team';
	}

	const { title, kind }: ComingSoonProps = $props();

	const copy = $derived(
		kind === 'department'
			? {
					badge: 'Abteilung in Vorbereitung',
					lead: 'Diese Abteilung stellt sich gerade vor.',
					body: 'Wir tragen noch Trainingszeiten, Ansprechpartner und Bilder zusammen. Sobald alles steht, findest du hier alle Infos zum Mitmachen.'
				}
			: {
					badge: 'Mannschaft in Vorbereitung',
					lead: 'Diese Mannschaft stellt sich gerade vor.',
					body: 'Kader, Trainingszeiten und Ansprechpartner werden gerade zusammengetragen. Schau bald wieder vorbei.'
				}
	);
</script>

<section
	class="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--accent-color),transparent_80%)] bg-[color-mix(in_srgb,var(--accent-color),transparent_95%)] px-6 py-14 text-center sm:px-10 sm:py-20"
>
	<div class="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
		<span
			class="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent-color),transparent_70%)] bg-background px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-accent"
		>
			<span class="dot" aria-hidden="true"></span>
			{copy.badge}
		</span>

		<div class="space-y-3">
			<h1 class="font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-headline">
				Bald verfügbar
			</h1>
			{#if title}
				<p class="font-heading text-xl font-semibold text-accent md:text-2xl">{title}</p>
			{/if}
		</div>

		<div class="space-y-2 text-gray-dark">
			<p class="text-lg font-semibold">{copy.lead}</p>
			<p class="text-regular leading-relaxed">{copy.body}</p>
		</div>

		<p class="flex items-center gap-2 pt-2 text-sm text-gray-muted">
			<CalendarClock class="size-4 shrink-0" aria-hidden="true" />
			Diese Seite wird gerade redaktionell befüllt.
		</p>
	</div>
</section>

<style>
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background-color: var(--accent-color);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	/* Bewegung ist reine Dekoration - bei Bedarf abschalten */
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
</style>
