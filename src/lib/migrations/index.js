import { createDirectus, authentication, rest, schemaSnapshot, schemaDiff, schemaApply } from '@directus/sdk';

const BASE_DIRECTUS_URL = 'https://localhost:8055';

const TARGET_DIRECTUS_URL = 'https://directus.skeme.dev';

const baseDirectus = createDirectus(BASE_DIRECTUS_URL).with(rest()).with(authentication());;
const targetDirectus = createDirectus(TARGET_DIRECTUS_URL).with(rest()).with(authentication());;

await baseDirectus.login("admin@example.com", 'd1r3ctu5' );
await targetDirectus.login('admin@example.com', 'd1r3ctu5' );


export async function migrate() {
  const snapshot = await getSnapshot();
    const diff = await getDiff(snapshot);
    
    console.log(snapshot)
  await applyDiff(diff);
}


function getSnapshot() {
  return baseDirectus.request(schemaSnapshot());
}

function getDiff(snapshot) {
  return targetDirectus.request(schemaDiff(snapshot));
}

function applyDiff(diff) {
  return targetDirectus.request(schemaApply(diff));
}