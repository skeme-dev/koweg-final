<script>
	import SubPageLayout from '$lib/components/layout/templates/SubPageLayout.svelte';

    let { children } = $props();
</script>

{@render children()}
