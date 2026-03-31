<script>
	import { page } from '$app/state';
	import { getDirectusAssetURL } from '$lib/directus/directus-utils';

	let { children } = $props();

	const glob = $derived(page.data?.globals);
</script>

<section
	class="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] flex h-[60vh] w-screen items-center justify-start overflow-hidden"
>
	<!-- Hero Image -->
	<img
		src={getDirectusAssetURL("04a26447-8ef3-4abe-b7a9-d4c8471ac2f7")}
		alt="Hero"
		class="absolute inset-0 h-full w-full object-cover"
	/>

	<!-- Overlay -->
	<div class="absolute inset-0 bg-black/40"></div>

	<!-- Text -->
	<div class="relative flex h-full w-full items-center">
		<div class="mx-auto max-w-7xl p-4 sm:px-6 lg:px-16">
			<h1 class="text-4xl font-bold text-white md:text-6xl">
				SV Koweg e.V. - Sport verbindet uns!
			</h1>
			<p class="mt-4 text-lg text-white/90">
				Willkommen beim SV Koweg e.V., Ihrem Partner für Sport und Gemeinschaft. Entdecken Sie unsere Teams, Abteilungen und Veranstaltungen für jedes Alter und erfahren Sie mehr über unsere Werte und unsere Arbeit für den Sport in der Region.
			</p>
		</div>
	</div>
</section>

{@render children()}

<style>
	:global(.hero-text h1) {
		color: #fff !important;
		font-weight: 700;
	}
</style>
