# Directus-Extensions

Eigene Erweiterungen für die Directus-Instanz. Gehören im Container nach
`/directus/extensions/<name>/`.

| Extension | Zweck |
|---|---|
| `mail-subjects` | Deutsche Betreffzeilen für die System-Mails |

## mail-subjects

### Warum es die Extension braucht

Der Betreff steckt **nicht** in den Liquid-Templates unter
[directus-templates/](../directus-templates/), sondern im Code von Directus.
Die Service-Methoden nehmen zwar einen optionalen `subject` entgegen —

```js
async inviteUser(email, role, url, subject?) {
  const subjectLine = subject ?? "You've been invited";
```

— die REST-Controller reichen ihn aber nicht durch:

```js
await service.inviteUser(req.body.email, req.body.role, req.body.invite_url || null);
```

Drei Argumente, kein `subject`. Auch das Joi-Schema des Endpunkts kennt nur
`email`, `role` und `invite_url`. Über die API ist der Betreff damit nicht
setzbar, und beim Registrierungs-Template steht er ohnehin fest im Quelltext
(`'Verify your email address'`, mit einem TODO zur Übersetzung).

Der einzige saubere Hebel ist der Filter-Hook `email.send`, den die MailService
kurz vor dem Versand auslöst:

```js
const payload = await emitter.emitFilter(`email.send`, data, {});
if (!payload) return null;
```

Genau dort setzt die Extension an und ersetzt den Betreff anhand des
Templatenamens.

### Betreffzeilen ändern

In [mail-subjects/index.js](mail-subjects/index.js) oben:

```js
const SUBJECTS = {
  'user-invitation': 'Einladung zur Vereinsverwaltung',
  'password-reset': 'Passwort zurücksetzen',
  'user-registration': 'E-Mail-Adresse bestätigen',
};
```

Templatenamen, die dort nicht stehen, bleiben unangetastet — die
Formular-Benachrichtigungen aus den Flows laufen ohne Template über `html` und
sind davon nicht betroffen.

> **Immer das Payload zurückgeben.** Liefert ein `email.send`-Filter nichts,
> wirft Directus die Mail wortlos weg (`if (!payload) return null`). Die
> Extension gibt deshalb auf jedem Pfad `payload` zurück.

### Ausrollen

Wie bei den Templates: Der Ordner muss unter `/directus/extensions/` liegen.
Weil unsere Instanz ein Coolify-**Service** ist, sind Volumes im Dashboard
schreibgeschützt — sie gehören in die Compose-Datei.

Ein Volume für Extensions existiert vermutlich schon: die 14
Marketplace-Extensions aus dem Template-Apply müssen irgendwo liegen. Prüfen:

```sh
docker exec "$(docker ps --format '{{.Names}}' | grep -i directus | head -1)" ls /directus/extensions
```

Falls nicht, im Compose ergänzen:

```yaml
services:
  directus:
    volumes:
      - 'directus-extensions:/directus/extensions'

volumes:
  directus-extensions:
```

Dann vom **Server**-Terminal aus befüllen (`-u 0`, weil das Image `USER node`
setzt und ein frisches Volume `root` gehört):

```sh
docker exec -u 0 "$(docker ps --format '{{.Names}}' | grep -i directus | head -1)" sh -c 'mkdir -p /directus/extensions/mail-subjects && cd /directus/extensions/mail-subjects && B=https://raw.githubusercontent.com/skeme-dev/koweg-final/master/directus-extensions/mail-subjects; for f in index.js package.json; do wget -qO "$f" "$B/$f" && echo "ok $f"; done; ls -l'
```

Danach Directus **neu starten** — `EXTENSIONS_AUTO_RELOAD` ist standardmäßig
aus, eine neue Extension wird nur beim Start eingelesen.

### Prüfen, ob sie geladen wurde

```sh
docker logs "$(docker ps --format '{{.Names}}' | grep -i directus | head -1)" 2>&1 | grep -i "mail-subjects\|extension"
```

Directus protokolliert geladene Extensions beim Start. Taucht `mail-subjects`
nicht auf, stimmt entweder der Pfad nicht oder die `package.json` wurde nicht
als Extension erkannt — dann `directus:extension` darin gegenprüfen, `type`,
`path`, `source` und `host` sind Pflichtfelder.

Der Endtest bleibt ein Versand an eine Adresse, die du selbst liest.
