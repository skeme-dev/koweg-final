# Production aufsetzen: DB-Restore + Hetzner Object Storage

Ziel: eine neue Directus-Instanz in Coolify, befüllt aus einem Postgres-Dump der
bestehenden Instanz (`directus.skeme.dev`), mit den Uploads in Hetzner Object
Storage statt im lokalen Volume.

Das Frontend läuft als eigene Coolify-Application aus diesem Repo — nicht über
[docker-compose.yml](docker-compose.yml). Die Datei und
[COOLIFY-STACK-TEST.md](COOLIFY-STACK-TEST.md) beschreiben den Compose-Weg und
sind für dieses Vorgehen nicht maßgeblich.

## Ausgangslage

Geprüft am 03.08.2026 gegen `snapshot.yaml` und den Template-Export:

| | |
|---|---|
| Directus | 11.17.4 |
| Dateien | 69, zusammen 126,8 MB |
| Ablage | flach als `<uuid>.<ext>`, alle `storage = 'local'` |
| Ordner | 65 in „1. Public", 4 in „4. System" |
| Geometry-Spalten | **keine** — PostGIS wird vom Schema nicht gebraucht |

Die Reihenfolge unten ist so gewählt, dass die Dateien schon im Bucket liegen,
bevor die Datenbank auf sie zeigt. Andersherum zeigt Directus zwischenzeitlich
auf Objekte, die es nicht gibt.

---

## Teil 0 — Was vorher feststehen muss

**`KEY` und `SECRET` der Quell-Instanz.** Bei einem DB-Restore kommen Sessions
und die statischen User-Token aus `directus_users.token` mit. Setzt du auf der
neuen Instanz andere Werte, ist im besten Fall nur jede Session ungültig. Trag
in Coolify **dieselben** Werte ein wie auf der Quelle.

Wenn das klappt, gilt dein bestehender `PUBLIC_DIRECTUS_FORM_TOKEN`
(`jhRss0…`) unverändert weiter und
[bootstrap-form-bot.py](scripts/bootstrap-form-bot.py) musst du nicht laufen
lassen. Nach dem Restore einmal gegenprüfen (Teil 6).

**Directus-Version.** Die neue Instanz auf `directus/directus:11.17.4` pinnen,
identisch zur Quelle. Ein Restore einer 11er-Datenbank in eine neuere Instanz
läuft zwar durch die Migrationen, aber dann machst du zwei Dinge gleichzeitig.
Zum Versionsstand siehe [UPGRADE-DIRECTUS.md](UPGRADE-DIRECTUS.md).

**PostGIS im Dump.** Die Quelle fährt laut Compose `postgis/postgis:16`, und
dieses Image legt die Extension in der Projekt-Datenbank an. `pg_dump` schreibt
dann ein `CREATE EXTENSION … postgis` in den Dump — auf einem normalen
`postgres:16` scheitert der Restore daran. Vorher prüfen:

```bash
psql -tAc "select extname from pg_extension" 
```

Steht `postgis` dabei, hast du zwei Wege: für die Production-DB ebenfalls ein
PostGIS-Image nehmen, oder die Extension aus dem Dump lassen. Letzteres ist hier
gefahrlos, weil keine einzige Spalte den Typ benutzt — mit `-Fc` gedumpt geht das
beim Restore über eine Liste:

```bash
pg_restore -l dump.pgc | grep -v -i postgis > restore.list
```

**Postgres-Hauptversion.** Quelle ist 16. `pg_dump` und `pg_restore` in
derselben Hauptversion benutzen wie den Server, sonst kennt der Restore
Direktiven nicht.

---

## Teil 1 — Bucket anlegen

In der Hetzner-Konsole ein Object-Storage-Bucket in **fsn1** (Falkenstein)
anlegen, dazu einen S3-Zugangsschlüssel.

> **Der Bucket muss privat bleiben.** Directus liefert Dateien über
> `/assets/:id` aus und wendet dabei die Berechtigungen an. Ein öffentlicher
> Bucket hebelt das aus: jeder könnte die Objekte direkt ziehen und auflisten —
> auch die Formular-Anhänge, die später in „3. Uploads" landen. Setz aus
> demselben Grund **kein** `STORAGE_S3_ACL=public-read`.

Zugangsschlüssel und Secret in den Passwortmanager, zusammen mit `KEY` und
`SECRET` aus Teil 0.

---

## Teil 2 — Dateien in den Bucket kopieren

Directus legt Objekte unter `<STORAGE_S3_ROOT>/<filename_disk>` ab. Ohne `ROOT`
liegen sie flach im Bucket-Wurzelverzeichnis — genau so, wie sie jetzt im Volume
liegen. Der Inhalt wird also 1:1 übernommen.

rclone auf dem Server der Quell-Instanz konfigurieren:

```ini
[hetzner]
type = s3
provider = Other
access_key_id = <Access Key>
secret_access_key = <Secret>
endpoint = https://fsn1.your-objectstorage.com
region = fsn1
acl = private
```

Pfad des Volumes finden und kopieren:

```bash
docker volume inspect <stack>_directus-uploads --format '{{.Mountpoint}}'
```

