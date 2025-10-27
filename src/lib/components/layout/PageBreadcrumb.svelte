<script lang="ts">
	import { page } from '$app/state';
	import * as Breadcrumb from '../ui/breadcrumb/index';

	const pathname = $derived(page.url.pathname);

	function buildBreadcrumb() {
		const path = pathname.replace(/\/+$/, '') || '/';
		const pathParts = path.split('/').filter((part) => part.length > 0);

		// Root → keine Crumbs
		if (path === '/') return [];

		// feste Routen
		// if (path.startsWith('/teams/')) {
		// 	const [, , teamSlug] = path.split('/');
		// 	const team = teamSlug ? page.data?.teams?.find((team) => team.slug === teamSlug) : null;
		// 	return [
		// 		{ label: 'Teams', href: '/teams' },
		// 		team ? { label: team.title, href: `/teams/${team.slug}` } : { label: teamSlug ?? 'Team' }
		// 	];
		// }

		if (path.startsWith('/abteilungen/')) {
			const [, , depSlug] = path.split('/');
			const dep = depSlug ? page.data.departments?.find((dep) => dep.slug === depSlug) : null;
			if (pathParts.includes('teams')) {
				const teamSlug = pathParts[3];
				const team = teamSlug ? page.data?.teams?.find((team) => team.slug === teamSlug) : null;
				return [
					{ label: 'Abteilungen', href: '/abteilungen' },
					dep
						? { label: dep.title, href: `/abteilungen/${dep.slug}` }
						: { label: depSlug ?? 'Abteilung' },
					team
						? { label: team.title, href: `/abteilungen/${dep.slug}/teams/${team.slug}` }
						: { label: teamSlug ?? 'Mannschaft' }
				];
			} else {
				return [
					{ label: 'Abteilungen', href: '/abteilungen' },
					dep
						? { label: dep.title, href: `/abteilungen/${dep.slug}` }
						: { label: depSlug ?? 'Abteilung' }
				];
			}
		}

		return [{ label: page.data.title, href: page.data.permalink }];
	}

	const breadcrumb = $derived.by(() => buildBreadcrumb());
</script>

{#if page.data?.template != 'landing_page'}
	<div class="mx-auto mb-6 mt-12 flex max-w-7xl sm:px-6 lg:px-16">
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
{/if}
