<script lang="ts">
	import PersonCard from "./PersonCard.svelte";

    let { data }: PersonGalleryProps = $props();
    
    interface PersonGalleryProps {
        data: {
            related_person: Array<{
                sort: number;
                related_user: {
                    first_name: string;
                    last_name: string;
                    email: string;
                    title: string;
                    avatar: {
                        id: string;
                    };
                }
            }>;
        }
    }

    const personGalleryData = $derived.by(() => {
        return (data?.related_person ?? []).sort((a,b) => (a?.sort || 0) - (b?.sort || 0)).map(person => person.related_user);
    })

</script>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each personGalleryData as person}
        <PersonCard data={{ person }} />
    {/each}
</div>
