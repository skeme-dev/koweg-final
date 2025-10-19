import { fetchDepartmentsData } from '$lib/directus/fetchers';
import type { Load } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export const load: Load = async ({ url, params, fetch }) => {
  const departments = await fetchDepartmentsData(fetch);

  return {
    departments
  }
}