# Node-Version passend zu deiner lokalen Umgebung
# Verwende ein aktuelles Node-Image mit weniger bekannten Schwachstellen
FROM node:22-alpine

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

ENV HOST=0.0.0.0
ENV PORT=3000

# adapter-node Build starten
CMD ["node", "build"]
