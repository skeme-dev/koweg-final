/**
 * Formular-Einreichungen, serverseitig.
 *
 * Der Token liegt hier bewusst in `$env/dynamic/private`: er landet damit weder
 * im Client-Bundle noch muss er beim Build bekannt sein. Der Browser spricht
 * nur noch /api/forms/submit an, nie Directus direkt.
 *
 * Die `.server.ts`-Endung ist Teil des Schutzes - SvelteKit bricht den Build
 * ab, falls diese Datei jemals aus Client-Code importiert wird.
 */
import { createDirectus, rest, staticToken, readItem, createItem, uploadFiles } from '@directus/sdk';
import { env } from '$env/dynamic/private';
import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import type { Schema } from '../types/directus-schema';

/** Muss zur Validierung der Directus-Policy passen (filesize <= 5000000). */
export const MAX_FILE_BYTES = 5_000_000;
/** Schutz gegen aufgeblähte Einreichungen. */
const MAX_FILES = 5;
const MAX_VALUE_LENGTH = 20_000;

export class FormError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
	}
}

/**
 * Im Container läuft Directus im selben Netz - dann spart die interne Adresse
 * den Umweg über den Reverse Proxy. Ohne die Variable bleibt alles wie bisher.
 */
const directusUrl = env.DIRECTUS_INTERNAL_URL || PUBLIC_DIRECTUS_URL;

const baseClient = (fetchFn: typeof fetch) =>
	createDirectus<Schema>(directusUrl, { globals: { fetch: fetchFn } }).with(rest());

/** Nur zum Lesen der Formular-Definition - die ist öffentlich. */
const getPublicClient = (fetchFn: typeof fetch) => baseClient(fetchFn);

/**
 * Zum Schreiben. Ohne Token geht es derzeit auch, weil die Policy
 * "Forms - Submission" zusätzlich öffentlich zugewiesen ist; der Token ist die
 * Absicherung, falls diese Zuweisung entfernt wird.
 */
const getWriteClient = (fetchFn: typeof fetch) => {
	const token = env.DIRECTUS_FORM_TOKEN;
	const client = baseClient(fetchFn);
	return token ? client.with(staticToken(token)) : client;
};

interface SubmissionValue {
	field: string;
	value?: string;
	file?: string;
}

type FieldDefinition = {
	id: string;
	name: string | null;
	type: string | null;
	required: boolean | null;
	label: string | null;
};

/**
 * Feld-Definitionen kommen aus Directus, nicht vom Client. Sonst könnte man
 * beliebige field-IDs unterschieben.
 */
const loadForm = async (fetchFn: typeof fetch, formId: string) => {
	const client = getPublicClient(fetchFn);
	let form;
	try {
		form = (await client.request(
			readItem('forms', formId, {
				fields: ['id', 'is_active', { fields: ['id', 'name', 'type', 'required', 'label'] }]
			})
		)) as { id: string; is_active: boolean | null; fields: FieldDefinition[] };
	} catch (error) {
		// Ohne diese Zeile sieht man im Betrieb nicht, ob die ID falsch war oder
		// Directus/Berechtigungen das Problem sind.
		console.error(`could not load form ${formId}:`, error);
		throw new FormError('Formular nicht gefunden.', 404);
	}

	if (!form?.is_active) {
		throw new FormError('Dieses Formular nimmt derzeit keine Einsendungen entgegen.', 403);
	}
	return form;
};

export const submitForm = async (formData: FormData, fetchFn: typeof fetch) => {
	const formId = formData.get('form');
	if (typeof formId !== 'string' || !formId) {
		throw new FormError('Formular-ID fehlt.');
	}

	const form = await loadForm(fetchFn, formId);
	const client = getWriteClient(fetchFn);
	const values: SubmissionValue[] = [];
	let fileCount = 0;

	for (const field of form.fields ?? []) {
		if (!field?.name) continue;

		if (field.type === 'file') {
			const file = formData.get(`file:${field.name}`);
			if (!(file instanceof File) || file.size === 0) {
				if (field.required) {
					throw new FormError(`${field.label || field.name} ist erforderlich.`);
				}
				continue;
			}
			if (file.size > MAX_FILE_BYTES) {
				throw new FormError(
					`${field.label || field.name}: Datei ist größer als ${Math.round(MAX_FILE_BYTES / 1_000_000)} MB.`,
					413
				);
			}
			if (++fileCount > MAX_FILES) {
				throw new FormError('Zu viele Dateien.', 413);
			}

			const upload = new FormData();
			upload.append('file', file);
			const uploaded = await client.request(uploadFiles(upload));
			if (uploaded && 'id' in uploaded) {
				values.push({ field: field.id, file: uploaded.id as string });
			}
			continue;
		}

		const raw = formData.get(`value:${field.name}`);
		if (raw === null) {
			if (field.required) throw new FormError(`${field.label || field.name} ist erforderlich.`);
			continue;
		}

		const value = String(raw);
		if (value.length > MAX_VALUE_LENGTH) {
			throw new FormError(`${field.label || field.name} ist zu lang.`, 413);
		}
		if (field.required && value.trim() === '') {
			throw new FormError(`${field.label || field.name} ist erforderlich.`);
		}
		values.push({ field: field.id, value });
	}

	if (values.length === 0) {
		throw new FormError('Es wurden keine Angaben übermittelt.');
	}

	// Der generierte Typ erwartet vollständige FormSubmissionValue-Objekte;
	// Directus legt die Zeilen aus {field, value|file} selbst an.
	await client.request(createItem('form_submissions', { form: form.id, values } as never));
};
