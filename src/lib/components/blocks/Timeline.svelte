<script lang="ts">
	import DirectusImage from "../shared/DirectusImage.svelte";

    let { data}: TimelineProps = $props();

    interface TimelineProps {
        data: {
            timeline_items: [{
                title: string;
                description: string;
                image:  {
                    id: string;
                },
                sort: number;
            }]
        }
    }

    const timelineItems = $derived.by(() => {
        return data.timeline_items.sort((a, b) => a.sort - b.sort);
    })

</script>

<div class="grid grid-cols-2">
    {#each timelineItems as item, index}
        {#if index % 2 == 0}
				<div class="flex flex-col justify-center p-6 border-r-[6px] bg-[#eee] border-[#eee]">
					<h1 class="ml-auto font-bold mb-3 text-2xl">{item.title}</h1>
					<p class="text-right">{@html item.description}</p>
				</div>
				<div class="bg-[#eee] p-6">
                    <DirectusImage uuid={item.image.id} alt={item.title} width={400} height={300} />
				</div>
			{:else}
				<div class="border-r-[6px] border-[#eee] p-6">
                    <DirectusImage uuid={item.image.id} alt={item.title} width={400} height={300} />
				</div>
				<div class="flex flex-col justify-center px-3 pl-6 pb-6">
					<h1 class="mr-auto font-bold mb-3 text-2xl">{item.title}</h1>
					<p class="">{@html item.description}</p>
				</div>
			{/if}
    {/each}
</div>