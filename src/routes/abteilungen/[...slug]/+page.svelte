<script lang="ts">
	import { page } from '$app/state';
	import PersonCard from '$lib/components/blocks/PersonCard.svelte';
	import Posts from '$lib/components/blocks/Posts.svelte';
	import RichText from '$lib/components/blocks/RichText.svelte';
	import TeamGallery from '$lib/components/blocks/TeamGallery.svelte';
	import PageBreadcrumb from '$lib/components/layout/PageBreadcrumb.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';
	import { id } from 'zod/v4/locales';

	const currentSlug = $derived(page.url.pathname.split('/')[2]);
	const department = $derived.by(() => {
		return page.data.departments.find((dept) => dept.slug === currentSlug);
	});


	const leader = $derived(department?.leader ?? []);
</script>

<!-- {department.title} -->
<div class="flex-grow space-y-10 mb-12 mt-6" style="--page-hero-image-url: url(https://koweg.demo.skeme.dev/VGG.jpg)">
	<div class="">
		<RichText
			data={{
				id: department.id,
				headline: department.title,
				alignment: 'left',
				content: department.description
			}}
			margin="none"
		/>
	</div>

	{#if leader.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Verantwortliche Personen" />
			{#each leader as item}
				<PersonCard data={{ person: item }} />
			{/each}
		</div>
	{/if}

    {#if department.teams.length > 0}
        <div class="space-y-3">
            <Headline as="h3" headline="Unsere Mannschaften" />
            <TeamGallery data={{items: department.teams}} />
        </div>
    {/if}


    {#if department.related_posts.length > 0}
    <div class="space-y-3">
        <!-- <Headline as="h3" headline="Aktuelle Beiträge" /> -->
        <Posts data={{ headline: "Aktuelle Beiträge", posts: department.related_posts, limit: 3 }} />
        
    </div>
    {/if}
</div>
