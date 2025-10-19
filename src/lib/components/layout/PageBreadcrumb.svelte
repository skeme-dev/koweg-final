<script lang="ts">
	import { page } from '$app/state';
	import * as Breadcrumb from '../ui/breadcrumb/index';

	const pathname = $derived(page.url.pathname);

	console.log(page.data);

	function buildBreadcrumb() {
		const path = pathname.replace(/\/+$/, '') || '/';

		// Root → keine Crumbs
		if (path === '/') return [];

		// feste Routen
		if (path === '/teams') return [{ label: 'Teams', href: '/teams' }];
		if (path.startsWith('/teams/')) {
			const [, , teamSlug] = path.split('/');
			const team = teamSlug ? page.data?.teams.find((team) => team.slug === teamSlug) : null;
			return [
				{ label: 'Teams', href: '/teams' },
				team ? { label: team.title, href: `/teams/${team.slug}` } : { label: teamSlug ?? 'Team' }
			];
		}

		if (path === '/abteilungen') return [{ label: 'Abteilungen', href: '/abteilungen' }];
		if (path.startsWith('/abteilungen/')) {
			const [, , depSlug] = path.split('/');
			const dep = depSlug ? page.data.departments?.find((dep) => dep.slug === depSlug) : null;
			return [
				{ label: 'Abteilungen', href: '/abteilungen' },
				dep
					? { label: dep.title, href: `/abteilungen/${dep.slug}` }
					: { label: depSlug ?? 'Abteilung' }
			];
		}

		return [{ label: page.data.title, href: page.data.permalink }];
	}

	const breadcrumb = $derived.by(() => buildBreadcrumb());

	console.log(breadcrumb);
</script>

<div class="max-w-7xl sm:px-6 lg:px-16 mx-auto flex mt-12 mb-6">

	<div class="flex items-center justify-center space-x-6">
		<span class="text-lg">Sie befinden sich hier: </span>
		
		<Breadcrumb.Root>
			<Breadcrumb.List>
				{#each breadcrumb as item, index}
				<Breadcrumb.Item>
					<Breadcrumb.Link href={item.href}>{item.label}</Breadcrumb.Link>
				</Breadcrumb.Item>
				{#if index !== breadcrumb.length - 1}
				<Breadcrumb.Separator />
				{/if}
				{/each}
			</Breadcrumb.List>
		</Breadcrumb.Root>
		
	</div>
</div>