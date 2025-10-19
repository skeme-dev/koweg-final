<script>
	import PageBreadcrumb from '$lib/components/layout/PageBreadcrumb.svelte';
	import SubPageLayout from '$lib/components/layout/templates/SubPageLayout.svelte';

    let { children } = $props();
</script>
<!-- <PageBreadcrumb /> -->
<SubPageLayout>
    {@render children()}
</SubPageLayout>