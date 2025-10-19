<script lang="ts">
	import { PUBLIC_DIRECTUS_URL } from '$env/static/public';

	import { page } from '$app/state';
	import Container from '../ui/Container.svelte';
	import LightSwitch from './LightSwitch.svelte';
	import Headline from '../ui/Headline.svelte';
	import SponsorCarousel from './SponsorCarousel.svelte';
	import SplideTest from '../blocks/SplideTest.svelte';
	import FooterCarousel from './FooterCarousel.svelte';

	const directusURL = PUBLIC_DIRECTUS_URL;

	const globals = $derived(page.data?.globals);
	const navPrimary = $derived(page.data?.footerNavigation);
	const lightLogoUrl = $derived(
		globals?.logo ? `${directusURL}/assets/${globals.logo}` : '/images/logo.svg'
	);
	const darkLogoUrl = $derived(
		globals?.logo_dark_mode ? `${directusURL}/assets/${globals.logo_dark_mode}` : ''
	);

	const mainSponsors = $derived(globals?.main_sponsors ?? []);
</script>

<footer class="bg-gray py-16 dark:bg-[var(--background-variant-color)]">
	<Container class="text-foreground">
		<div class="space-y-6">
			<Headline headline="Unsere Sponsoren" />
			<!-- <SponsorCarousel items={logos} marquee speed={80} gap={24} pauseOnHover>
				{#snippet item(value, i)}
					<div
						style="padding:12px 20px; background:#111; color:#fff; border-radius:12px; white-space:nowrap;"
					>
						{i + 1}. {value}
					</div>
				{/snippet}
			</SponsorCarousel> -->
			<div class="relative">
				<FooterCarousel sponsors={mainSponsors} />
			</div>
		</div>
	</Container>
	<Container class="text-foreground dark:text-white">
		<div class="flex flex-col items-start justify-between gap-8 pt-8 md:flex-row">
			<div class="flex-1">
				<a href="/">
					{#if lightLogoUrl}
						<img
							src={lightLogoUrl}
							alt="Logo"
							class={darkLogoUrl ? 'h-auto w-[120px] dark:hidden' : 'h-auto w-[120px]'}
						/>
					{/if}
					{#if darkLogoUrl}
						<img
							src={darkLogoUrl}
							alt="Logo (Dark Mode)"
							class="hidden h-auto w-[120px] dark:block"
						/>
					{/if}
				</a>
				{#if globals?.description}
					<p class="text-description mt-2">{globals.description}</p>
				{/if}

				<!-- {/* Social Links */} -->
				{#if globals?.social_links}
					<div class="mt-4 flex space-x-4">
						{#each globals.social_links as social}
							<!-- key={social.service} -->
							<a
								href={social.url}
								target="_blank"
								rel="noopener noreferrer"
								class="hover:text-accent"
							>
								<img
									src={`/icons/social/${social.service === 'x' ? 'twitter' : social.service}.svg`}
									alt={`${social.service} icon`}
									width={24}
									height={24}
									class="size-6 dark:invert"
								/>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex flex-1 flex-col items-start md:items-end">
				<nav class="flex w-full space-x-24 text-left md:w-auto">
					<ul class="space-y-4">
						{#if navPrimary?.items}
							{#each navPrimary.items.filter((item) => {
								return item.children.length === 0;
							}) as item}
								<li>
									{#if item.children && item.page}
										<a href={item.page.permalink} class="text-nav font-medium hover:underline">
											{item.title}
										</a>
									{:else}
										<a href={item?.url || '#'} class="text-nav font-medium hover:underline">
											{item.title}
										</a>
									{/if}
								</li>
							{/each}
						{/if}
					</ul>
					{#each navPrimary.items.filter((item) => {
						return item.children.length !== 0;
					}) as group}
						<ul class="space-y-4">
							<li class="text-nav font-bold">
								{group.title}
							</li>
							{#if group.children?.length > 0}
								{#each group.children as item}
									<li>
										{#if item.children && item.page}
											<a href={item.page.permalink} class="text-nav font-medium hover:underline">
												{item.title}
											</a>
										{:else}
											<a href={item?.url || '#'} class="text-nav font-medium hover:underline">
												{item.title}
											</a>
										{/if}
									</li>
								{/each}
							{/if}
						</ul>
					{/each}
				</nav>
			</div>
		</div>
	</Container>
</footer>
