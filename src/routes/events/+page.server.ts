import { fetchAllEvents } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const events = await fetchAllEvents(event.fetch);

	return {
		events
	};
}) satisfies PageServerLoad;
