<script lang="">
	import { page } from "$app/state";
	import Breadcrumb from "../ui/breadcrumb/breadcrumb.svelte";
	import NavigationBar from "./NavigationBar.svelte";
	import LandingLayout from "./templates/LandingLayout.svelte";
	import MainLayout from "./templates/MainLayout.svelte";
	import SubPageLayout from "./templates/SubPageLayout.svelte";

    const templateNames = {
        "main": "main_page",
        "landing": "landing_page", 
        "subpage": "sub_page"
    }

    let { children } = $props();
</script>

<!-- Hero image -->

{#if page.data.template == templateNames.main}
    <MainLayout>
        {@render children()}
    </MainLayout>
{:else if page.data.template == templateNames.landing}
    <LandingLayout >
        {@render children()}
    </LandingLayout>
{:else if page.data.template == templateNames.subpage}
    <SubPageLayout>
        {@render children()}
    </SubPageLayout> 
{:else}
    <p>Achtung es wurde kein template ausgewählt.</p>
{/if}