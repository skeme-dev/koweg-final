<script lang="ts">
	import '../globals.css';
	import '../fonts.css';
	import NavigationBar from '$lib/components/layout/NavigationBar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { getDirectusAssetURL } from '$lib/directus/directus-utils';
	import { page } from '$app/state';
	import BaseLayout from '$lib/components/layout/BaseLayout.svelte';

	let { children, data } = $props();

	const siteTitle = $derived(data.globals?.title || 'SV Koweg e.V.');
	const siteDescription = $derived(
		page.data.globals?.description || 'A starter CMS template powered by Svelte and Directus.'
	);
	const logoURL = $derived(
		data.globals?.logo ? getDirectusAssetURL(data.globals.logo) : '/images/logo.svg'
	);
	const faviconURL = $derived(
		data.globals?.favicon ? getDirectusAssetURL(data.globals.favicon) : logoURL
	);
	const accentColor = $derived(data.globals?.accent_color || '#6644ff');

	// Validate accent color to prevent XSS via @html style injection
	const safeAccentColor = $derived(
		/^#[0-9a-fA-F]{3,8}$/.test(accentColor) ? accentColor : '#6644ff'
	);
</script>

<svelte:head>
	<title>{siteTitle} | SV Koweg e.V.</title>
	<meta name="description" content={siteDescription} />
	<link rel="icon" href={faviconURL} />
</svelte:head>

<div style="--accent-color: {safeAccentColor};">
	<NavigationBar />
	<BaseLayout>
		<main class="flex-grow">
			{@render children()}
		</main>
	</BaseLayout>
	<Footer />
</div>
