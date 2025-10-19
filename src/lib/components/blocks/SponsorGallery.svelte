<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';
	import Headline from '../ui/Headline.svelte';

	let { data }: SponsorGalleryProps = $props();

	interface SponsorGalleryProps {
		data: {
			id: string;
			title?: string;
			items: Array<{
				sponsor: {
					id: string;
					title: string;
					type: 'main_sponsor' | 'normal_sponsor';
					image: {
						id: string;
					};
					link: string;
				};
				sort?: number;
			}>;
		};
	}

	const sponsors = $derived([...data.items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)));
	const title = $derived(data.title);
</script>

{#if title}
	<Headline headline={title} />
{/if}

{#if sponsors.length > 0}
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
		{#each sponsors as sponsorItem}
		<div class="flex justify-center items-center p-3 hover:bg-[#eee] transition-all duration-200">
			<a href={sponsorItem.sponsor.link} class="max-h-64 flex">
				<DirectusImage uuid={sponsorItem.sponsor.image.id} alt={sponsorItem.sponsor.title} height={200} />
			</a>
			</div>
		{/each}
	</div>
{/if}
