<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown } from '@lucide/svelte';
	import * as Collapsible from '../ui/collapsible/';
	import { slide } from 'svelte/transition';

	const navigation = $derived(page.data.headerNavigation);
	const otherSites = $derived.by(() => {
		return findNavigationGroup() ?? [];
	});

	console.log(otherSites);

	console.log('PAGE DATA', page.data);

	function findNavigationGroup() {
		const pathname = page.url.pathname;

		for (const item of navigation.items) {
			if (item.children.length == 0) continue;

			for (const child of item.children) {
				if (
					pathname.startsWith(child.page?.permalink || '/abteilungen/' + child.department?.slug)
				) {
					return item.children;
				}
			}
		}
	}
</script>

{#if otherSites.length > 0}
	<div class="mr-12 flex flex-col">
		<h1 class="mb-3 text-xl font-semibold">Weitere Seiten</h1>
		<ul class="divide-y">
			{#each otherSites as site}
				{@const dep = page.data.departments?.find((d) => d.id === site.department?.id)}
				{#if dep && dep?.teams.length > 0}
					<Collapsible.Root>
						<Collapsible.Trigger class="w-full">
							<li class="w-full py-2 flex items-center space-x-3">
								<ChevronDown class="w-4 h-4" />
								<a class="text-lg" href={`/abteilungen/${site.page?.permalink || site.department?.slug}`}
									>{site.title}</a
								>
							</li>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="mt-2 pl-4" transition:slide>
								{#each dep.teams as team}
									<li class="pb-2">
										<a class="text-md" href={`/abteilungen/${site.department.slug}/teams/${team.slug}`}>{team.title}</a>
									</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				{:else}
					<li class="py-2">
						<a class="text-lg" href={`/abteilungen/${site.page?.permalink || site.department?.slug}`}
							>{site.title}</a
						>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}
