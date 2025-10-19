<script lang="ts">
	import AutoScroll from 'embla-carousel-auto-scroll';
	import Autoplay from 'embla-carousel-autoplay';
    import emblaCarouselSvelte from 'embla-carousel-svelte'
	import DirectusImage from '../shared/DirectusImage.svelte';

    // const sponsors = ["https://koweg.demo.skeme.dev/VGG.jpg", "https://koweg.demo.skeme.dev/Birkenstock.jpg", "https://koweg.demo.skeme.dev/Skan.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg", "https://koweg.demo.skeme.dev/Landskron.jpg"]

    let { sponsors } = $props();
    
console.log(sponsors);

    const plugins = [Autoplay(), AutoScroll()]
    const options = {
        loop: true
    }
</script>

{#if sponsors.length > 0}
<div class="overflow-hidden" use:emblaCarouselSvelte="{{ plugins, options }}">
    <div class="flex">
        {#each sponsors as sponsor}
            <div class="min-w-0 embla__slide">
                <DirectusImage uuid={sponsor.image.id} alt="bild" />
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