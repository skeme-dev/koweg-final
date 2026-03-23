import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { useDirectus } from '$lib/directus/directus';

export const GET: RequestHandler = async ({ request, fetch }) => {
	const { searchParams } = new URL(request.url);
	const search = searchParams.get('search');

	if (!search || search.length < 3) {
		return json({ error: 'Query must be at least 3 characters.' }, { status: 400 });
	}

	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	const typeLabels: Record<string, string> = {
		turnier: 'Turnier',
		veranstaltung: 'Veranstaltung',
		training: 'Training',
		sonstiges: 'Sonstiges'
	};

	try {
		const [pages, posts, events] = await Promise.all([
			directus.request(
				readItems('pages', {
					filter: {
						_or: [
							{ title: { _contains: search } },
							{ permalink: { _contains: search } }
						]
					},
					fields: ['id', 'title', 'permalink']
				})
			),

			directus.request(
				readItems('posts', {
					filter: {
						_and: [
							{ status: { _eq: 'published' } },
							{
								_or: [
									{ title: { _contains: search } },
									{ description: { _contains: search } },
									{ slug: { _contains: search } },
									{ content: { _contains: search } }
								]
							}
						]
					},
					fields: ['id', 'title', 'description', 'slug', 'content', 'status']
				})
			),

			directus.request(
				readItems('events', {
					filter: {
						_and: [
							{ status: { _eq: 'published' } },
							{
								_or: [
									{ title: { _contains: search } },
									{ description: { _contains: search } },
									{ slug: { _contains: search } },
									{ location_title: { _contains: search } }
								]
							}
						]
					},
					fields: ['id', 'title', 'description', 'slug', 'type']
				})
			)
		]);

		const results = [
			...pages.map((page: any) => ({
				id: page.id,
				title: page.title,
				type: 'Page',
				link: `/${page.permalink.replace(/^\/+/, '')}`
			})),

			...posts.map((post: any) => ({
				id: post.id,
				title: post.title,
				description: post.description,
				type: 'Post',
				link: `/blog/${post.slug}`
			})),

			...events.map((event: any) => ({
				id: event.id,
				title: event.title,
				description: event.description,
				type: 'Event',
				subtype: event.type ? (typeLabels[event.type] ?? event.type) : undefined,
				link: `/events/${event.slug}`
			}))
		];

		return json(results);
	} catch (error) {
		console.error('Error fetching search results:', error);

		return json({ error: 'Failed to fetch search results.' }, { status: 500 });
	}
};
