<script lang="ts">
	import { page } from '$app/state';
	import * as Breadcrumb from '../ui/breadcrumb/index';

	const pathname = $derived(page.url.pathname);

	function buildBreadcrumb() {
		const path = pathname.replace(/\/+$/, '') || '/';
		const pathParts = path.split('/').filter((part) => part.length > 0);

		// Root → keine Crumbs
		if (path === '/') return [];

		// Events-Routen
		if (path === '/events') {
			return [{ label: 'Veranstaltungen', href: '/events' }];
		}

		if (path.startsWith('/events/')) {
			const eventSlug = pathParts[1];
			const event = page.data?.event;
			return [
				{ label: 'Veranstaltungen', href: '/events' },
				event
					? { label: event.title, href: `/events/${event.slug}` }
					: { label: eventSlug ?? 'Event' }
			];
		}

		// Blog-Routen
		if (path === '/blog') {
			return [{ label: 'Blog', href: '/blog' }];
		}

		if (path.startsWith('/blog/')) {
			const postSlug = pathParts[1];
			const post = page.data?.post;
			return [
				{ label: 'Blog', href: '/blog' },
				post
					? { label: post.title, href: `/blog/${postSlug}` }
					: { label: postSlug ?? 'Beitrag' }
			];
		}

		// Teams-Routen (Top-Level)
		if (path.startsWith('/teams/')) {
			const teamSlug = pathParts[1];
			const team = teamSlug ? page.data?.teams?.find((t: any) => t.slug === teamSlug) : null;
			return [
				{ label: 'Teams', href: '/teams' },
				team
					? { label: team.title, href: `/teams/${team.slug}` }
					: { label: teamSlug ?? 'Mannschaft' }
			];
		}

		// Abteilungen-Routen
		if (path.startsWith('/abteilungen/')) {
			const [, , depSlug] = path.split('/');
			const dep = depSlug ? page.data.departments?.find((dep: any) => dep.slug === depSlug) : null;
			if (pathParts.includes('teams')) {
				const teamSlug = pathParts[3];
				const team = teamSlug ? page.data?.teams?.find((t: any) => t.slug === teamSlug) : null;
				return [
					{ label: 'Abteilungen', href: '/abteilungen' },
					dep
						? { label: dep.title, href: `/abteilungen/${dep.slug}` }
						: { label: depSlug ?? 'Abteilung' },
					team
						? { label: team.title, href: `/abteilungen/${dep?.slug}/teams/${team.slug}` }
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

{#if page.data?.template != 'landing_page' && breadcrumb.length > 0}
	<div class="mb-4 mt-8 flex max-w-7xl sm:mb-6 sm:mt-12">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
			<span class="hidden text-lg sm:inline">Sie befinden sich hier: </span>

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
