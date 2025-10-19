import { useDirectus } from "$lib/directus/directus";
import { authentication, createDirectus, rest, schemaApply, schemaDiff, schemaSnapshot } from "@directus/sdk";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
    const BASE_DIRECTUS_URL = 'https://localhost:8055';
    
    const TARGET_DIRECTUS_URL = 'https://directus.skeme.dev';
    
    const { getDirectus } = useDirectus();
        const directus = getDirectus(fetch);
    const targetDirectus = createDirectus(TARGET_DIRECTUS_URL).with(rest()).with(authentication());;
    
    await targetDirectus.login('admin@example.com', 'd1r3ctu5' );
    
    
    async function migrate() {
      const snapshot = await getSnapshot();
        const diff = await getDiff(snapshot);
        
        console.log(snapshot)
      await applyDiff(diff);
    }
    
    
    function getSnapshot() {
      return directus.request(schemaSnapshot());
    }
    
    function getDiff(snapshot) {
      return targetDirectus.request(schemaDiff(snapshot));
    }
    
    function applyDiff(diff) {
      return targetDirectus.request(schemaApply(diff));
    }

    await migrate();

    return new Response("got it");
};