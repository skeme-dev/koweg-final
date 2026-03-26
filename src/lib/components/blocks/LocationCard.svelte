<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize';

	let { data }: LocationCardProps = $props();

	interface LocationCardProps {
		data: {
			title: string;
			description: string;
			link: string;
			image: {
				id: string;
			};
		};
	}

	const location = $derived(data);
</script>

<div class="bg-[#eee]">
	<div class="flex justify-between flex-col md:flex-row">
		<div class="flex flex-col px-8 py-12">
			<div class="text-2xl font-bold">{location.title}</div>
			<div class="my-3 text-sm font-medium">{@html sanitizeHtml(location.description)}</div>
			<div class="">
				<a class="font-semibold" href={location.link} target="_blank">Link zur Sportstätte</a>
			</div>
		</div>

		{#if location.image}
			<DirectusImage
				uuid={location.image.id}
				alt={'Foto von ' + location.title}
				width={285}
				height={160}
			/>
		{/if}
	</div>
</div>
