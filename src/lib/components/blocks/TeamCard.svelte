<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';

	let { data, galleryMode = false }: TeamCardProps = $props();

	interface TeamCardProps {
		data: {
			team: {
				title: string;
				slug: string;
				image: {
					id: string;
				};
			};
			departmentSlug: string;
		};
		galleryMode?: boolean;
	}

	const team = $derived(data.team);
</script>

{#if galleryMode}
	<a
		href={`/abteilungen/${data.departmentSlug}/teams/${team.slug}`}
		class="group block overflow-hidden rounded-xl bg-accent text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:text-white hover:no-underline hover:shadow-xl"
	>
		<div class="relative overflow-hidden">
			{#if team.image}
				<DirectusImage
					class="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
					uuid={team.image.id}
					alt={'Foto von ' + team.title}
					width={450}
					height={208}
				/>
			{:else}
				<div class="flex h-52 w-full items-center justify-center bg-white/10">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5" />
						<circle cx="9" cy="7" r="4" stroke="white" stroke-width="1.5" stroke-opacity="0.5" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5" />
					</svg>
				</div>
			{/if}
			<div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
		</div>

		<div class="flex items-center justify-between p-5">
			<span class="text-lg font-bold leading-tight">{team.title}</span>
			<svg
				class="shrink-0 translate-x-0 transition-transform duration-300 group-hover:translate-x-1"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M5 12h14M13 6l6 6-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</div>
	</a>
{/if}
