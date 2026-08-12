// Neutrale Konstanten für den Formular-Bot-Schutz.
// Bewusst frei von Server-Abhängigkeiten, damit sowohl Client- als auch
// Server-Code sie importieren können.

/**
 * Name des versteckten Honeypot-Felds. Menschen sehen/füllen es nicht,
 * viele Bots füllen es automatisch. Absichtlich "echt" klingend.
 * Darf nicht mit einem echten Directus-Formularfeld kollidieren.
 */
export const HONEYPOT_FIELD_NAME = 'website';

/** Steuerfelder im FormData-Body (mit __-Präfix, kollidiert nicht mit Directus-Feldern). */
export const BOT_FORM_FIELD = '__bot_form';
export const BOT_TOKEN_FIELD = '__bot_token';
