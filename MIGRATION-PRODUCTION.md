# Production aufsetzen: Directus-Migration + Hetzner Object Storage

Ziel: eine neue Directus-Instanz in Coolify, befüllt aus der bestehenden
(`directus.skeme.dev`), mit den Uploads in Hetzner Object Storage statt im
lokalen Volume.

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
| User | 52, davon 4 mit Rolle, 2 mit Passwort, 1 mit statischem Token |
| Geometry-Spalten | **keine** — PostGIS wird vom Schema nicht gebraucht |

## Zwei Wege

| | **Weg A — Template-CLI** | Weg B — DB-Restore |
|---|---|---|
| Dateien nach S3 | automatisch beim Apply | rclone + `UPDATE` von Hand |
| Passwörter | **gehen verloren** | kommen mit |
| Statische Token | **gehen verloren** | kommen mit (bei gleichem `SECRET`) |
| Revisions / Activity-Log | nein | ja |
| PostGIS, Postgres-Version | irrelevant | muss geklärt werden |
| Fehlerbild | kann teilweise durchlaufen | läuft oder läuft nicht |

**Diese Anleitung beschreibt Weg A.** Weg B steht als [Anhang A](#anhang-a--alternative-db-restore)
darunter, falls der Apply nicht sauber durchläuft.

> Die Extract-Hälfte von Weg A ist am 03.08.2026 durchgespielt und liegt
> vollständig vor — inklusive eines Workarounds für einen Bug der CLI bei
> Singleton-Collections (Teil 3). Ungetestet ist die Apply-Hälfte; sie braucht
> eine Zielinstanz. Die Tests in Teil 6 sind genau darauf gemünzt, allen voran
> der auf durchgesickerte Entwürfe.

Der Ausschlag für A: die CLI schiebt die Dateien über die Directus-API rein, und
Directus entscheidet anhand von `STORAGE_LOCATIONS`, wo die Bytes landen. Ist S3
vor dem Apply konfiguriert, gehen die 69 Dateien direkt in den Bucket — kein
rclone, kein `UPDATE directus_files`, keine PostGIS-Frage. Bezahlt wird das mit
den Zugangsdaten, und das sind hier **zwei Passwörter und ein Token**. Im Export
stehen sie als `**********` — das ist die Maskierung der Directus-API, kein Hash:

```
lukas.schneider@skeme.dev | pw: '**********' | token: None
koweg@skeme.dev           | pw: '**********' | token: '**********'
```

Die übrigen 50 User haben ohnehin keinen Login — das sind die Personendatensätze
für die Mannschaftsseiten.

---

## Teil 0 — Was vorher feststehen muss

**Directus-Version.** Die neue Instanz auf `directus/directus:11.17.4` pinnen,
identisch zur Quelle. Zum Versionsstand siehe [UPGRADE-DIRECTUS.md](UPGRADE-DIRECTUS.md).

**`KEY` und `SECRET`.** Coolify erzeugt beide selbst; sie müssen bei Weg A
**nicht** zur Quelle passen, weil nichts Verschlüsseltes mit herüberkommt. Kopier
sie trotzdem direkt nach dem ersten Deploy in den Passwortmanager — ein späteres
Datenbank-Backup ist ohne sie nicht brauchbar.

**Admin-Token der Quelle.** Für den Extract. Liegt in deiner lokalen `.env` als
`PUBLIC_DIRECTUS_TOKEN` (Webmaster-Account).

**Die Zielinstanz muss leer sein.** Die CLI ist für frische Projekte gebaut und
überspringt bei System-Collections vorhandene Einträge, statt sie zu
überschreiben. Ein zweiter Apply auf eine schon befüllte Instanz führt zu
Mischzuständen — dann lieber Datenbank und Volume wegwerfen und neu deployen.

---

## Teil 1 — Bucket anlegen

In der Hetzner-Konsole ein Object-Storage-Bucket in **fsn1** (Falkenstein)
anlegen, dazu einen S3-Zugangsschlüssel.

> **Der Bucket muss privat bleiben.** Directus liefert Dateien über
> `/assets/:id` aus und wendet dabei die Berechtigungen an. Ein öffentlicher
> Bucket hebelt das aus: jeder könnte die Objekte direkt ziehen und auflisten —
> auch die Formular-Anhänge, die später in „3. Uploads" landen. Setz aus
> demselben Grund **kein** `STORAGE_S3_ACL=public-read`.

Zugangsschlüssel und Secret in den Passwortmanager.

---

## Teil 2 — Directus-Instanz in Coolify

Neue Ressource anlegen, Image `directus/directus:11.17.4`, Domain vergeben.

**Das muss vor dem Apply stehen** — sonst schreibt Directus die Dateien ins
Container-Dateisystem und beim nächsten Neustart sind sie weg.

```
KEY=<von Coolify>
SECRET=<von Coolify>
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

### Prüfen, dass S3 greift — bevor Daten reingehen

Mit dem von Coolify erzeugten Admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) im Backend
anmelden und ein beliebiges Testbild hochladen. Dann in der Hetzner-Konsole
nachsehen, ob es im Bucket liegt.

Liegt es nicht dort, greift `STORAGE_LOCATIONS` nicht — **hier abbrechen und
zuerst das reparieren.** Alles Weitere würde sonst 127 MB an die falsche Stelle
schreiben. Testbild danach wieder löschen.

### Statischen Token für den Apply anlegen

Settings → Users → der Admin-User → Feld **Token** → generieren → speichern. Den
Wert notieren, er wird gleich gebraucht und ist danach nicht mehr auslesbar.

---

## Teil 3 — Template extrahieren

> **Erledigt am 03.08.2026.** Der Export liegt vollständig unter
> `directus-template/`. Dieser Teil ist nur nötig, wenn du ihn später auffrischen
> willst — dann genau so, nicht mit einem einzelnen Aufruf.

### Warum zwei Läufe

Ein normaler Extract bricht ab:

```
Error: Spread syntax requires ...iterable[Symbol.iterator] to be a function
 »   Context: {"collection":"globals","function":"getDataFromCollection"}
```

`globals` ist ein Singleton ([snapshot.yaml:958](snapshot.yaml:958)). Directus
liefert dafür unter `/items/globals` ein einzelnes **Objekt**, die CLI spreizt
aber pauschal ein Array. Der Extract stirbt alphabetisch bei Collection 33 von
45, direkt nach `forms`.

`--exclude-collections globals` löst das, entfernt die Collection laut Doku aber
aus **Schema und Content** — und `globals` wird gebraucht
([Footer.svelte:12](src/lib/components/layout/Footer.svelte:12),
[NavigationBar.svelte:13](src/lib/components/layout/NavigationBar.svelte:13)).

Der Ausweg: zwei Läufe, die sich nicht überschneiden. Der erste holt alles außer
Content — inklusive des `globals`-**Schemas**. Der zweite holt den Content ohne
`globals`. Zusammengelegt ergibt das ein vollständiges Template für einen
einzigen Apply. `globals` ist die einzige Singleton-Collection im Projekt, es
bleibt also bei diesem einen Sonderfall.

### Durchführung

```bash
rm -rf directus-template
```

> **Zielordner muss `directus-template/` heißen.** Der Pfad steht in
> [.gitignore](.gitignore), weil der Export Personendaten, User-Datensätze und
> den `openai_api_key` enthält. Extrahierst du woanders hin, landen 127 MB und
> Secrets im nächsten Commit.

Lauf 1 — alles außer Content, mit Assets:

```bash
npx directus-template-cli@latest extract -p --templateName="SV Koweg Directus" --templateLocation="./directus-template" --directusUrl="https://directus.skeme.dev" --directusToken="<PUBLIC_DIRECTUS_TOKEN aus .env>" --schema --files --permissions --settings --flows --users --dashboards --extensions
```

Lauf 2 — nur Content, ohne `globals` und ohne Assets:

```bash
npx directus-template-cli@latest extract -p --templateName="SV Koweg Content" --templateLocation="./.tmp-content" --directusUrl="https://directus.skeme.dev" --directusToken="<PUBLIC_DIRECTUS_TOKEN aus .env>" --content --exclude-collections globals --no-assets --relation-strategy=preserve
```

> **`--relation-strategy=preserve` gehört auch an den Extract, nicht nur an den
> Apply.** Ohne die Angabe gilt der Standard `empty`, und der verwirft
> Relationswerte **schon beim Export**. Am 03.08.2026 fehlten dadurch 10 Felder
> in der Exportdatei — `teams.image` (24 Zeilen), `pages.hero_image` (7),
> `posts.image` (5), `sponsors.image` (7) und weitere. Also praktisch jedes Bild
> der Website. Der Apply kann das nicht ausgleichen: was im Export fehlt, kommt
> nirgends her.

Zusammenlegen — die beiden Ergebnisse überschneiden sich nur in
`template-meta.json`, das aus Lauf 1 bleibt:

```bash
cp -r .tmp-content/src/content directus-template/src/ && rm -rf .tmp-content
```

### Ergebnis prüfen

```bash
python -c "import json; c=json.load(open('directus-template/src/collections.json',encoding='utf-8')); print('Collections:',len(c),'| globals:',any(x.get('collection')=='globals' for x in c))"
```

Erwartet: `Collections: 49 | globals: True`.

```bash
ls directus-template/src/assets | wc -l
```

```bash
ls directus-template/src/content | wc -l
```

Erwartet: 76 Assets (127,3 MB) und 45 Content-Dateien. Logs der Läufe liegen
unter `.directus-template-cli/logs/`.

---

## Teil 4 — Template anwenden

```bash
npx directus-template-cli@latest apply -p --directusUrl="https://<neue-directus-domain>" --directusToken="<Token aus Teil 2>" --templateLocation="./directus-template" --templateType="local" --relation-strategy=preserve
```

> **`--relation-strategy=preserve` ist Pflicht.** Es hält die UUIDs fest. Ohne
> das zeigt `PUBLIC_FALLBACK_IMAGE_ID=ac905071-…` ins Leere und sämtliche
> Bildverweise im Content brechen. Die Alternativen sind `empty` und `deep`.

Der Apply lädt Collections, Fields, Relations, Rollen, Policies, Permissions,
User, Accesses, Folders und Files. Bei 76 Dateien und 45 Content-Collections
dauert das mit der Drosselung eine Weile.

### Zwei Fallen, beide am 03.08.2026 aufgetreten

**1. `template-meta.json` entscheidet, nicht das Verzeichnis.** Beim Zusammenlegen
aus Teil 3 stammt die Metadatei aus Lauf 1 und sagt `"content": false`. Die CLI
überspringt das Content-Verzeichnis dann stillschweigend — der Apply meldet
trotzdem „successfully". Nach dem Zusammenlegen deshalb korrigieren:

```bash
python -c "import json; p='directus-template/src/template-meta.json'; m=json.load(open(p,encoding='utf-8')); m['components']={k:True for k in m['components']}; m['relationStrategy']='preserve'; json.dump(m,open(p,'w',encoding='utf-8'),indent=2)"
```

Die Kommandozeile schlägt die Metadatei allerdings bei `--relation-strategy` —
das ist nachweisbar, weil die 76 Dateien trotz `"empty"` in der Meta ihre UUIDs
und Ordnerzuordnungen behalten haben.

**2. Reihenfolge: Content vor Users.** Die Personendatensätze haben Felder
`related_team` und `related_department`. Laufen die User vor dem Content, sind
diese Collections noch leer und Directus lehnt jeden betroffenen User mit
`INVALID_FOREIGN_KEY` ab — beim ersten Versuch fielen so 37 von 53 User aus.
Deshalb in zwei Durchgängen:

```bash
npx directus-template-cli@latest apply -p --directusUrl="…" --directusToken="…" --templateLocation="./directus-template" --templateType="local" --content --relation-strategy=preserve
```

```bash
npx directus-template-cli@latest apply -p --directusUrl="…" --directusToken="…" --templateLocation="./directus-template" --templateType="local" --users --relation-strategy=preserve
```

### Nacharbeiten: leere Zeilen auffüllen

> **Ein Zählvergleich reicht nicht.** Die CLI legt Zeilen auch dann an, wenn das
> Schreiben der Felder scheitert — die Zeile hat die richtige ID und überall
> NULL. Anzahl Export = Anzahl Ziel sieht dann korrekt aus, während 24
> Mannschaften ohne Titel dastehen.

[repair-template-apply.py](scripts/repair-template-apply.py) vergleicht feldweise
und trägt nach, was im Export einen Wert hat und im Ziel leer ist. Vorhandene
Werte werden nie überschrieben, ein zweiter Lauf ändert also nichts.

```bash
python scripts/repair-template-apply.py --check
```

```bash
python scripts/repair-template-apply.py
```

Am 03.08.2026 waren es 78 Zeilen und 242 Felder in fünf Collections:
`departments`, `teams`, `teams_directus_users`, `block_person_card`,
`block_person_gallery_items`. Danach muss `--check` melden „Nichts nachzutragen".

### Zum Schluss gegen die Quelle prüfen, nicht gegen den Export

> **Das ist der wichtigste Test des ganzen Vorgangs.** `repair-template-apply.py`
> vergleicht Ziel gegen Export — ist der Export selbst lückenhaft, meldet es
> „sauber" und die Website stürzt trotzdem ab. Genau so ist es am 03.08.2026
> passiert: erst ein `500 TypeError: Cannot read properties of null (reading
> 'id')` im Footer hat gezeigt, dass sämtliche Bildreferenzen fehlten.

Der folgende Vergleich holt beide Instanzen live ab und prüft jedes Feld jeder
Content-Collection. Alias- und `date_*`/`user_*`-Felder bleiben außen vor:

```bash
python - <<'EOF'
import json,os,subprocess,urllib.request
from collections import Counter
g=lambda k:subprocess.check_output(["bash","-c",f"grep '^{k}=' .env | cut -d= -f2-"],text=True).strip()
SRC,STOK,TGT,TTOK=g('PUBLIC_DIRECTUS_URL'),g('PUBLIC_DIRECTUS_TOKEN'),g('TARGET_DIRECTUS_URL'),g('TARGET_DIRECTUS_TOKEN')
def get(u,t,c):
    r=urllib.request.Request(f'{u}/items/{c}?limit=-1',headers={'Authorization':f'Bearer {t}'})
    return json.load(urllib.request.urlopen(r,timeout=60))['data']
fl=json.load(open('directus-template/src/fields.json',encoding='utf-8'))
alias={(x['collection'],x['field']) for x in fl if x.get('type')=='alias' or x.get('schema') is None}
MAN={'date_created','user_created','date_updated','user_updated'}
bad=[]
for fn in sorted(os.listdir('directus-template/src/content')):
    c=fn[:-5]
    try: s=get(SRC,STOK,c); t={str(x.get('id')):x for x in get(TGT,TTOK,c)}
    except Exception: continue
    for row in s:
        cur=t.get(str(row.get('id')))
        if cur is None: bad.append((c,'*ZEILE FEHLT*')); continue
        for k,v in row.items():
            if (c,k) in alias or k in MAN: continue
            if v not in (None,'',[],{}) and cur.get(k) in (None,'',[],{}): bad.append((c,k))
for (c,f),n in Counter(bad).most_common(): print(f'  {c:28} {f:24} {n}x')
print('Ziel entspricht der Quelle.' if not bad else f'\n{len(bad)} Abweichungen')
EOF
```

Erwartet: `Ziel entspricht der Quelle.`

### Den globals-Datensatz nachziehen

Das Schema der Collection kommt über das Template mit, der eine Datensatz nicht
(siehe Teil 3). [copy-globals.py](scripts/copy-globals.py) holt ihn direkt von
Instanz zu Instanz. Zugangsdaten in die `.env` im Repo-Wurzelverzeichnis:

```
SOURCE_DIRECTUS_URL=https://directus.skeme.dev
SOURCE_DIRECTUS_TOKEN=<Admin-Token der Quelle>
TARGET_DIRECTUS_URL=https://<neue-directus-domain>
TARGET_DIRECTUS_TOKEN=<Token aus Teil 2>
```

Erst ansehen, was übertragen würde:

```bash
python scripts/copy-globals.py --check
```

Erwartet: 15 Felder, darunter `title`, `tagline`, `logo`, `favicon`,
`accent_color`, `main_sponsors` und `social_links`. Dann echt:

```bash
python scripts/copy-globals.py
```

Das Skript liest danach zurück und meldet Felder, die nicht angekommen sind.

> `logo`, `favicon` und `logo_dark_mode` sind UUID-Verweise auf Dateien. Sie
> stimmen nur, wenn der Apply mit `--relation-strategy=preserve` lief.

Ein Feld solltest du danach im Backend von Hand korrigieren: `directus_url`
steht auf der Quelle noch auf `http://0.0.0.0:8055`.

### Sofort danach prüfen: liegen die Dateien in S3?

Das ist die Annahme, auf der Weg A steht — sie ist in zwei Abfragen belegt oder
widerlegt.

```sql
SELECT storage, count(*) FROM directus_files GROUP BY storage;
```

Erwartet: eine einzige Zeile, `s3 | 69`. Steht dort `local`, hat Directus die
Dateien ins Container-Dateisystem geschrieben — dann Teil 2 nachziehen und
entweder neu anwenden oder auf [Anhang A](#anhang-a--alternative-db-restore)
wechseln.

Und die UUIDs:

```bash
curl -sI "https://<directus-domain>/assets/ac905071-0643-4337-8f53-48ed45b1ccf2" | head -1
```

Erwartet `HTTP/2 200`. Kommt `403`/`404`, hat `--relation-strategy` nicht
gegriffen und die IDs wurden neu vergeben — dann ist das Frontend nicht
lauffähig, weil überall andere IDs stehen als im Content.

---

## Teil 5 — Nacharbeit: Passwörter und Token

Was der Export nicht mitbringt, muss von Hand nach.

**Passwörter.** Für `lukas.schneider@skeme.dev` und `koweg@skeme.dev` im Backend
unter Settings → Users neu setzen. Der von Coolify erzeugte Admin funktioniert
weiter — aussperren kannst du dich also nicht.

**Form-Token.** Der Bot-User existiert nach dem Apply, aber ohne Token. Dein
Skript setzt genau den Wert, den das Frontend eingebacken bekommt:

```bash
python scripts/bootstrap-form-bot.py --check
```

Zeigt an, was passieren würde. Dann echt:

```bash
python scripts/bootstrap-form-bot.py
```

Das Skript liest `DIRECTUS_URL` und `PUBLIC_DIRECTUS_FORM_TOKEN` aus der `.env`
im Repo-Wurzelverzeichnis — die müssen dafür auf die **neue** Instanz zeigen.
Es legt Ordner, Policy, Rechte und den Bot-User idempotent an und ist
mehrfach ausführbar.

---

## Teil 6 — Abnahme

**Neuer Upload landet im Bucket**

Im Backend ein Bild hochladen, in der Hetzner-Konsole nachsehen. Taucht es nicht
auf, schreibt Directus still ins Container-Dateisystem und der Upload ist beim
nächsten Neustart weg.

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

Erwartet JSON mit Mannschaften. Kommt `FORBIDDEN`, sind die Permissions nicht
sauber übernommen worden und die Website bleibt leer. Das ist bei Weg A der
Punkt, der am ehesten schiefgeht — die Instanz hat 241 Permissions, davon 40 mit
Filterbedingungen.

**Gefilterte Leserechte greifen**

```bash
curl -s "https://<directus-domain>/items/posts?fields=title,status&limit=50" | grep -c draft
```

Erwartet `0`. Kommen Entwürfe zurück, fehlt die Filterbedingung
`status = published` — dann sind unveröffentlichte Beiträge öffentlich abrufbar.

**Form-Token gilt**

```bash
curl -s -H "Authorization: Bearer <PUBLIC_DIRECTUS_FORM_TOKEN>" "https://<directus-domain>/users/me?fields=email"
```

Erwartet der Frontend-Bot-User. Kommt `401`, hat Teil 5 nicht gegriffen.

**E-Mail**

Im Backend „Passwort vergessen" für eine eigene Adresse auslösen. Kommt nichts
an, ist SMTP falsch konfiguriert — und dann funktionieren auch die
Formular-Benachrichtigungen aus [directus-emails/](directus-emails/README.md)
nicht.

---

## Teil 7 — Frontend

Eigene Coolify-Application aus diesem Repo, [Dockerfile](Dockerfile), Port 3000.

Diese Variablen müssen als **Build-Variable** markiert sein, nicht nur als
Runtime-Env — sie kommen aus `$env/static/public` und werden beim `pnpm build`
ins Bundle gebacken:

```
PUBLIC_DIRECTUS_URL=https://<neue-directus-domain>
PUBLIC_SITE_URL=https://www.svkoweg.de
PUBLIC_DIRECTUS_FORM_TOKEN=<Wert aus Teil 5>
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

Zum Schluss im Browser eine Mannschaftsseite öffnen und prüfen, ob Bilder laden.
Tun sie es nicht, wurde mit falscher `PUBLIC_DIRECTUS_URL` gebaut.

---

## Checkliste

Stand 03.08.2026, Zielinstanz `https://cms.sv-koweg.de`.

- [x] Directus auf `11.17.4` gepinnt
- [ ] `KEY`/`SECRET` im Passwortmanager
- [x] Bucket in fsn1 angelegt, Zugangsdaten hinterlegt
- [x] `STORAGE_*` gesetzt und wirksam
- [x] Testupload landet im Bucket — **vor** dem Apply geprüft, Round-Trip gelesen
- [x] Statischer Token auf der Zielinstanz angelegt
- [x] Extrahiert nach `directus-template/` — 49 Collections, 76 Assets, 45 Content-Dateien
- [x] Apply mit `--relation-strategy=preserve`, Content **vor** Users
- [x] Content mit `--relation-strategy=preserve` **neu** extrahiert (erster Export war lückenhaft)
- [x] `repair-template-apply.py`: 78 + 64 Zeilen nachgetragen, `--check` sauber
- [x] Live-Vergleich Quelle ↔ Ziel: „Ziel entspricht der Quelle"
- [x] `copy-globals.py` gelaufen, `directus_url` korrigiert
- [x] `directus_files.storage` zeigt `s3 | 76`, alle 76 UUIDs und Ordner erhalten
- [x] `/assets/<fallback-id>` liefert 200
- [x] `bootstrap-form-bot.py` gelaufen, Token gilt, anonymer POST liefert 400
- [x] Anonymer Lesezugriff auf `teams` funktioniert, Trainer lösen auf
- [x] Keine Entwürfe in `posts` über die öffentliche API
- [ ] **Passwort setzen** für `lukas.schneider@skeme.dev` (Abteilungsleiter)
- [ ] **Demo-User entfernen**: `cms@example.com` (hat **Administrator**) und `writer@example.com`
- [ ] `EMAIL_*`, `CORS_ORIGIN`, `RATE_LIMITER_ENABLED` in Coolify nachtragen
- [ ] Bucket-URL direkt liefert 403
- [ ] Passwort-vergessen-Mail kommt an
- [ ] Frontend-Variablen als Build-Variable markiert, Website lädt inkl. Bilder

---

## Anhang A — Alternative: DB-Restore

Wenn der Apply nicht sauber durchläuft, oder wenn dir Passwörter, Token und das
Revisions-Log wichtiger sind als der einfachere Dateiweg. Hier kommt alles 1:1
mit, dafür müssen die Dateien von Hand in den Bucket.

Teil 1, 2, 6 und 7 von oben gelten unverändert. An die Stelle von Teil 3–5 tritt
Folgendes.

### A.0 Zusätzlich vorher klären

**`KEY` und `SECRET` müssen zur Quelle passen.** Hier kommen Sessions und die
statischen Token aus `directus_users.token` mit. Andere Werte machen im besten
Fall nur jede Session ungültig. Passen sie, gilt dein bestehender
`PUBLIC_DIRECTUS_FORM_TOKEN` weiter und Teil 5 entfällt.

**PostGIS im Dump.** Die Quelle fährt laut Compose `postgis/postgis:16`, und
dieses Image legt die Extension in der Projekt-Datenbank an. `pg_dump` schreibt
dann ein `CREATE EXTENSION … postgis` in den Dump — auf einem normalen
`postgres:16` scheitert der Restore daran. Prüfen:

```bash
psql -tAc "select extname from pg_extension"
```

Steht `postgis` dabei: entweder für die Production-DB ebenfalls ein
PostGIS-Image nehmen, oder die Extension aus dem Restore lassen. Letzteres ist
gefahrlos, weil keine einzige Spalte den Typ benutzt:

```bash
pg_restore -l dump.pgc | grep -v -i postgis > restore.list
```

**Postgres-Hauptversion.** Quelle ist 16. `pg_dump` und `pg_restore` in derselben
Hauptversion benutzen wie den Server.

### A.1 Volume finden

Alle Befehle auf dem Server der **Quell-Instanz**, als `root` (das Volume gehört
root).

```bash
docker volume ls --format '{{.Name}}' | grep -i upload
```

Findest du nichts, frag den Container, welches Volume auf `/directus/uploads`
liegt:

```bash
docker inspect <container> --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
```

```bash
VOL=<volume-name>
```

Gegenprobe:

```bash
docker run --rm -v $VOL:/data:ro alpine sh -c 'ls /data | wc -l; du -sh /data'
```

Erwartet eine Zahl ≥ 69 und rund 127 MB. Kommt `0` oder ein paar Kilobyte, zeigt
`$VOL` auf das falsche Volume.

### A.2 rclone-Zugang einrichten

rclone muss nicht installiert werden — das offizielle Image kann das Volume
direkt einhängen. Nur die Konfiguration anlegen:

```bash
mkdir -p /root/.config/rclone
```

```bash
cat > /root/.config/rclone/rclone.conf <<'EOF'
[hetzner]
type = s3
provider = Other
access_key_id = <Access Key>
secret_access_key = <Secret>
endpoint = https://fsn1.your-objectstorage.com
region = fsn1
acl = private
EOF
```

```bash
chmod 600 /root/.config/rclone/rclone.conf
```

> Die Zugangsdaten stehen dort im Klartext — deshalb `chmod 600`, und nach der
> Migration löschen.

```bash
RCLONE="docker run --rm -v /root/.config/rclone:/config/rclone -v $VOL:/data:ro rclone/rclone:latest"
```

### A.3 Verbindung testen

```bash
$RCLONE lsd hetzner:
```

Erwartet eine Zeile mit deinem Bucket-Namen.

| Meldung | Ursache |
|---|---|
| `SignatureDoesNotMatch` | Access Key oder Secret falsch |
| `AccessDenied` beim Auflisten | Der Schlüssel darf den Bucket nicht sehen |
| Leere Ausgabe, kein Fehler | Bucket liegt in einer anderen Location als `fsn1` |

```bash
BUCKET=<bucket-name>
```

### A.4 Probelauf und Kopieren

Directus legt Objekte unter `<STORAGE_S3_ROOT>/<filename_disk>` ab. Ohne `ROOT`
liegen sie flach im Bucket-Wurzelverzeichnis — genau wie jetzt im Volume. Der
Inhalt wird also 1:1 übernommen, ohne Umbenennen.

```bash
$RCLONE copy /data hetzner:$BUCKET --dry-run --progress
```

Steht am Ende `Transferred: 0`, zeigt `/data` ins Leere — zurück zu A.1.

```bash
$RCLONE copy /data hetzner:$BUCKET --progress --transfers=8
```

> Bewusst `copy`, nicht `sync`. `sync` würde im Ziel löschen, was in der Quelle
> fehlt. Wiederholst du den Befehl später versehentlich mit vertauschten
> Argumenten, ist `copy` das, was dir die Daten lässt.

### A.5 Prüfen

```bash
$RCLONE check /data hetzner:$BUCKET --one-way
```

Erwartet `0 differences found`. `--one-way` prüft nur, dass alles aus der Quelle
angekommen ist, und meckert nicht über zusätzliche Objekte im Bucket.

Beschwert sich rclone über fehlende Hashes statt über Unterschiede:

```bash
$RCLONE check /data hetzner:$BUCKET --one-way --size-only
```

```bash
$RCLONE ls hetzner:$BUCKET | wc -l
```

> Mehr als 69 ist normal: Directus legt generierte Thumbnails im selben
> Verzeichnis ab. **Weniger** als 69 heißt, dass Dateien fehlen.

### A.6 Datenbank restaurieren

Auf der Quelle:

```bash
pg_dump -Fc -U <user> -d directus -f koweg-$(date +%Y%m%d).pgc
```

Auf dem Ziel muss Directus **gestoppt** sein. Einmal starten lassen (es legt die
Datenbank an), dann Container stoppen und das Schema leeren:

```bash
psql -U <user> -d directus -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

```bash
pg_restore -U <user> -d directus --no-owner --no-privileges koweg-20260803.pgc
```

Mit der Ausschlussliste aus A.0, falls PostGIS im Dump steckt:

```bash
pg_restore -U <user> -d directus --no-owner --no-privileges -L restore.list koweg-20260803.pgc
```

> **Der Admin-Login ist danach der der Quell-Instanz.** `ADMIN_EMAIL` und
> `ADMIN_PASSWORD` aus Coolify greifen nur beim allerersten Start gegen eine
> leere Datenbank — der Restore überschreibt diesen User wieder.

### A.7 Dateien auf S3 umstellen

Alle 69 Zeilen zeigen noch auf `local`. Solange Directus gestoppt ist:

```sql
UPDATE directus_files SET storage = 's3';
```

```sql
SELECT storage, count(*) FROM directus_files GROUP BY storage;
```

Erwartet: `s3 | 69`. Danach Directus starten und mit Teil 6 weitermachen.

### A.8 Nachzügler und Aufräumen

Zwischen Kopie und Umschalten können in der Quelle noch Uploads dazukommen. Kurz
vor dem Restore denselben Befehl noch einmal — er überträgt nur die Differenz:

```bash
$RCLONE copy /data hetzner:$BUCKET --progress
```

```bash
rm /root/.config/rclone/rclone.conf
```

---

## Was danach noch offen ist

**Backup.** Coolifys SQL-Backup deckt Postgres ab, nicht den Bucket. In
`directus_files` stehen nach der Migration nur noch Verweise — die Bytes liegen
allein bei Hetzner. Ein versehentliches Löschen im Backend ist damit endgültig,
solange auf dem Bucket keine Versionierung aktiv ist. Prüf außerdem in der
Coolify-UI, ob der Postgres-Dienst dieser Instanz überhaupt einen Backups-Tab
anbietet — geplante Backups sind dort eine Funktion von Database-Ressourcen.

**Formular-Spam.** Der Directus-Rate-Limiter aus Teil 2 begrenzt die Frequenz,
nicht die Absicht. Der Form-Token steht öffentlich im Bundle; wer ihn nimmt, kann
`form_submissions` anlegen und Dateien in den Bucket schieben — das kostet bei
Object Storage direkt Geld. Ein Honeypot-Feld oder Turnstile im Formular wäre der
nächste sinnvolle Schritt.

**Der alte Export.** Nach der Migration liegt unter `directus-template/` ein
frischer Abzug mit Personendaten und dem `openai_api_key`. Der Pfad ist
gitignoriert, aber auf der Platte liegt er trotzdem — wegräumen, wenn du ihn
nicht mehr brauchst.
