<script lang="">
	import { page } from "$app/state";
	import Breadcrumb from "../ui/breadcrumb/breadcrumb.svelte";
	import HeroImage from "./HeroImage.svelte";
	import NavigationBar from "./NavigationBar.svelte";
	import PageBreadcrumb from "./PageBreadcrumb.svelte";
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


{#if page.data?.template != 'landing_page' && !page.url.pathname.startsWith('/blog/')}
<HeroImage image={page.data?.hero_image} />
		<PageBreadcrumb />
{/if}

{#if page.data.template == templateNames.main}
    <MainLayout>
        {@render children()}
    </MainLayout>
{:else if page.data.template == templateNames.landing}
    <LandingLayout >
        {@render children()}
    </LandingLayout>
{:else if page.data.template == templateNames.subpage || page.url.pathname.startsWith("/abteilungen") || page.url.pathname.startsWith("/teams")}
    <SubPageLayout>
        {@render children()}
    </SubPageLayout> 
{:else}
    {@render children()}
{/if}