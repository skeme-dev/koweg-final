<script lang="ts">
	import AutoScroll from 'embla-carousel-auto-scroll';
	import Autoplay from 'embla-carousel-autoplay';
    import emblaCarouselSvelte from 'embla-carousel-svelte'
	import DirectusImage from '../shared/DirectusImage.svelte';

    // const sponsors = ["https://koweg.demo.skeme.dev/VGG.jpg", "https://koweg.demo.skeme.dev/Birkenstock.jpg", "https://koweg.demo.skeme.dev/Skan.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg"]

    let { sponsors } = $props();

    // Ein Sponsor ohne hinterlegtes Bild kommt als `image: null` an. Ohne diesen
    // Filter wirft `sponsor.image.id` beim SSR und nimmt die komplette Seite mit
    // (500 statt eines fehlenden Logos).
    const withImage = $derived((sponsors ?? []).filter((s) => s?.image?.id));

    const plugins = [Autoplay(), AutoScroll()]
    const options = {
        loop: true
    }
</script>

{#if withImage.length > 0}
<div class="overflow-hidden" use:emblaCarouselSvelte="{{ plugins, options }}">
    <div class="flex items-center">
        {#each withImage as sponsor}
            <div class="min-w-0 embla__slide">
                <DirectusImage uuid={sponsor.image.id} alt={sponsor.title ?? 'Sponsor'} />
            </div>
        {/each}
    </div>
</div>
{/if}
<style>
    .embla__slide {
        flex: 0 0 20%;
    }
</style>