import { fetchEventsByTeam } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const slug = event.params.slug;

	// Find the team ID from layout data
	const teams = event.data?.teams ?? [];
	const team = teams.find((t: any) => t.slug === slug);

	let teamEvents: any[] = [];
	if (team?.id) {
		teamEvents = await fetchEventsByTeam(team.id, event.fetch);
	}

	return {
		teamEvents
	};
}) satisfies PageServerLoad;
