# Stack in Coolify aufsetzen und abnehmen

Anleitung für [docker-compose.yml](docker-compose.yml): Directus, PostgreSQL,
Redis, Frontend und Backup. Die Abnahmetests in Teil 3 sind so gebaut, dass ein
Fehler früh auffällt und nicht erst beim ersten echten Ausfall.

Zeitbedarf: rund eine Stunde, davon das meiste Wartezeit beim ersten Build.

---

## Teil 0 — Backup-Image bereitstellen

Der Backup-Container kommt aus einem eigenen Repo (`directus-backup`), Coolify
kann ihn also nicht aus diesem Stack heraus bauen. Ein Weg von dreien:

**A — auf dem Server bauen** (am schnellsten für den Anfang)

```bash
git clone <dein-backup-repo> /opt/directus-backup && cd /opt/directus-backup
```

```bash
docker build --build-arg PG_MAJOR=16 -t directus-backup:latest .
```

**B — Registry** (sauberer, wenn mehrere Server im Spiel sind): Image lokal
bauen, nach ghcr.io pushen, im Compose `image:` auf
`ghcr.io/<org>/directus-backup:latest` ändern.

**C — eigene Coolify-Application** für das Backup-Repo, und den `backup`-Service
aus diesem Compose entfernen. Dann braucht er Zugriff auf dasselbe
Uploads-Volume und dasselbe Netzwerk.

> **`PG_MAJOR=16` ist Pflicht.** Der Stack fährt `postgis:16`. Mit dem
> Standardwert 17 laufen Backups zwar durch, aber der Restore scheitert an
> Direktiven, die Postgres 16 nicht kennt — und das merkst du dann im Ernstfall.
> Prüfen:
>
> ```bash
> docker run --rm --entrypoint pg_dump directus-backup:latest --version
> ```
>
> Muss `pg_dump (PostgreSQL) 16.x` ausgeben.

---

## Teil 1 — Stack anlegen

In Coolify eine neue Ressource vom Typ **Docker Compose** aus diesem Git-Repo
anlegen, Branch wählen, `docker-compose.yml` als Compose-Datei.

### Domains

Coolify erzeugt sie aus den Magic-Variablen im Compose:

| Variable | Service | wird zu |
|---|---|---|
| `SERVICE_URL_DIRECTUS_8055` | `directus` | Directus-Backend |
| `SERVICE_URL_KOWEG_3000` | `koweg` | die Website |

Beide brauchen in Coolify eine Domain. `postgresql`, `redis` und `backup`
bekommen **keine** — sie sind nur intern erreichbar und sollen es bleiben.

### Von Coolify generierte Secrets

Diese füllt Coolify selbst, nichts eintragen:
`SERVICE_BASE64_64_KEY`, `SERVICE_BASE64_64_SECRET`, `SERVICE_PASSWORD_ADMIN`,
`SERVICE_USER_POSTGRESQL`, `SERVICE_PASSWORD_POSTGRESQL`.

> **`KEY` und `SECRET` sind Recovery-Material.** Ein Datenbank-Restore ist nur
> brauchbar, wenn Directus danach mit denselben Werten startet — sonst sind
> Sessions, Flow-Credentials und SSO-Konfiguration hin. Beide nach dem ersten
> Deploy aus der Coolify-UI in den Passwortmanager kopieren, zusammen mit den
> S3-Zugangsdaten.

### Selbst zu setzen

Aus [.env.compose.example](.env.compose.example) übernehmen. Mindestens:

```
PUBLIC_DIRECTUS_URL=https://directus.skeme.dev
PUBLIC_SITE_URL=https://www.svkoweg.de
PUBLIC_DIRECTUS_FORM_TOKEN=<Token des Frontend-Bot-Users>
DRAFT_MODE_SECRET=<beliebiger langer String>
BACKUP_DIRECTUS_TOKEN=<statischer Token eines Admin-Users>
ADMIN_EMAIL=admin@svkoweg.de
```

`PUBLIC_DIRECTUS_URL` und `PUBLIC_SITE_URL` müssen die **öffentlichen** Domains
sein, nicht `http://directus:8055`: der Browser lädt darüber Bilder.

> Diese beiden werden beim Build ins Frontend-Bundle gebacken. Ändern sie sich,
> muss das Frontend **neu gebaut** werden — ein Neustart genügt nicht.

---

## Teil 2 — Erster Deploy

Reihenfolge, in der die Container hochkommen (durch `depends_on` erzwungen):

```
postgresql ──┐
             ├──> directus ──┬──> koweg
redis     ───┘               └──> backup
```

`postgresql` und `redis` müssen `healthy` sein, bevor Directus startet; Directus
muss `healthy` sein, bevor Frontend und Backup starten. Der erste Start von
Directus dauert länger — es legt das Schema an und läuft durch alle Migrationen.

