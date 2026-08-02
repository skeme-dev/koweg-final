import { json, type RequestHandler } from '@sveltejs/kit';
import { FormError, submitForm } from '$lib/directus/forms.server';

/**
 * Nimmt Formular-Einreichungen entgegen und reicht sie an Directus weiter.
 * Der Browser kennt dadurch weder den Token noch die Directus-Endpunkte.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ message: 'Ungültige Anfrage.' }, { status: 400 });
	}

	try {
		await submitForm(formData, fetch);
		return json({ ok: true });
	} catch (error) {
		if (error instanceof FormError) {
			return json({ message: error.message }, { status: error.status });
		}
		// Interne Details (Directus-URL, Feldnamen) gehören nicht in die Antwort.
		console.error('form submission failed:', error);
		return json({ message: 'Formular konnte nicht abgesendet werden.' }, { status: 502 });
	}
};
