<script lang="ts">
	import PageBuilder from '$lib/components/layout/PageBuilder.svelte';
	import ComingSoon from '$lib/components/shared/ComingSoon.svelte';
	
	import type { PageBlock } from '$lib/types/directus-schema.js';

	let { data } = $props();

	const isComingSoon = $derived.by(() => data.status === 'unpublished');

	const blocks: PageBlock[] = $derived.by(() => {
		if (!data.blocks) return [];
		return data.blocks.filter(
			(block: any): block is PageBlock => typeof block === 'object' && block.collection
		);
	});
</script>

<svelte:head>
	<title>{data.title || ''}</title>
	<meta name="description" content={data.description || ''} />
</svelte:head>

<div class="relative"> 
	{#if isComingSoon}
	<div class="pb-6">
		<ComingSoon kind="page" title={data.title} />
	</div>
		{:else}
		<PageBuilder sections={blocks} />
	{/if}
</div>
