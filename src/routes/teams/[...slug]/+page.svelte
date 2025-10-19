<script>
	import { page } from '$app/state';
	import PersonCard from '$lib/components/blocks/PersonCard.svelte';
	import Posts from '$lib/components/blocks/Posts.svelte';
	import RichText from '$lib/components/blocks/RichText.svelte';
	import Headline from '$lib/components/ui/Headline.svelte';
	import TrainingCard from '$lib/components/ui/TrainingCard.svelte';

    let { data } = $props();

    console.log('team page data', data);

    const team = $derived(data.teams.find((t) => t.slug === page.params.slug) ?? {});

    console.log("current team", team);
</script>

<div class="flex-grow space-y-10 mb-12 mt-6">
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

	{#if team.members.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Verantwortliche Personen" />
			{#each team.members as item}
				<PersonCard data={{ person: item }} />
			{/each}
		</div>
	{/if}

    {#if team.trainings.length > 0}
		<div class="space-y-3">
			<Headline as="h3" headline="Trainingszeiten" />
			{#each team.trainings as schedule}
				<TrainingCard data={{ schedule }} />
			{/each}
		</div>
	{/if}

    {#if team.related_posts.length > 0}
    <div class="space-y-3">
        <!-- <Headline as="h3" headline="Aktuelle Beiträge" /> -->
        <Posts data={{ headline: "Aktuelle Beiträge", posts: team.related_posts, limit: 3 }} />
        
    </div>
    {/if}
</div>
