<script>
	import { Splide, SplideSlide, SplideTrack } from '@splidejs/svelte-splide';

    import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';

	import '@splidejs/svelte-splide/css/core';
	import DirectusImage from '../shared/DirectusImage.svelte';

	const options = {
		rewind: true,
		gap: "0rem",
        perPage: 4,
		arrows: false,
        height: "8rem",
        autoScroll: {
            speed: 1,
            rewind: true,
        }
	};
</script>

<Splide aria-label="My Favorite Images" {options} hasTrack={false} extensions={{AutoScroll}}>
	<SplideTrack>
		<SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/4bbf125f-0dd7-44d0-a432-ffee48b3928c" alt="">
        </SplideSlide>
        <SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/4bbf125f-0dd7-44d0-a432-ffee48b3928c" alt="">
        </SplideSlide>
        <SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/a3f0e1da-85a4-4b31-9da2-b11916fdeb68" alt="">
        </SplideSlide>
        <SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/4bbf125f-0dd7-44d0-a432-ffee48b3928c" alt="">
        </SplideSlide>
        <SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/4bbf125f-0dd7-44d0-a432-ffee48b3928c" alt="">
        </SplideSlide>
        <SplideSlide>
            <img class="max-h-32" src="http://localhost:8055/assets/a3f0e1da-85a4-4b31-9da2-b11916fdeb68" alt="">
        </SplideSlide>
	</SplideTrack>
</Splide>