```bash
rclone copy /var/lib/docker/volumes/<…>/_data hetzner:<bucket> --progress
```

Danach gegenzählen — es müssen mindestens die 69 Originaldateien sein:

```bash
rclone ls hetzner:<bucket> | wc -l
```

> Mehr als 69 ist normal und richtig: Directus legt generierte Thumbnails und
> Transformationen im selben Verzeichnis ab. Mitkopieren schadet nicht, sie
> würden sich sonst beim ersten Abruf neu erzeugen.

---

## Teil 3 — Directus-Instanz in Coolify

Neue Ressource anlegen, Image `directus/directus:11.17.4`, Domain vergeben.
Environment Variables:

```
KEY=<derselbe Wert wie auf der Quelle>
SECRET=<derselbe Wert wie auf der Quelle>
PUBLIC_URL=https://<neue-directus-domain>
IP_TRUST_PROXY=true

STORAGE_LOCATIONS=s3
STORAGE_S3_DRIVER=s3
STORAGE_S3_KEY=<Hetzner Access Key>
STORAGE_S3_SECRET=<Hetzner Secret>
STORAGE_S3_BUCKET=<bucket>
STORAGE_S3_REGION=fsn1
STORAGE_S3_ENDPOINT=https://fsn1.your-objectstorage.com
STORAGE_S3_FORCE_PATH_STYLE=true
```

Der Name der Location (`s3`) taucht gleich in Teil 5 in der Datenbank wieder auf
— wenn du ihn anders nennst, dort mitziehen.

`FORCE_PATH_STYLE=true`, weil Hetzner virtual-hosted-style nur für Presigned
URLs vorsieht; Directus streamt die Dateien selbst und braucht das nicht.

Zwei Dinge, die im Compose fehlten und hier dazugehören:

```
EMAIL_TRANSPORT=smtp
EMAIL_FROM=<Absenderadresse>
EMAIL_SMTP_HOST=…
EMAIL_SMTP_PORT=…
EMAIL_SMTP_USER=…
EMAIL_SMTP_PASSWORD=…
EMAIL_SMTP_SECURE=…

RATE_LIMITER_ENABLED=true
RATE_LIMITER_STORE=memory

CORS_ENABLED=true
CORS_ORIGIN=https://www.svkoweg.de
```

`CORS_ORIGIN` ist nicht optional: das Frontend reicht Formulare seit dem Revert
wieder direkt aus dem Browser an Directus weiter, und das ist cross-origin. Ohne
die Zeile blockt der Browser die Einreichung. Für lokale Entwicklung
`http://localhost:3000` mit aufnehmen.

`RATE_LIMITER_STORE=redis` nur, wenn du auch einen Redis danebenstellst —
`memory` reicht für eine einzelne Instanz.

---

## Teil 4 — Datenbank restaurieren

Dump auf der Quelle ziehen:

```bash
pg_dump -Fc -U <user> -d directus -f koweg-$(date +%Y%m%d).pgc
```

Auf dem Ziel muss Directus **gestoppt** sein, sonst schreibt es während des
Restores in dieselben Tabellen. Directus einmal starten lassen (es legt die
Datenbank an), dann Container stoppen und das Schema leeren:

