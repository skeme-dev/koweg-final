<script lang="ts">
	import { page } from "$app/state";
	import DirectusImage from "../shared/DirectusImage.svelte";

    let {data, galleryMode = false}: TeamCardProps = $props();

    interface TeamCardProps {
        data: {
            team: {
                title: string;
                slug: string;
                image: {
                    id: string;
                }
            },
            departmentSlug: string;
        },
        galleryMode?: boolean;
    }

    const team = $derived(data.team);

    console.log(page.data)
</script>

{#if galleryMode}
    <div class="bg-accent text-white rounded">
        <div class="max-w-1/2 h-max">
            {#if team.image}
                <DirectusImage uuid={team.image.id} alt={"Foto von " + team.title} />
            {/if}
        </div>
        <div class="p-6 flex justify-center items-center">
            <a href={`/abteilungen/${data.departmentSlug}/teams/${team.slug}`} class="text-center font-medium text-xl">{team.title}</a>
        </div>
    </div>
{/if}