<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
	import PageBuilder from '$lib/components/layout/PageBuilder.svelte';
	import type { PageBlock } from '$lib/types/directus-schema.js';
	import { Button } from '$lib/components/ui/button';
	import { Pencil } from '@lucide/svelte';
	import { setAttr } from '$lib/directus/visualEditing';
	import BaseLayout from '$lib/components/layout/BaseLayout.svelte';

	let { data } = $props();

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
	<PageBuilder sections={blocks} />
</div>
