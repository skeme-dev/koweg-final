import { error } from '@sveltejs/kit';
import { fetchEventsByTeam } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, parent, fetch }) => {
	// Siehe Abteilungs-Loader: Layout-Daten über parent(), nicht über event.data.
	const { teams } = await parent();
	const team = (teams ?? []).find((t: any) => t.slug === params.teamSlug);

	if (!team) {
		error(404, 'Diese Mannschaft gibt es nicht.');
	}

	return {
		teamEvents: await fetchEventsByTeam(team.id, fetch)
	};
}) satisfies PageServerLoad;
