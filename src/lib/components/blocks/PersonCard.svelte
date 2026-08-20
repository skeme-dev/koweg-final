<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';

	let { data, size = 'large' }: PersonCardProps = $props();

	interface PersonCardProps {
		data: {
			person: {
				first_name?: string;
				last_name?: string;
				email?: string;
				title?: string;
				avatar?: {
					id: string;
				};
			};
		};
		size?: 'small' | 'large';
	}

	const person = $derived(data.person);
</script>
{#if person}
	

<div class="group flex flex-col overflow-hidden rounded-xl bg-accent text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
	{#if person?.avatar}
	<div class="overflow-hidden">
		<DirectusImage
				class="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
				width={450}
				height={208}
				uuid={person?.avatar?.id}
				alt={`Foto von ${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim()}
			/>
		</div>
		{:else}
		<div class="flex h-52 w-full items-center justify-center bg-white/10">
			<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="12" cy="8" r="4" stroke="white" stroke-width="1.5" stroke-opacity="0.5" />
				<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5" />
			</svg>
		</div>
		{/if}
		
		<div class="flex flex-1 flex-col gap-1 p-5">
			{#if person?.title}
			<div class="text-sm font-medium opacity-70">{person?.title}</div>
			{/if}
			<div class="text-xl font-bold leading-tight">{person?.first_name} {person?.last_name}</div>
			{#if person?.email}
			<a
				class="mt-2 w-fit text-sm text-white opacity-75 underline underline-offset-4 transition-opacity hover:text-white hover:opacity-100"
				href={'mailto:' + person?.email}
			>
				{person?.email}
			</a>
			{/if}
		</div>
	</div>
	
	{/if}