Wenn nach dem Deploy alle fünf Container laufen, weiter zu Teil 3. Sonst zuerst
Teil 5.

---

## Teil 3 — Abnahmetests

Befehle laufen auf dem Server. Die Container heißen unter Coolify mit Präfix —
Namen finden mit:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -Ei "directus|koweg|backup|postgres|redis"
```

Kürzel für die folgenden Schritte:

```bash
BACKUP=$(docker ps --format "{{.Names}}" | grep backup | head -1)
```

### 3.1 Datenbank

```bash
docker exec $BACKUP psql -tAc "select version()"
```

Erwartet: eine Zeile mit `PostgreSQL 16.x`. Fehler hier heißt: falsche
Zugangsdaten oder Postgres nicht erreichbar — alles Weitere erübrigt sich.

### 3.2 Directus

Backend im Browser öffnen, mit `ADMIN_EMAIL` und `SERVICE_PASSWORD_ADMIN`
anmelden. Dann prüfen, dass es hinter dem Proxy korrekt antwortet:

```bash
curl -sI https://directus.skeme.dev/server/ping
```

Erwartet: `HTTP/2 200`. Und die öffentliche Leseberechtigung, **ohne** Token:

```bash
curl -s "https://directus.skeme.dev/items/teams?fields=title&limit=3"
```

Erwartet: JSON mit Mannschaften. Kommt `FORBIDDEN`, fehlen der public-Policy
die Leserechte — dann bleibt auch die Website leer.

### 3.3 Frontend

```bash
curl -s https://www.svkoweg.de | grep -o "<title>[^<]*</title>"
```

Erwartet: der Seitentitel. Danach im Browser eine Mannschaftsseite öffnen und
prüfen, ob **Bilder** laden — tun sie es nicht, wurde das Frontend mit einer
falschen `PUBLIC_DIRECTUS_URL` gebaut (siehe Teil 5).

### 3.4 Backup — Konfiguration

```bash
docker exec $BACKUP python -m directus_backup status
```

Erwartet, Zeile für Zeile:

```
directus-backup 1.0.0
  backup dir     : /backups
  uploads        : /directus-uploads
  cron           : 0 3 * * * (Europe/Berlin)
  retention      : 7d / 4w / 6m
  targets        : local
  config         : ok
  directus       : http://directus:8055 v11.17.4 health=ok
  postgres       : directus@postgresql v16.x
  pg client      : matches server
  last run       : {"status": "scheduled", ...}
  local backups  : 0
