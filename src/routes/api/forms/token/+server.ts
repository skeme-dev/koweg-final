import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { issueFormToken } from '$lib/server/botGuard';

// Liefert ein frisches, signiertes Zeit-Token. Das Frontend holt es beim
// Anzeigen des Formulars und schickt es beim Absenden mit, damit der Server
// zu schnelle (Bot-)Einreichungen erkennt.
export const GET: RequestHandler = () => {
	return json({ token: issueFormToken() }, { headers: { 'cache-control': 'no-store' } });
};
