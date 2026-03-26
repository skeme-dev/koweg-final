<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown } from '@lucide/svelte';
	import * as Collapsible from '../ui/collapsible/';
	import { slide } from 'svelte/transition';
	import { cn } from '$lib/utils';

	const navigation = $derived(page.data.headerNavigation);
	const departments = $derived(page.data.departments ?? []);
	const pathname = $derived(page.url.pathname);

	/**
	 * Findet die passende Navigationsgruppe basierend auf dem aktuellen Pfad.
	 * Wählt die spezifischste Übereinstimmung (längster matchender Pfad gewinnt).
	 */
	const currentGroup = $derived.by(() => {
		if (!navigation?.items) return null;

		let bestMatch: { item: any; matchLength: number } | null = null;

		for (const item of navigation.items) {
			if (!item.children || item.children.length === 0) continue;


			for (const child of item.children) {
				// Match über Department-Slug
				if (child.department?.slug) {
					const depPath = `/abteilungen/${child.department.slug}`;
					if (pathname.startsWith(depPath) && depPath.length > (bestMatch?.matchLength ?? 0)) {
						bestMatch = { item, matchLength: depPath.length };
					}
				}

				// Match über Page-Permalink (aber nie '/' alleine)
				const permalink = child.page?.permalink;
				if (permalink && permalink !== '/' && pathname.startsWith(permalink) && permalink.length > (bestMatch?.matchLength ?? 0)) {
					bestMatch = { item, matchLength: permalink.length };
				}
			}

			// Match über Parent-Permalink (aber nie '/' alleine)
			const parentPermalink = item.page?.permalink;
			if (parentPermalink && parentPermalink !== '/' && pathname.startsWith(parentPermalink) && parentPermalink.length > (bestMatch?.matchLength ?? 0)) {
				bestMatch = { item, matchLength: parentPermalink.length };
			}
		}

		return bestMatch?.item ?? null;
	});

	const isAbteilungenSection = $derived(pathname.startsWith('/abteilungen'));

	/**
	 * Prüft ob ein Eintrag gerade aktiv ist (fett markiert)
	 */
	function isActive(child: any): boolean {
		if (child.department?.slug) {
			return pathname.startsWith(`/abteilungen/${child.department.slug}`);
		}
		if (child.page?.permalink) {
			return pathname === child.page.permalink || pathname.startsWith(child.page.permalink + '/');
		}
		return false;
	}

	/**
	 * Gibt die href für einen Navigationseintrag zurück
	 */
	function getHref(child: any): string {
		if (child.department?.slug) {
			return `/abteilungen/${child.department.slug}`;
		}
		return child.page?.permalink ?? child.url ?? '#';
	}

	/**
	 * Findet die Teams einer Abteilung über die departments-Daten
	 */
	function getTeams(child: any): any[] {
		if (!child.department?.id) return [];
		const dep = departments.find((d: any) => d.id === child.department.id);
		return dep?.teams ?? [];
	}

</script>

{#if currentGroup && currentGroup.children.length > 0}
	<div class="mr-12 hidden flex-col lg:flex w-full">
		<h1 class="mb-3 text-xl font-semibold">Weitere Seiten</h1>
		<ul class="divide-y">
			{#each currentGroup.children as child}
				{@const teams = isAbteilungenSection ? getTeams(child) : []}
				{@const active = isActive(child)}

				{#if teams.length > 0}
					<!-- Abteilung mit Teams: Collapsible -->
					<Collapsible.Root open={active}>
						<Collapsible.Trigger class="w-full group">
							<li class="flex justify-between w-full items-center space-x-3 py-2">
								<a
									class={cn('text-lg', active && 'font-semibold')}
									href={getHref(child)}
								>
									{child.title}
								</a>
								<ChevronDown
									class="size-4 transition-transform duration-300 ease-in-out group-data-[state=open]:rotate-180"
								/>
							</li>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="mt-2 pl-4" transition:slide={{ duration: 250 }}>
								{#each teams as team}
									{@const teamHref = `/abteilungen/${child.department.slug}/teams/${team.slug}`}
									<li class="pb-2">
										<a
											class={cn('text-md', pathname === teamHref && 'font-semibold')}
											href={teamHref}
										>
											{team.title}
										</a>
									</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				{:else}
					<!-- Einfacher Link -->
					<li class="py-2">
						<a
							class={cn('text-lg', active && 'font-semibold')}
							href={getHref(child)}
						>
							{child.title}
						</a>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}