```

Die beiden wichtigsten Zeilen: **`config : ok`** und **`pg client : matches
server`**. Steht dort eine Warnung zur Client-Version, ist das Image mit dem
falschen `PG_MAJOR` gebaut — zurück zu Teil 0.

### 3.5 Backup — erster Lauf

```bash
docker exec $BACKUP python -m directus_backup backup
```

Erwartet am Ende eine Zeile wie:

```
backup 20260801T120000Z -> /backups/directus-backup-20260801T120000Z.tar.gz (412.3 MiB)
```

Läuft je nach Datenmenge ein bis mehrere Minuten. Die Größe sollte plausibel zur
Uploads-Menge passen — wenige Kilobyte bedeuten, dass `UPLOADS_PATH` ins Leere
zeigt.

### 3.6 Backup — Integrität

```bash
docker exec $BACKUP python -m directus_backup verify latest --deep
```

Erwartet `"ok": true` und alle vier Komponenten auf `ok`:

```json
{
  "archive": "/backups/directus-backup-20260801T120000Z.tar.gz",
  "checks": {
    "checksum": "ok",
    "manifest": "ok",
    "components": {
      "database": "ok", "schema": "ok", "template": "ok", "uploads": "ok"
    },
    "dump_toc_entries": 194,
    "dump": "ok"
  },
  "backup_id": "20260801T120000Z",
  "directus": { "project_name": "...", "version": "11.17.4" },
  "warnings": [],
  "ok": true,
  "failures": []
}
```

Fehlt `uploads`, ist das Volume nicht gemountet. `--deep` liest zusätzlich das
Inhaltsverzeichnis des Dumps — `dump_toc_entries` muss dreistellig sein.

### 3.7 Backup — Healthcheck

```bash
docker exec $BACKUP python -m directus_backup healthcheck && echo "GRÜN"
```

Erwartet: `ok - last run <id> <dauer> ago` und `GRÜN`.

Der Container-Healthcheck wird rot, sobald ein Lauf fehlschlägt oder der letzte
Erfolg älter als `HEALTH_MAX_AGE_HOURS` (26h) ist:

```bash
docker inspect --format '{{.State.Health.Status}}' $BACKUP
```

### 3.8 Restore-Plan (ohne etwas zu verändern)

```bash
docker exec $BACKUP python -m directus_backup restore latest --mode=full --dry-run
```

Erwartet: der Plan, gefolgt von `dry run - nothing was changed`. Prüfe, dass
Datenbankname und Uploads-Pfad im Plan stimmen.

### 3.9 Nächtlichen Lauf abwarten

Am Tag nach dem Deploy:

```bash
docker exec $BACKUP python -m directus_backup list
```

Erwartet: mindestens zwei Backups. Kommt keins dazu, hat der Cron nicht
ausgelöst — Logs prüfen (Teil 5).

---

## Teil 4 — Die Feuerprobe

Die Schritte oben zeigen, dass Backups *entstehen*. Sie zeigen nicht, dass sie
sich *zurückspielen* lassen. Das ist ein Unterschied, den man nicht im Ernstfall
herausfinden will.

Einmal nach dem Aufsetzen und danach jährlich, gegen eine **Wegwerf-Instanz**,
nie gegen die produktive:

1. Zweiten Stack in Coolify aus demselben Compose anlegen, andere Domains,
   leere Volumes.
2. Backup-Archiv dorthin kopieren (oder aus S3 ziehen lassen).
3. Directus im Testsstack stoppen, dann:
   ```bash
   docker exec $BACKUP_TEST python -m directus_backup restore <id> --mode=full --yes
   ```
4. Directus starten — mit **denselben `KEY` und `SECRET`** wie im Original.
5. Anmelden und stichprobenartig prüfen: Sind Mannschaften, Beiträge, Bilder und
   Benutzer da? Funktioniert ein Login mit einem echten Redakteurs-Passwort?
   (Letzteres beweist, dass die Passwort-Hashes mitgekommen sind.)
6. Testsstack löschen.

Bestanden heißt: du weißt, dass die Sicherung trägt.

---

## Teil 5 — Wenn etwas nicht stimmt

| Symptom | Ursache | Abhilfe |
|---|---|---|
| Directus startet nicht, Logs zeigen DB-Fehler | Postgres war noch nicht bereit oder Zugangsdaten falsch | `depends_on` prüfen; `SERVICE_*_POSTGRESQL` in der UI vergleichen |
| Website lädt, **Bilder fehlen** | Frontend mit falscher `PUBLIC_DIRECTUS_URL` gebaut | Variable korrigieren und **neu bauen**, nicht nur neu starten |
| Website zeigt keine Inhalte | public-Policy fehlen Leserechte, oder neue Collection ohne Leserecht | Test 3.2 ohne Token wiederholen |
| `config : ok` fehlt in `status` | Pflichtvariable nicht gesetzt | Die Meldung nennt die fehlende Variable |
| `pg client` warnt | Image mit falschem `PG_MAJOR` | Teil 0, mit `--build-arg PG_MAJOR=16` neu bauen |
| Backup-Archiv nur wenige KB | `UPLOADS_PATH` zeigt ins Leere | Beide Services müssen dasselbe Volume nutzen |
| `uploads: MISSING` in `verify` | Volume nicht im Backup-Container gemountet | Volume-Namen im Compose prüfen |
| Backup-Container `unhealthy` | Letzter Lauf fehlgeschlagen oder zu lange her | `docker logs $BACKUP` |
| Cron löst nicht aus | Falsche Cron-Syntax oder Zeitzone | `status` zeigt beides an |
| S3-Upload scheitert | Zugangsdaten oder Endpoint falsch | `status` prüft den Bucket mit |

Logs:

```bash
docker logs --tail=100 $BACKUP
```

Ein fehlgeschlagenes Nebenziel (S3, Git) setzt den Status auf `degraded` — das
lokale Archiv existiert dann trotzdem.

---

## Checkliste

- [ ] Backup-Image mit `PG_MAJOR=16` gebaut, `pg_dump --version` zeigt 16.x
- [ ] Domains für `directus` und `koweg` vergeben, für die übrigen **nicht**
- [ ] `KEY`, `SECRET` und S3-Zugangsdaten im Passwortmanager
- [ ] 3.1 Datenbank antwortet
- [ ] 3.2 Directus-Login und anonymer Lesezugriff funktionieren
- [ ] 3.3 Website lädt inklusive Bilder
- [ ] 3.4 `status` meldet `config : ok` und `pg client : matches server`
- [ ] 3.5 Erstes Backup mit plausibler Größe
- [ ] 3.6 `verify --deep` meldet `"ok": true`
- [ ] 3.7 Healthcheck grün
- [ ] 3.8 Restore-Plan stimmt
- [ ] 3.9 Nächtlicher Lauf hat ausgelöst
- [ ] S3 aktiviert (sonst liegen die Backups auf derselben Maschine wie die Daten)
- [ ] Teil 4 einmal durchgespielt
