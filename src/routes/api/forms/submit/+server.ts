import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BOT_FORM_FIELD, BOT_TOKEN_FIELD, HONEYPOT_FIELD_NAME } from '$lib/forms/constants';
import { rateLimit, verifyFormToken } from '$lib/server/botGuard';
import { submitFormServer } from '$lib/server/formSubmit';

function clientIp(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return 'unknown';
	}
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: FormData;
	try {
		body = await request.formData();
	} catch {
		throw error(400, 'Ungültige Anfrage.');
	}

	// 1) Honeypot: still ausfiltern – Bots bekommen einen Schein-Erfolg und
	//    lernen so nichts über den Schutz.
	const honeypot = body.get(HONEYPOT_FIELD_NAME);
	if (typeof honeypot === 'string' && honeypot.trim() !== '') {
		return json({ ok: true });
	}

	// 2) Rate-Limit pro IP.
	if (!rateLimit(clientIp(getClientAddress))) {
		throw error(429, 'Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut.');
	}

	// 3) Zeit-Token: zu schnell = wahrscheinlich Bot; ungültig/abgelaufen = neu laden.
	const check = verifyFormToken(body.get(BOT_TOKEN_FIELD));
	if (check === 'too_fast') {
		throw error(400, 'Bitte einen kurzen Moment warten und erneut absenden.');
	}
	if (check !== 'ok') {
		throw error(400, 'Das Formular ist abgelaufen. Bitte lade die Seite neu.');
	}

	// 4) Formular-ID.
	const formId = body.get(BOT_FORM_FIELD);
	if (typeof formId !== 'string' || !formId) {
		throw error(400, 'Ungültiges Formular.');
	}

	await submitFormServer(formId, body);
	return json({ ok: true });
};
