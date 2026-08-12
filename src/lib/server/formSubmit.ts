import { env } from '$env/dynamic/private';
import { useDirectus } from '$lib/directus/directus';

interface SubmissionValue {
	field: string;
	value?: string;
	file?: string;
}

type FormFieldMeta = { id: string; name: string; type: string };

/**
 * Liest die Feld-Definitionen des Formulars anonym (public read) direkt aus
 * Directus – autoritativ, damit ein manipulierter Client keine fremden
 * Feld-IDs unterschieben kann.
 */
async function getFormFields(formId: string): Promise<FormFieldMeta[]> {
	const { getDirectus, readItem } = useDirectus();
	const directus = getDirectus(fetch);
	const form = (await directus.request(
		readItem('forms', formId, { fields: ['id', { fields: ['id', 'name', 'type'] }] })
	)) as any;

	return (form?.fields ?? [])
		.filter((f: any) => f && f.name)
		.map((f: any) => ({ id: f.id, name: f.name as string, type: (f.type as string) ?? '' }));
}

/**
 * Schreibt eine Formular-Einreichung serverseitig mit dem privaten Token nach
 * Directus. Werte kommen aus dem FormData-Body, gemappt über die autoritativen
 * Feldnamen.
 */
export async function submitFormServer(formId: string, body: FormData): Promise<void> {
	const TOKEN = env.DIRECTUS_FORM_TOKEN;
	if (!TOKEN) throw new Error('DIRECTUS_FORM_TOKEN ist nicht gesetzt.');

	const { getDirectus, uploadFiles, createItem, withToken } = useDirectus();
	const directus = getDirectus(fetch);

	const fields = await getFormFields(formId);
	const values: SubmissionValue[] = [];

	for (const field of fields) {
		const raw = body.get(field.name);
		if (raw === null) continue;

		if (field.type === 'file' && raw instanceof File && raw.size > 0) {
			const fd = new FormData();
			fd.append('file', raw);
			const uploaded = (await directus.request(withToken(TOKEN, uploadFiles(fd)))) as any;
			if (uploaded && 'id' in uploaded) {
				values.push({ field: field.id, file: uploaded.id });
			}
		} else if (typeof raw === 'string') {
			values.push({ field: field.id, value: raw });
		}
	}

	await directus.request(withToken(TOKEN, createItem('form_submissions', { form: formId, values })));
}
