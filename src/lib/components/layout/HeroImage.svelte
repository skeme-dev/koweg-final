<script lang="ts">
	import { PUBLIC_FALLBACK_IMAGE_ID } from "$env/static/public";
	import { getDirectusAssetURL } from "$lib/directus/directus-utils";

    let { image } = $props(); 
    
</script>

<div class="w-full h-[40vh] bg-cover bg-center bg-no-repeat" style="background-image: url({getDirectusAssetURL(image?.id ?? "04a26447-8ef3-4abe-b7a9-d4c8471ac2f7")});"></div>
