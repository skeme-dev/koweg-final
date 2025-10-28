<script lang="ts">
	import '../globals.css';
	import '../fonts.css';
	import NavigationBar from '$lib/components/layout/NavigationBar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { getDirectusAssetURL } from '$lib/directus/directus-utils';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
	import HeroImage from '$lib/components/layout/HeroImage.svelte';
	import PageBreadcrumb from '$lib/components/layout/PageBreadcrumb.svelte';
	import BaseLayout from '$lib/components/layout/BaseLayout.svelte';

	let { children, data } = $props();

	const siteTitle = $derived(data.globals?.title || 'SV Koweg e.V.');
	$inspect(siteTitle);
	const siteDescription = $derived(
		page.data.globals?.description || 'A starter CMS template powered by Svelte and Directus.'
	);
	const faviconURL = $derived(
		data.globals?.favicon ? getDirectusAssetURL(data.globals.favicon) : '/favicon.ico'
	);
	const accentColor = $derived(data.globals?.accent_color || '#6644ff');

	// onMount(async () => {
	// 	const { apply } = await import('@directus/visual-editing');
	// 	apply({
	// 		directusUrl: PUBLIC_DIRECTUS_URL
	// 		// onSaved: async (...e) => {
	// 		// 	console.log('SAVED', e);
	// 		// 	await new Promise((r) => setTimeout(r, 2000));
	// 		// 	await invalidateAll();
	// 		// }
	// 	});
	// });
	console.log('layout data', page.url.pathname.startsWith('/blog/'));
</script>

<svelte:head>
	<title>{siteTitle} | SV Koweg e.V.</title>
	<meta name="description" content={siteDescription} />
	<link rel="icon" href={faviconURL} />
	{@html `<style>:root{ --accent-color: ${accentColor} !important }</style>`}
</svelte:head>

<NavigationBar />
<BaseLayout>
	<main class="flex-grow">
		{@render children()}
	</main>
</BaseLayout>
<Footer />
