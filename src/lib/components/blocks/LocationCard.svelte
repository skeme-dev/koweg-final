<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize';

	interface LocationCardProps {
		data: {
			title?: string | null;
			description?: string | null;
			link?: string | null;
			image?: {
				id: string;
			} | null;
		};
	}

	let { data }: LocationCardProps = $props();

	const title = $derived(data.title ?? '');
	const description = $derived(data.description ?? '');
	const link = $derived(data.link ?? '');
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
