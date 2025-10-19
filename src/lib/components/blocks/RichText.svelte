<script lang="ts">
	import setAttr from '$lib/directus/visualEditing';
	import { cn } from '$lib/utils';
	import Headline from '../ui/Headline.svelte';
	import Tagline from '../ui/Tagline.svelte';
	import Text from '../ui/Text.svelte';

	interface RichTextProps {
		data: {
			id: string;
			headline?: string;
			content: string;
			alignment?: 'left' | 'center' | 'right';
			tagline?: string; 
		};
		class?: string;
		margin?: "none" | "normal";
	}; 

	let { data, class: className, margin }: RichTextProps = $props();

	const { headline, content, alignment = 'left', id } = $derived(data);
</script>

<div
	class={cn(
		'space-y-3',
		margin === "none" ? "mx-0": "mx-auto", 
		alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left',
		className
	)}
>
	{#if headline}
		<Headline
			{headline}
			data-directus={setAttr({
				collection: 'block_richtext',
				item: id,
				fields: 'headline',
				mode: 'popover'
			})}
		/>
	{/if}
	{#if content}
		<Text
			{content}
			data-directus={setAttr({
				collection: 'block_richtext',
				item: id,
				fields: 'content',
				mode: 'drawer'
			})}
		/>
	{/if}
</div>

