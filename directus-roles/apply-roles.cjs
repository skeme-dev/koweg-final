/**
 * Legt das Rollensystem "Abteilungsleiter" und "Trainer" in Directus an.
 *
 *   node directus-roles/apply-roles.cjs            # anwenden
 *   node directus-roles/apply-roles.cjs --dry-run  # nur anzeigen
 *
 * Das Skript ist wiederholbar: Policies/Rollen werden über ihren Namen gesucht
 * und die Permissions der beiden Policies vor dem Schreiben geleert.
 *
 * Zuordnung (kein Schema wird geändert):
 *   Abteilungsleiter -> directus_users.related_department  (= departments.leader)
 *   Trainer          -> teams_directus_users               (= teams.trainers)
 * Beides ist gleichzeitig das, was auf der Website als Leiter/Trainer erscheint.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const env = Object.fromEntries(
	fs
		.readFileSync(path.join(ROOT, '.env'), 'utf8')
		.split(/\r?\n/)
		.filter((line) => line.includes('='))
		.map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const URL = env.PUBLIC_DIRECTUS_URL;
const HEADERS = { Authorization: `Bearer ${env.PUBLIC_DIRECTUS_TOKEN}`, 'Content-Type': 'application/json' };

const APP_ACCESS_POLICY = '52598a64-071d-4071-96fa-4b620d6189b5'; // "Team - App Access"

// --- Filter-Bausteine ---------------------------------------------------------

// Abteilungsleiter: Abteilung, in der ich als Leiter eingetragen bin
const DEPT_LEAD = { leader: { id: { _eq: '$CURRENT_USER' } } };
// ... und alle Teams dieser Abteilung
const TEAM_IN_DEPT = { related_department: DEPT_LEAD };

// Trainer: Teams, in denen ich als Trainer eingetragen bin
const TEAM_COACHED = { trainers: { directus_users_id: { _eq: '$CURRENT_USER' } } };

const OWN_UPLOAD = { uploaded_by: { _eq: '$CURRENT_USER' } };

// --- Feldlisten ---------------------------------------------------------------

// slug bleibt bewusst außen vor: Änderungen daran zerschießen bestehende URLs
const DEPARTMENT_FIELDS = ['title', 'description', 'hero_image', 'teams', 'related_posts', 'sort', 'status'];
const TEAM_FIELDS = ['title', 'description', 'image', 'trainers', 'members', 'trainings', 'sort', 'status'];
const TRAINING_FIELDS = ['title', 'day', 'start', 'end', 'location', 'min_age', 'max_age', 'related_team', 'sort', 'status'];
const POST_FIELDS = ['title', 'slug', 'description', 'content', 'image', 'author', 'published_at', 'seo', 'related_department', 'related_team', 'sort', 'status'];
const EVENT_FIELDS = ['title', 'slug', 'description', 'content', 'image', 'type', 'start_date', 'end_date', 'location', 'max_participants', 'registration_form', 'related_department', 'related_team', 'sort', 'status'];
const JUNCTION_FIELDS = ['teams_id', 'directus_users_id', 'funktion', 'sort'];
const PERSON_FIELDS = ['first_name', 'last_name', 'title', 'description', 'avatar', 'related_team', 'teams', 'team_sort', 'department_sort'];

// Der Trainer darf die Trainer-Zuordnung NICHT selbst ändern: seine eigenen
// Rechte hängen genau an dieser Junction-Tabelle, er könnte sich sonst fremden
// Teams zuordnen. Das macht der Abteilungsleiter (dessen Rechte hängen an der
// Abteilung, nicht an der Trainer-Zuordnung).
const TEAM_FIELDS_TRAINER = ['title', 'description', 'image', 'trainings', 'sort', 'status'];
const PERSON_FIELDS_TRAINER = PERSON_FIELDS.filter((field) => field !== 'teams');

// Lesend für Auswahl-Dialoge (Ort, Formular für Event-Anmeldung ...).
// forms bewusst nur mit den Feldern für die Auswahl – die E-Mail-Konfiguration
// eines Formulars (inkl. Admin-Adressen) geht die Rollen nichts an.
const LOOKUP_READ = [
	{ collection: 'locations', fields: ['*'] },
	{ collection: 'block_location_card', fields: ['*'] },
	{ collection: 'forms', fields: ['id', 'title', 'is_active'] }
];

function crud(collection, fields, scope, { create = true, remove = true } = {}) {
	const rules = [{ collection, action: 'read', permissions: {}, fields: ['*'] }];

	if (create) rules.push({ collection, action: 'create', permissions: {}, fields });

	rules.push({ collection, action: 'update', permissions: scope, fields });

	if (remove) rules.push({ collection, action: 'delete', permissions: scope, fields: null });

	return rules;
}

// --- Abteilungsleiter ---------------------------------------------------------

const LEITER = [
	// Abteilung: nur die eigene bearbeiten, keine anlegen/löschen
	{ collection: 'departments', action: 'read', permissions: {}, fields: ['*'] },
	{ collection: 'departments', action: 'update', permissions: DEPT_LEAD, fields: DEPARTMENT_FIELDS },

	...crud('teams', TEAM_FIELDS, TEAM_IN_DEPT),
	...crud('trainings', TRAINING_FIELDS, { related_team: TEAM_IN_DEPT }),
	...crud('posts', POST_FIELDS, { _or: [{ related_department: DEPT_LEAD }, { related_team: TEAM_IN_DEPT }] }),
	...crud('events', EVENT_FIELDS, { _or: [{ related_department: DEPT_LEAD }, { related_team: TEAM_IN_DEPT }] }),

	// Trainer/Betreuer den Teams der eigenen Abteilung zuordnen
	...crud('teams_directus_users', JUNCTION_FIELDS, { teams_id: TEAM_IN_DEPT }),
	// Trainings den Teams zuordnen (m2m hinter teams.trainings)
	...crud('teams_trainings_1', ['teams_id', 'trainings_id'], { teams_id: TEAM_IN_DEPT }),

	// Personen der eigenen Abteilung pflegen – ohne E-Mail, Passwort, Rolle
	{
		collection: 'directus_users',
		action: 'update',
		permissions: { _or: [{ related_team: TEAM_IN_DEPT }, { related_department: DEPT_LEAD }] },
		fields: PERSON_FIELDS
	},

	{ collection: 'directus_files', action: 'create', permissions: {}, fields: ['*'] },
	{ collection: 'directus_files', action: 'update', permissions: OWN_UPLOAD, fields: ['*'] },
	{ collection: 'directus_files', action: 'delete', permissions: OWN_UPLOAD, fields: null },

	...LOOKUP_READ.map((entry) => ({ ...entry, action: 'read', permissions: {} }))
];

// --- Trainer ------------------------------------------------------------------

const TRAINER = [
	// Abteilungen und Teams sichtbar, aber nur eigene Teams bearbeitbar
	{ collection: 'departments', action: 'read', permissions: {}, fields: ['*'] },
	{ collection: 'teams', action: 'read', permissions: {}, fields: ['*'] },
	{ collection: 'teams', action: 'update', permissions: TEAM_COACHED, fields: TEAM_FIELDS_TRAINER },

	...crud('trainings', TRAINING_FIELDS, { related_team: TEAM_COACHED }),
	...crud('posts', POST_FIELDS, { related_team: TEAM_COACHED }),
	...crud('events', EVENT_FIELDS, { related_team: TEAM_COACHED }),

	// nur lesen und die Funktion pflegen – anlegen/löschen wäre Selbstzuweisung
	{ collection: 'teams_directus_users', action: 'read', permissions: {}, fields: ['*'] },
	{
		collection: 'teams_directus_users',
		action: 'update',
		permissions: { teams_id: TEAM_COACHED },
		fields: ['funktion', 'sort']
	},
	...crud('teams_trainings_1', ['teams_id', 'trainings_id'], { teams_id: TEAM_COACHED }),

	// Personen der eigenen Teams pflegen – ohne E-Mail, Passwort, Rolle
	{
		collection: 'directus_users',
		action: 'update',
		permissions: { related_team: TEAM_COACHED },
		fields: PERSON_FIELDS_TRAINER
	},

	{ collection: 'directus_files', action: 'create', permissions: {}, fields: ['*'] },
	{ collection: 'directus_files', action: 'update', permissions: OWN_UPLOAD, fields: ['*'] },
	{ collection: 'directus_files', action: 'delete', permissions: OWN_UPLOAD, fields: null },

	...LOOKUP_READ.map((entry) => ({ ...entry, action: 'read', permissions: {} }))
];

// --- API-Helfer ---------------------------------------------------------------

async function api(method, endpoint, body) {
	const response = await fetch(URL + endpoint, {
		method,
		headers: HEADERS,
		body: body ? JSON.stringify(body) : undefined
	});

	const text = await response.text();

	if (!response.ok) throw new Error(`${method} ${endpoint} -> ${response.status}: ${text.slice(0, 500)}`);

	return text ? JSON.parse(text) : null;
}

async function findByName(endpoint, name) {
	const result = await api('GET', `${endpoint}?filter[name][_eq]=${encodeURIComponent(name)}&fields=id,name`);

	return result.data[0] ?? null;
}

async function ensurePolicy(name, description) {
	const existing = await findByName('/policies', name);

	if (existing) return existing.id;

	const created = await api('POST', '/policies', {
		name,
		description,
		icon: 'badge',
		admin_access: false,
		app_access: false,
		enforce_tfa: false
	});

	return created.data.id;
}

async function ensureRole(name, description) {
	const existing = await findByName('/roles', name);

	if (existing) return existing.id;

	const created = await api('POST', '/roles', { name, description, icon: 'supervised_user_circle' });

	return created.data.id;
}

async function ensureAccess(roleId, policyId, sort) {
	const result = await api(
		'GET',
		`/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}&fields=id`
	);

	if (result.data.length > 0) return;

	await api('POST', '/access', { role: roleId, policy: policyId, sort });
}

async function replacePermissions(policyId, rules) {
	const existing = await api('GET', `/permissions?limit=-1&filter[policy][_eq]=${policyId}&fields=id`);

	if (existing.data.length > 0) {
		await api('DELETE', '/permissions', existing.data.map((item) => item.id));
	}

	await api(
		'POST',
		'/permissions',
		rules.map((rule) => ({
			policy: policyId,
			collection: rule.collection,
			action: rule.action,
			permissions: rule.permissions ?? null,
			validation: rule.validation ?? null,
			fields: rule.fields ?? null,
			presets: rule.presets ?? null
		}))
	);
}

// --- Ablauf -------------------------------------------------------------------

(async () => {
	if (DRY_RUN) {
		console.log(`Abteilungsleiter: ${LEITER.length} Regeln`);
		LEITER.forEach((r) => console.log('  ', r.collection, '|', r.action, '|', JSON.stringify(r.permissions)));
		console.log(`\nTrainer: ${TRAINER.length} Regeln`);
		TRAINER.forEach((r) => console.log('  ', r.collection, '|', r.action, '|', JSON.stringify(r.permissions)));
		return;
	}

	// Backup
	const backup = {};

	for (const endpoint of ['roles', 'policies', 'access', 'permissions']) {
		backup[endpoint] = (await api('GET', `/${endpoint}?limit=-1`)).data;
	}

	const backupFile = path.join(__dirname, `backup-rollen-${Date.now()}.json`);
	fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
	console.log('Backup ->', backupFile);

	// Abteilungsleiter
	const leiterPolicy = await ensurePolicy(
		'Abteilungsverwaltung',
		'Bearbeitet die eigene Abteilung inkl. Teams, Trainings, Beiträge und Termine.'
	);

	const leiterRole = await ensureRole('Abteilungsleiter', 'Leitet eine Abteilung des SV Koweg.');

	await ensureAccess(leiterRole, APP_ACCESS_POLICY, 1);
	await ensureAccess(leiterRole, leiterPolicy, 2);
	await replacePermissions(leiterPolicy, LEITER);
	console.log(`OK  Abteilungsleiter: ${LEITER.length} Regeln`);

	// Trainer
	const trainerPolicy = await ensurePolicy(
		'Teamverwaltung',
		'Bearbeitet die eigenen Teams inkl. Trainingszeiten, Beiträge und Termine.'
	);

	const trainerRole = await ensureRole('Trainer', 'Betreut ein oder mehrere Teams des SV Koweg.');

	await ensureAccess(trainerRole, APP_ACCESS_POLICY, 1);
	await ensureAccess(trainerRole, trainerPolicy, 2);
	await replacePermissions(trainerPolicy, TRAINER);
	console.log(`OK  Trainer: ${TRAINER.length} Regeln`);
})().catch((error) => {
	console.error('FEHLER:', error.message);
	process.exit(1);
});
