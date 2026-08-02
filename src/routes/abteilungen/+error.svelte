<script lang="ts">
	/**
	 * Eigene Fehlergrenze für /abteilungen: dadurch rendert SvelteKit die
	 * Fehlerseite innerhalb dieses Layouts, und `page.data.departments` aus
	 * +layout.server.ts ist verfügbar. Die Seite kann dann direkt zu den
	 * Abteilungen weiterleiten statt nur zur Startseite.
	 */
	import ErrorPage from '$lib/components/layout/ErrorPage.svelte';
</script>

<ErrorPage />
