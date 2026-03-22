import { fetchAllEvents } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const events = await fetchAllEvents(event.fetch);

	console.log("fetched events:", events)

	return {
		events
	};
}) satisfies PageServerLoad;
