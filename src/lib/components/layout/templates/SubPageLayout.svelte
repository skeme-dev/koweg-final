<script>
	import SiteMap from "../SiteMap.svelte";

    let { children} = $props();
</script>

<div class="flex w-full lg:space-x-12">
    <div class="hidden lg:block min-w-[20%] mt-6">
        <SiteMap />
    </div>
    

    {@render children()}

</div>
