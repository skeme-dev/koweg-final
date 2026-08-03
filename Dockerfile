# SvelteKit-Frontend (adapter-node), Port 3000.
#
# Wichtig: alle PUBLIC_*-Variablen kommen im Code aus `$env/static/public`,
# DRAFT_MODE_SECRET aus `$env/static/private`. "static" heisst: SvelteKit backt
# die Werte beim Build ins Bundle. Sie muessen deshalb als Build-Args gesetzt
# sein - sie zur Laufzeit zu setzen kommt zu spaet, und ein fehlender Wert
# laesst den Build fehlschlagen.

FROM node:22-alpine AS builder
WORKDIR /app

# Das Projekt ist auf pnpm gepinnt (packageManager in der package.json).
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG PUBLIC_DIRECTUS_URL
ARG PUBLIC_SITE_URL
ARG PUBLIC_DIRECTUS_FORM_TOKEN
ARG PUBLIC_ENABLE_VISUAL_EDITING=false
ARG PUBLIC_FALLBACK_IMAGE_ID
ARG DRAFT_MODE_SECRET

ENV PUBLIC_DIRECTUS_URL=$PUBLIC_DIRECTUS_URL \
    PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_DIRECTUS_FORM_TOKEN=$PUBLIC_DIRECTUS_FORM_TOKEN \
    PUBLIC_ENABLE_VISUAL_EDITING=$PUBLIC_ENABLE_VISUAL_EDITING \
    PUBLIC_FALLBACK_IMAGE_ID=$PUBLIC_FALLBACK_IMAGE_ID \
    DRAFT_MODE_SECRET=$DRAFT_MODE_SECRET

RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

EXPOSE 3000
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# adapter-node bringt keinen eigenen Healthcheck mit; die Startseite tut es.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "build"]
