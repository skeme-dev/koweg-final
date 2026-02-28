import { fetchEventBySlug } from '$lib/directus/fetchers';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const slug = event.params.slug;
	const eventData = await fetchEventBySlug(slug, event.fetch);

	if (!eventData) {
		error(404, { message: 'Event nicht gefunden.' });
	}

	return {
		event: eventData
	};
}) satisfies PageServerLoad;
