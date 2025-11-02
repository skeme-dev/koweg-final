<script>
	import SiteMap from "../SiteMap.svelte";

    let { children} = $props();
</script>

<div class="flex w-full">
    <div class="hidden lg:block w-full max-w-[25%] mt-6">
        <SiteMap />
    </div>
    

    {@render children()}

</div>
