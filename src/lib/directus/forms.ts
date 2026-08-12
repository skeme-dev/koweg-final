import { BOT_FORM_FIELD, BOT_TOKEN_FIELD, HONEYPOT_FIELD_NAME } from '$lib/forms/constants';

export interface SubmitMeta {
	/** Signiertes Zeit-Token vom /api/forms/token-Endpoint. */
	token: string;
	/** Wert des Honeypot-Felds (bei echten Nutzern leer). */
	honeypot?: string;
}

/**
 * Sendet ein Formular an den eigenen Server-Endpoint (nicht mehr direkt an
 * Directus). Der Endpoint prüft Honeypot, Timing und Rate-Limit und schreibt
 * dann mit einem privaten Token nach Directus.
 */
export const submitForm = async (
	formId: string,
	fields: { id: string; name: string; type: string }[],
	data: Record<string, any>,
	meta: SubmitMeta
) => {
	const body = new FormData();
	body.append(BOT_FORM_FIELD, formId);
	body.append(BOT_TOKEN_FIELD, meta.token ?? '');
	body.append(HONEYPOT_FIELD_NAME, meta.honeypot ?? '');

	for (const field of fields) {
		const value = data[field.name];
		if (value === undefined || value === null) continue;

		if (field.type === 'file' && value instanceof File) {
			body.append(field.name, value);
		} else if (Array.isArray(value)) {
			body.append(field.name, value.join(', '));
		} else {
			body.append(field.name, String(value));
		}
	}

	const res = await fetch('/api/forms/submit', { method: 'POST', body });
	if (!res.ok) {
		let message = 'Failed to submit form';
		try {
			const data = await res.json();
			if (data?.message) message = data.message;
		} catch {
			// keine JSON-Antwort – Standardmeldung behalten
		}
		throw new Error(message);
	}
};
