import type { PageServerLoad } from './$types';

export const load = (() => {
	return {
		template: 'landing_page'
	};
}) satisfies PageServerLoad;
