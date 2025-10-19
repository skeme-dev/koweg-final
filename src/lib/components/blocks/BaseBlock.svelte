<script lang="ts">
	import Hero from '$lib/components/blocks/Hero.svelte';
	import RichText from '$lib/components/blocks/RichText.svelte';
	import Gallery from '$lib/components/blocks/Gallery.svelte';
	import Pricing from '$lib/components/blocks/Pricing.svelte';
	import Posts from '$lib/components/blocks/Posts.svelte';
	import Form from '$lib/components/blocks/Form.svelte';
	import PersonCard from './PersonCard.svelte';
	import LocationCard from './LocationCard.svelte';
	import Timeline from './Timeline.svelte';
	import FileCard from './FileCard.svelte';
	import SponsorGallery from './SponsorGallery.svelte';
	import OpeningTime from './OpeningTime.svelte';
	interface BaseBlockProps {
		block: {
			collection: string;
			item: any;
			id: string;
		};
	}

	let { block }: BaseBlockProps = $props();

	const components = {
		block_hero: Hero,
		block_richtext: RichText,
		block_gallery: Gallery,
		block_pricing: Pricing,
		block_posts: Posts,
		block_form: Form,
		block_person_card: PersonCard,
		block_location_card: LocationCard,
		block_timeline: Timeline,
		block_file_card: FileCard,
		block_sponsor_gallery: SponsorGallery,
		block_opening_time: OpeningTime
	} as const;

	const Component = $derived(components[block.collection as keyof typeof components]);
</script>

{#if Component}
	<Component data={block.item} />
{:else}
	<div>
		<h1>Block konnte nicht gefunden werden {block.collection}</h1>
	</div>
{/if}
