/**
 * Deutsche Betreffzeilen fuer die System-Mails von Directus.
 *
 * Warum es diese Extension braucht: der Betreff steckt nicht in den
 * Liquid-Templates, sondern im Code von Directus. Die Service-Methoden
 * `inviteUser()` und `requestPasswordReset()` nehmen zwar einen optionalen
 * `subject` entgegen - die REST-Controller reichen ihn aber nicht durch:
 *
 *     await service.inviteUser(req.body.email, req.body.role, req.body.invite_url || null);
 *
 * Ueber die API ist der Betreff damit nicht setzbar, und beim
 * Registrierungs-Template steht er ohnehin fest verdrahtet im Quelltext.
 *
 * Der einzige saubere Hebel ist der Filter-Hook `email.send`, den die
 * MailService kurz vor dem Versand ausloest. Dort laesst sich der Betreff
 * anhand des Templatenamens ersetzen.
 *
 * Ausrollen: Ordner nach /directus/extensions/mail-subjects/ kopieren und
 * Directus neu starten. Siehe README.md daneben.
 */

/** Templatename -> Betreff. Andere Mails bleiben unangetastet. */
const SUBJECTS = {
	'user-invitation': 'Einladung zur Vereinsverwaltung',
	'password-reset': 'Passwort zurücksetzen',
	'user-registration': 'E-Mail-Adresse bestätigen',
};

export default ({ filter }, { logger }) => {
	filter('email.send', (payload) => {
		// Wichtig: immer das Payload zurueckgeben. Liefert ein Filter nichts,
		// wirft die MailService die Mail weg (`if (!payload) return null`).
		if (!payload || typeof payload !== 'object') return payload;

		const template = payload.template?.name;
		if (!template) return payload;

		const subject = SUBJECTS[template];
		if (!subject) return payload;

		logger?.debug?.(`[mail-subjects] "${template}" -> "${subject}"`);

		return { ...payload, subject };
	});
};
