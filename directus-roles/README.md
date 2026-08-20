# Rollensystem: Abteilungsleiter & Trainer

Zwei Rollen, deren Rechte automatisch an der Zuordnung der Person hängen:

| Rolle | Zuordnung erfolgt über | Darf bearbeiten |
| --- | --- | --- |
| **Abteilungsleiter** | Benutzer → Feld `related_department` (erscheint an der Abteilung als `leader`) | die eigene Abteilung und **alle** Teams darin |
| **Trainer** | Team → Feld `trainers` (Junction `teams_directus_users`) | nur die Teams, in denen die Person als Trainer steht |

Das sind exakt die Felder, die auch auf der Website angezeigt werden
(Abteilungsleiter auf der Abteilungsseite, Trainer auf der Teamseite) – eine
Zuordnung, zwei Wirkungen. Es ist keine Schemaänderung nötig.

## Anwenden

```bash
node directus-roles/apply-roles.cjs --dry-run
```

```bash
node directus-roles/apply-roles.cjs
```

Das Skript ist wiederholbar (Policies/Rollen werden über den Namen gesucht, die
Permissions vor dem Schreiben geleert) und legt vorher ein Backup von
`roles`, `policies`, `access` und `permissions` im selben Ordner ab.

## Was die Rollen dürfen

Beide Rollen bekommen zusätzlich die bestehende Policy **Team - App Access**
(Login ins Backend, eigenes Profil, Dashboards, Dateien lesen).

### Abteilungsleiter – Policy „Abteilungsverwaltung"

| Collection | Rechte | Eingrenzung |
| --- | --- | --- |
| `departments` | lesen, eigene ändern | `leader` enthält mich |
| `teams` | lesen, anlegen, ändern, löschen | Team gehört zu meiner Abteilung |
| `trainings` | lesen, anlegen, ändern, löschen | Training gehört zu einem Team meiner Abteilung |
| `posts` | lesen, anlegen, ändern, löschen | Beitrag hat Bezug zu meiner Abteilung oder einem Team darin |
| `events` | lesen, anlegen, ändern, löschen | wie Beiträge |
| `teams_directus_users` | voll | Trainer/Betreuer den eigenen Teams zuordnen |
| `directus_users` | ändern | Personen in meiner Abteilung – nur Stammdaten, **nicht** E-Mail, Passwort, Rolle |
| `directus_files` | anlegen; eigene ändern/löschen | |

### Trainer – Policy „Teamverwaltung"

| Collection | Rechte | Eingrenzung |
| --- | --- | --- |
| `teams` | lesen, eigene ändern | ich stehe in `trainers` |
| `trainings` | lesen, anlegen, ändern, löschen | Training gehört zu einem meiner Teams |
| `posts` | lesen, anlegen, ändern, löschen | Beitrag hat Bezug zu einem meiner Teams |
| `events` | lesen, anlegen, ändern, löschen | wie Beiträge |
| `teams_directus_users` | lesen, `funktion`/`sort` ändern | **kein** Anlegen/Löschen – siehe unten |
| `directus_users` | ändern | Personen in meinen Teams – nur Stammdaten |
| `directus_files` | anlegen; eigene ändern/löschen | |

## Getroffene Annahmen

Diese Punkte waren nicht abgestimmt und sind so gesetzt – jeweils leicht zu ändern:

1. **Eine Abteilung pro Leiter.** `related_department` ist ein Einzelfeld. Soll
   jemand mehrere Abteilungen leiten, braucht es ein zusätzliches m2m-Feld.
2. **Veröffentlichen erlaubt.** `status` ist in den bearbeitbaren Feldern
   enthalten, beide Rollen können also selbst veröffentlichen. Für einen
   Freigabe-Workflow müsste `status` aus den Feldlisten raus.
3. **Keine neuen Personen.** Beide Rollen dürfen bestehende Personen bearbeiten,
   aber keine Benutzer anlegen oder löschen – das bleibt beim Admin.
4. **`slug` ist gesperrt.** Bei Abteilungen und Teams, damit bestehende URLs
   nicht kaputtgehen. Bei Beiträgen/Events ist `slug` bearbeitbar (neue Inhalte).

## Sicherheitsentscheidungen

- **Trainer darf die Trainer-Zuordnung nicht ändern.** Seine Rechte hängen genau
  an `teams_directus_users`; mit Anlege-Recht könnte er sich selbst beliebigen
  Teams zuordnen. Beim Abteilungsleiter besteht das Problem nicht, weil dessen
  Rechte an der Abteilung hängen – er darf die Zuordnung deshalb pflegen.
- **`forms` nur mit `id`, `title`, `is_active` lesbar** – die E-Mail-Konfiguration
  eines Formulars (inkl. Admin-Adressen) geht die Rollen nichts an.

## Bekannte Grenze: Anlegen lässt sich nicht eingrenzen

Directus prüft beim Anlegen nur die `validation` gegen das Payload, nicht den
Filter über Relationen. Ein Trainer kann also einen Beitrag oder ein Training
anlegen und dabei ein fremdes Team eintragen. Danach kann er den Datensatz weder
sehen noch bearbeiten – es ist ein Ärgernis, keine Rechteausweitung. Sauber
verhindern ließe es sich nur über einen Filter-Flow auf `items.create`.

## Offener Nebenbefund

Die Rolle **Writer** hängt an der Policy `$t:public_label`, die
`admin_access: true` hat – wer diese Rolle hat, ist damit faktisch Administrator.
Das ist unabhängig von diesem Rollensystem und sollte getrennt werden
(Zuordnung in `directus_access` entfernen). Der öffentliche Zugriff ist nicht
betroffen: unauthentifizierte Requests auf `/settings` liefern 403.
