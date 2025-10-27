<script lang="ts">
	import DirectusImage from '../shared/DirectusImage.svelte';

	let { data, size = 'large' }: PersonCardProps = $props();

	interface PersonCardProps {
		data: {
			person: {
				first_name?: string;
				last_name?: string;
				email?: string;
				title?: string;
				avatar?: {
					id: string;
				};
			};
		};
		size?: 'small' | 'large';
	}

	const person = $derived(data.person);
</script>

<div class="bg-accent flex w-full text-white">
	<div class="flex w-full flex-col">
		{#if person.avatar}
			<DirectusImage
				class="ml-auto !h-[200px] object-cover"
				width={450}
				height={160}
				uuid={person.avatar.id}
				alt={'Foto von ' + person.first_name + person.last_name}
			/>
		{/if}
		<div class="flex flex-col p-12">
			{#if person.title}
				<div class="mb-2">{person.title}</div>
			{/if}
			<div class="mb-6 text-3xl font-bold">{person.first_name} {person.last_name}</div>
			<div class="underline">
				<a class="font-medium" href={'mailto:' + person.email}>{person.email}</a>
			</div>
			<!-- <div class="underline">
							<a class="font-medium" href={'tel:' + mitglied.tel}>{mitglied.tel}</a>
						</div> -->
		</div>
	</div>
</div>
