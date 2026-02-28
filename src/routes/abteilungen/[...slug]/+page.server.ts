import { fetchEventsByDepartment } from '$lib/directus/fetchers';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	const slug = event.params.slug;

	// Find the department ID from layout data
	const departments = event.data?.departments ?? [];
	const department = departments.find((d: any) => d.slug === slug);

	let departmentEvents: any[] = [];
	if (department?.id) {
		departmentEvents = await fetchEventsByDepartment(department.id, event.fetch);
	}

	return {
		departmentEvents
	};
}) satisfies PageServerLoad;
