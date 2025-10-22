<script lang="ts">
	import { PUBLIC_FALLBACK_IMAGE_ID } from "$env/static/public";
	import { getDirectusAssetURL } from "$lib/directus/directus-utils";

    let { image } = $props(); 
    
</script>

<div class="w-full h-[40vh] bg-cover bg-center bg-no-repeat" style="background-image: url({getDirectusAssetURL(image?.id ?? PUBLIC_FALLBACK_IMAGE_ID)});"></div>
