<script>
	import BaseLayout from '$lib/components/layout/BaseLayout.svelte';

    let { children} = $props();
</script>

<BaseLayout>
    {@render children()}
</BaseLayout>