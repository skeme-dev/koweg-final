<script lang="ts">
	import { page } from '$app/state';

	const navigation = $derived(page.data.headerNavigation);
	const otherSites = $derived.by(() => {
		return findNavigationGroup() ?? [];
	});

	function findNavigationGroup() {
		const pathname = page.url.pathname;

		for (const item of navigation.items) {
			if (item.children.length == 0) continue;

			for (const child of item.children) {
				if (pathname.startsWith(child.page.permalink)) {
					return item.children;
				}
			}
		}
	}
</script>

{#if otherSites.length > 0}
	<div class="flex flex-col">
		<h1 class="mb-3 text-xl font-semibold">Weitere Seiten</h1>
		<ul class="divide-y">
			{#each otherSites as site}
				<li class="py-2">
					<a class="text-lg" href={`${site.page.permalink}`}>{site.title}</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}
