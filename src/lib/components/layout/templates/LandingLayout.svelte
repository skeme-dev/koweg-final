<script>
	import { page } from '$app/state';

	let { children } = $props();

	const glob = $derived(page.data?.globals);
</script>

<section
	class="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] flex h-[60vh] w-screen items-center justify-start overflow-hidden"
>
	<!-- Hero Image -->
	<img
		src="https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1950&q=80"
		alt="Hero"
		class="absolute inset-0 h-full w-full object-cover"
	/>

	<!-- Overlay -->
	<div class="absolute inset-0 bg-black/40"></div>

	<!-- Text -->
	<div class="relative flex h-full w-full items-center">
		<div class="mx-auto max-w-7xl p-4 sm:px-6 lg:px-16">
			<h1 class="text-4xl font-bold text-white md:text-6xl">
				Container-ausgerichtete Hero Headline
			</h1>
			<p class="mt-4 text-lg text-white/90">
				Der Text bleibt im Layout, während das Bild über die gesamte Seite gezogen wird.
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
