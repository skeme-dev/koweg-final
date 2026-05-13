<script>
	import { page } from '$app/state';
	import PersonCard from '$lib/components/blocks/PersonCard.svelte';
	import Posts from '$lib/components/blocks/Posts.svelte';
	import RichText from '$lib/components/blocks/RichText.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';
	import TrainingCard from '$lib/components/ui/TrainingCard.svelte';
	import EventSection from '$lib/components/blocks/EventSection.svelte';
	import DirectusImage from '$lib/components/shared/DirectusImage.svelte';

    let { data } = $props();

    const team = $derived(data.teams.find((t) => t.slug === page.params.teamSlug) ?? {});
	const teamEvents = $derived(data.teamEvents ?? []);

</script>

<svelte:head>
	{#if team?.title}
		<title>{team.title} | SV Koweg e.V.</title>
		<meta name="description" content={team.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''} />
		<meta property="og:title" content="{team.title} | SV Koweg e.V." />
		<meta property="og:description" content={team.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? ''} />
		<meta property="og:type" content="website" />
	{/if}
</svelte:head>

<div class="flex-grow space-y-10 mb-12 mt-6">
	{#if team.image?.id}
		<figure class="overflow-hidden rounded-xl shadow-md">
			<DirectusImage
				uuid={team.image.id}
				alt={'Mannschaftsfoto ' + (team.title ?? '')}
				width={1200}
				height={675}
				class="h-auto w-full object-cover aspect-[16/9]"
				loading="eager"
			/>
		</figure>
	{/if}

	<div class="">
		<RichText
			data={{
				id: team.id,
				headline: team.title,
				alignment: 'left',
				content: team.description
			}}
			margin="none"
		/>
	</div>

	{#if team.members?.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Verantwortliche Personen" />
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each team.members as item}
					<PersonCard data={{ person: item }} />
				{/each}
			</div>
		</div>
	{/if}

	{#if team.trainings?.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Trainingszeiten" />
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each team.trainings as schedule}
					<TrainingCard data={{ schedule }} />
				{/each}
			</div>
		</div>
	{/if}

	{#if teamEvents.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Veranstaltungen" />
			<EventSection events={teamEvents} linkBase="/events" />
		</div>
	{/if}

	{#if team.related_posts?.length > 0}
		<div class="space-y-3">
			<Posts data={{ headline: "Aktuelle Beiträge", posts: team.related_posts, limit: 3 }} />
		</div>
	{/if}
</div>
