import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

// Server-only Secret für die Zeit-Token-Signatur.
const SECRET = env.FORM_HMAC_SECRET ?? '';

// Zeitfenster: schneller ausgefüllt als MIN = Bot; älter als MAX = abgelaufen/Replay.
const MIN_FILL_MS = 2_000; // 2 Sekunden
const MAX_AGE_MS = 2 * 60 * 60_000; // 2 Stunden

// Rate-Limit pro IP. In-memory ist bei adapter-node (langlebiger Prozess) ok.
const RATE_MAX = 5;
const RATE_WINDOW_MS = 10 * 60_000; // 10 Minuten

function sign(ts: string): string {
	return createHmac('sha256', SECRET).update(ts).digest('hex');
}

/** Frisches, signiertes Zeit-Token für ein gerade gerendertes Formular. */
export function issueFormToken(now = Date.now()): string {
	const ts = String(now);
	return `${ts}.${sign(ts)}`;
}

export type TokenCheck = 'ok' | 'invalid' | 'too_fast' | 'expired';

/** Prüft Signatur und Alter eines Zeit-Tokens. */
export function verifyFormToken(token: unknown, now = Date.now()): TokenCheck {
	if (!SECRET) return 'invalid';
	if (typeof token !== 'string' || !token.includes('.')) return 'invalid';

	const [ts, sig] = token.split('.');
	if (!ts || !sig || !/^\d+$/.test(ts)) return 'invalid';

	const provided = Buffer.from(sig);
	const expected = Buffer.from(sign(ts));
	if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
		return 'invalid';
	}

	const age = now - Number(ts);
	if (age < MIN_FILL_MS) return 'too_fast';
	if (age > MAX_AGE_MS) return 'expired';
	return 'ok';
}

// --- In-memory Rate-Limiter (Sliding Window) ---
const hits = new Map<string, number[]>();

/** true = erlaubt, false = Limit überschritten. */
export function rateLimit(ip: string, now = Date.now()): boolean {
	const key = ip || 'unknown';
	const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
	recent.push(now);
	hits.set(key, recent);

	// Gelegentliches Aufräumen, damit die Map nicht unbegrenzt wächst.
	if (hits.size > 5000) {
		for (const [k, v] of hits) {
			if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
		}
	}

	return recent.length <= RATE_MAX;
}
