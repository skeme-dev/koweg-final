<script>
	import SubPageLayout from '$lib/components/layout/templates/SubPageLayout.svelte';

    let { children } = $props();
</script>
<SubPageLayout>
    {@render children()}
</SubPageLayout>