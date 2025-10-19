# Node-Version passend zu deiner lokalen Umgebung
# Verwende ein aktuelles Node-Image mit weniger bekannten Schwachstellen
FROM node:20-alpine

# Optional: Installiere zusätzliche Abhängigkeiten, falls benötigt
# RUN apk add --no-cache ...


# Arbeitsverzeichnis
WORKDIR /app

# Dateien kopieren
COPY . .

# Pakete installieren
RUN npm ci

# Build
RUN npm run build

# Port, den SvelteKit verwendet
EXPOSE 3000

# App starten im Preview-Modus (du kannst auch npm run start verwenden bei node-adapter)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]