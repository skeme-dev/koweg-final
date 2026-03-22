<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown } from '@lucide/svelte';
	import * as Collapsible from '../ui/collapsible/';
	import { slide } from 'svelte/transition';
	import { cn } from '$lib/utils';

	const navigation = $derived(page.data.headerNavigation);
	const otherSites = $derived.by(() => {
		return findNavigationGroup() ?? [];
	});

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
	<div class="mr-12 hidden flex-col lg:flex w-full">
		<h1 class="mb-3 text-xl font-semibold">Weitere Seiten</h1>
		<ul class="divide-y">
			{#each otherSites as site}
				{@const dep = page.data.departments?.find((d) => d.id === site.department?.id)}
				{#if dep && dep?.teams.length > 0}
					<Collapsible.Root>
						<Collapsible.Trigger class="w-full group">
							<li class="flex justify-between w-full items-center space-x-3 py-2">
								<!-- <ChevronDown class="w-4 h-4" /> -->
								<a
									class={cn("text-lg", (page.url.pathname.split('/')[2] === site.department?.slug) ? "font-semibold" : "")}
									href={`/abteilungen/${site.page?.permalink || site.department?.slug}`}
									>{site.title}</a
								>
								<ChevronDown
									class="size-4 transition-transform duration-300 ease-in-out group-data-[state=open]:rotate-180"
								/>
							</li>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="mt-2 pl-4" transition:slide={{ duration: 250 }}>
								{#each dep.teams as team}
									<li class="pb-2">
										<a
											class="text-md"
											href={`/abteilungen/${site.department.slug}/teams/${team.slug}`}
											>{team.title}</a
										>
									</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				{:else if site.department?.slug}
					<li class="py-2">
						<a class={cn("text-lg", (page.url.pathname.split('/')[2] === site.department?.slug) ? "font-bold" : "")}  href={`/abteilungen/${site.department?.slug}`}>{site.title}</a>
					</li>
				{:else}
					<li class="py-2">
						<a class="text-lg" href={`${site.page?.permalink}`}>{site.title}</a>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}