```bash
psql -U <user> -d directus -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

```bash
pg_restore -U <user> -d directus --no-owner --no-privileges koweg-20260803.pgc
```

Mit der Ausschlussliste aus Teil 0, falls PostGIS im Dump steckt:

```bash
pg_restore -U <user> -d directus --no-owner --no-privileges -L restore.list koweg-20260803.pgc
```

> **Der Admin-Login ist danach der der Quell-Instanz.** `ADMIN_EMAIL` und
> `ADMIN_PASSWORD` aus Coolify greifen nur beim allerersten Start gegen eine
> leere Datenbank — der Restore überschreibt diesen User wieder.

---

## Teil 5 — Dateien auf S3 umstellen

Alle 69 Zeilen zeigen noch auf `local`. Solange Directus gestoppt ist:

```sql
UPDATE directus_files SET storage = 's3';
```

Kontrolle:

```sql
SELECT storage, count(*) FROM directus_files GROUP BY storage;
```

Erwartet: eine Zeile, `s3 | 69`. Danach Directus starten.

---

## Teil 6 — Abnahme

**Speicherort greift**

```bash
curl -sI "https://<directus-domain>/assets/ac905071-0643-4337-8f53-48ed45b1ccf2" | head -1
```

Erwartet `HTTP/2 200`. Das ist die Datei aus `PUBLIC_FALLBACK_IMAGE_ID` — kommt
`403`/`404`, stimmt entweder der Objektschlüssel im Bucket nicht oder die
`storage`-Spalte wurde nicht umgestellt.

**Neuer Upload landet im Bucket**

Im Backend ein beliebiges Bild hochladen, dann:

```bash
rclone ls hetzner:<bucket> | tail -3
```

Die neue Datei muss auftauchen. Tut sie es nicht, greift `STORAGE_LOCATIONS`
nicht — Directus schreibt dann still weiter ins Container-Dateisystem, und beim
nächsten Neustart ist der Upload weg.

**Bucket ist nicht öffentlich**

```bash
curl -sI "https://fsn1.your-objectstorage.com/<bucket>/ac905071-0643-4337-8f53-48ed45b1ccf2.jpg" | head -1
```

Erwartet `HTTP/1.1 403`. Kommt hier `200`, ist der Bucket öffentlich lesbar und
die Directus-Berechtigungen sind umgehbar.

**Anonymer Lesezugriff**

```bash
curl -s "https://<directus-domain>/items/teams?fields=title&limit=3"
```

Erwartet JSON mit Mannschaften. Kommt `FORBIDDEN`, fehlen der public-Policy die
Leserechte und die Website bleibt leer.

**Statische Token haben den Restore überlebt**

```bash
curl -s -H "Authorization: Bearer jhRss0…" "https://<directus-domain>/users/me?fields=email" 
```

Erwartet der Frontend-Bot-User. Kommt `401`, stimmen `KEY`/`SECRET` nicht mit der
Quelle überein — dann [bootstrap-form-bot.py](scripts/bootstrap-form-bot.py)
gegen die neue Instanz laufen lassen und den Token neu setzen.

**E-Mail**

Im Backend „Passwort vergessen" für eine eigene Adresse auslösen. Kommt nichts
an, ist SMTP falsch konfiguriert — und dann funktionieren auch die
Formular-Benachrichtigungen aus [directus-emails/](directus-emails/README.md)
nicht.

---

## Teil 7 — Frontend

Eigene Coolify-Application aus diesem Repo, [Dockerfile](Dockerfile), Port 3000.

Diese vier Variablen müssen als **Build-Variable** markiert sein, nicht nur als
Runtime-Env — sie kommen aus `$env/static/public` und werden beim `pnpm build`
ins Bundle gebacken:

```
PUBLIC_DIRECTUS_URL=https://<neue-directus-domain>
PUBLIC_SITE_URL=https://www.svkoweg.de
PUBLIC_DIRECTUS_FORM_TOKEN=jhRss0…
PUBLIC_FALLBACK_IMAGE_ID=ac905071-0643-4337-8f53-48ed45b1ccf2
PUBLIC_ENABLE_VISUAL_EDITING=false
DRAFT_MODE_SECRET=<langer String>
```

Sind sie nur Runtime-Env, sind sie beim Build leer — der Build bricht ab oder
liefert eine Seite ohne Bilder. Ändert sich eine davon, muss **neu gebaut**
werden; ein Neustart genügt nicht.

`PUBLIC_DIRECTUS_FORM_TOKEN` landet im ausgelieferten JavaScript und ist für
jeden Besucher lesbar. Das ist nach dem Revert die bewusste Entscheidung — die
Policy des Bot-Users darf deshalb nie mehr können als Formulare einreichen und
Dateien bis 5 MB in „3. Uploads" hochladen.

---

## Checkliste

- [ ] `KEY` und `SECRET` der Quelle notiert und in Coolify eingetragen
- [ ] Directus auf `11.17.4` gepinnt
- [ ] PostGIS-Frage geklärt (`pg_extension` geprüft)
- [ ] Bucket in fsn1 angelegt, **privat**, Zugangsdaten im Passwortmanager
- [ ] Dateien kopiert, `rclone ls` zeigt ≥ 69 Objekte
- [ ] `STORAGE_*`, `EMAIL_*`, `CORS_*`, `RATE_LIMITER_ENABLED` gesetzt
- [ ] Dump gezogen, Schema geleert, Restore durchgelaufen
- [ ] `directus_files.storage` auf `s3`, Zählung stimmt
- [ ] `/assets/<fallback-id>` liefert 200
- [ ] Neuer Upload erscheint im Bucket
- [ ] Bucket-URL direkt liefert 403
- [ ] Anonymer Lesezugriff auf `teams` funktioniert
- [ ] Frontend-Token gilt weiter (sonst Bootstrap-Skript)
- [ ] Passwort-vergessen-Mail kommt an
- [ ] Frontend-Variablen als Build-Variable markiert, Website lädt inkl. Bilder

---

## Was danach noch offen ist

**Backup.** Coolifys SQL-Backup deckt Postgres ab, nicht den Bucket. In
`directus_files` stehen nach der Migration nur noch Verweise — die Bytes liegen
allein bei Hetzner. Ein versehentliches Löschen im Backend ist damit endgültig,
solange auf dem Bucket keine Versionierung aktiv ist. Prüf außerdem in der
Coolify-UI, ob der Postgres-Dienst dieser Instanz überhaupt einen Backups-Tab
anbietet — geplante Backups sind dort eine Funktion von Database-Ressourcen.

**Formular-Spam.** Der Directus-Rate-Limiter aus Teil 3 begrenzt die Frequenz,
nicht die Absicht. Der Form-Token steht öffentlich im Bundle; wer ihn nimmt, kann
`form_submissions` anlegen und Dateien in den Bucket schieben — das kostet bei
Object Storage direkt Geld. Ein Honeypot-Feld oder Turnstile im Formular wäre der
nächste sinnvolle Schritt.
