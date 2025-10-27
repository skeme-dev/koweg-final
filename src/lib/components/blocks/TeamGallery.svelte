 <script lang="ts">
	import TeamCard from "./TeamCard.svelte";

    let {data}: TeamCardProps = $props();

    interface TeamCardProps {
        data: {
            departmentSlug: string;
            items: Array<{
                team: {
                    title: string;
                    slug: string;
                    image: {
                        id: string;
                    }
                }
            }>
        }
    }

    const teams = $derived(data.items);

    console.log("related teams", teams);
    
 </script>

 {#if teams.length > 0}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {#each teams as team}
            <TeamCard galleryMode data={{team: team, departmentSlug: data.departmentSlug}} />
        {/each}
    </div>
 {/if}