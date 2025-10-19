<script lang="ts">
	let { data }: OpeningCardProps = $props();

	interface OpeningCardProps {
		data: {
			sort?: number;
			openings: Array<{
				label: string;
				value: string;
			}>;
		};
	}

	const { openings } = $derived(data);
</script>

<div class="flex w-full flex-col bg-[#eee] p-6 md:space-x-12">
	<div class="mb-4 flex items-center md:space-x-5">
		<svg
			class="hidden md:block"
			width="28"
			height="28"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g clip-path="url(#clip0_945_1108)">
				<circle cx="12" cy="12" r="11" stroke="black" stroke-width="2" />
				<path d="M12.0112 7L12 12.6361" stroke="black" stroke-width="2" stroke-linecap="round" />
				<path d="M15 16L12 13" stroke="black" stroke-width="2" stroke-linecap="round" />
				<rect x="11" y="9" width="1" height="4" fill="black" />
			</g>
			<defs>
				<clipPath id="clip0_945_1108">
					<rect width="24" height="24" fill="white" />
				</clipPath>
			</defs>
		</svg>
		<h1 class="text-xl font-semibold">Öffnungszeiten</h1>
	</div>
	<div class="flex flex-col">
		<div class="md:openings-grid openings-grid grid gap-x-6 gap-y-3">
			{#each openings as opening}
				<span>{opening.label}</span>
				<span>{opening.value}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.openings-grid {
		grid-template-columns: 1fr 1fr;
	}

	@media (min-width: 768px) {
		.openings-grid {
			grid-template-columns: auto 1fr;
		}
	}
</style>