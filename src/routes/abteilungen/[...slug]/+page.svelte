<script lang="ts">
	import { page } from '$app/state';
	import PersonCard from '$lib/components/blocks/PersonCard.svelte';
	import Posts from '$lib/components/blocks/Posts.svelte';
	import RichText from '$lib/components/blocks/RichText.svelte';
	import TeamGallery from '$lib/components/blocks/TeamGallery.svelte';
	import EventSection from '$lib/components/blocks/EventSection.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';
	import { sortBySortField } from '$lib/utils';

	const currentSlug = $derived(page.url.pathname.split('/')[2]);
	const department = $derived.by(() => {
		return page.data.departments.find((dept) => dept.slug === currentSlug);
	});

	const leader = $derived(department?.leader ?? []);
	const teams = $derived(sortBySortField(department?.teams ?? []));
	const departmentEvents = $derived(page.data.departmentEvents ?? []);
</script>

<svelte:head>
	{#if department}
		<title>{department.title} | SV Koweg e.V.</title>
		<meta name="description" content={department.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''} />
		<meta property="og:title" content="{department.title} | SV Koweg e.V." />
		<meta property="og:description" content={department.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''} />
		<meta property="og:type" content="website" />
	{/if}
</svelte:head>

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
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each leader as item}
					<PersonCard data={{ person: item }} />
				{/each}
			</div>
		</div>
	{/if}

	{#if teams.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Unsere Mannschaften" />
			<TeamGallery data={{items: teams, departmentSlug: department.slug}} />
		</div>
	{/if}

	{#if departmentEvents.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Veranstaltungen" />
			<EventSection events={departmentEvents} linkBase="/events" />
		</div>
	{/if}

	{#if department.related_posts?.length > 0}
		<div class="space-y-3">
			<Posts data={{ headline: "Aktuelle Beiträge", posts: department.related_posts, limit: 3 }} />
		</div>
	{/if}
</div>
