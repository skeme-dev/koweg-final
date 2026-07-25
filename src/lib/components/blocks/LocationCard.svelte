<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize';

	interface LocationRef {
		title?: string | null;
		link?: string | null;
		description?: string | null;
	}

	interface LocationCardProps {
		data: {
			title?: string | null;
			description?: string | null;
			link?: string | null;
			image?: {
				id: string;
			} | null;
			// Referenz auf die Locations-Tabelle (hat Vorrang vor den Inline-Feldern)
			location?: LocationRef | null;
		};
	}

	let { data }: LocationCardProps = $props();

	// Referenzierte Location gewinnt; Inline-Felder als Fallback (Abwärtskompatibilität)
	const title = $derived(data.location?.title ?? data.title ?? '');
	const description = $derived(data.location?.description ?? data.description ?? '');
	const link = $derived(data.location?.link ?? data.link ?? '');
	const image = $derived(data.image);
</script>

<div class="bg-[#eee]">
	<div class="flex flex-col justify-between md:flex-row">
		<div class="flex flex-col px-8 py-12">
			<div class="text-2xl font-bold">{title}</div>
			{#if description}
				<div class="my-3 text-sm font-medium">{@html sanitizeHtml(description)}</div>
			{/if}
			{#if link}
				<div>
					<a class="font-semibold" href={link} target="_blank">Link zur Sportstätte</a>
				</div>
			{/if}
		</div>

		{#if image}
			<DirectusImage uuid={image.id} alt={'Foto von ' + title} width={285} height={160} />
		{/if}
	</div>
</div>
