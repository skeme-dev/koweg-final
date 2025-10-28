<script>
	import SiteMap from "../SiteMap.svelte";

    let { children} = $props();
</script>

<div class="flex mx-auto max-w-7xl sm:px-6 lg:px-16">
    <div class="hidden lg:block w-full max-w-[25%] mt-6">
        <SiteMap />
    </div>
    

    {@render children()}

</div>
