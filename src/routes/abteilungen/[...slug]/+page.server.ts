import { error } from '@sveltejs/kit';
import { fetchEventsByDepartment } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, parent, fetch }) => {
	// Layout-Daten kommen über parent(). `event.data` gibt es in einem
	// +page.server.ts nicht - dadurch war `department` immer undefined und die
	// Veranstaltungen wurden nie geladen.
	const { departments } = await parent();
	const department = (departments ?? []).find((d: any) => d.slug === params.slug);

	if (!department) {
		error(404, 'Diese Abteilung gibt es nicht.');
	}

	return {
		departmentId: department.id,
		departmentEvents: await fetchEventsByDepartment(department.id, fetch)
	};
}) satisfies PageServerLoad;
