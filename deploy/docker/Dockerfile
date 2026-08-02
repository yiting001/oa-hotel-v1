# syntax=docker/dockerfile:1

FROM node:22-bookworm AS builder

ARG OA_NPM_REGISTRY=https://registry.npmjs.org/
ARG VITE_OA_TIME_ZONE=Asia/Shanghai
ARG VITE_OA_COMPANY_NAME=东方饭店
ARG VITE_OA_PRODUCT_NAME=企业协同办公

ENV OA_NPM_REGISTRY=${OA_NPM_REGISTRY} \
    npm_config_registry=${OA_NPM_REGISTRY} \
    npm_config_replace_registry_host=always \
    VITE_OA_TIME_ZONE=${VITE_OA_TIME_ZONE} \
    VITE_OA_COMPANY_NAME=${VITE_OA_COMPANY_NAME} \
    VITE_OA_PRODUCT_NAME=${VITE_OA_PRODUCT_NAME}

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build:bundle -w @oa/api && npm run build -w @oa/web

FROM node:22-bookworm AS api-dependencies

ARG OA_NPM_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=${OA_NPM_REGISTRY} \
    npm_config_replace_registry_host=always

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ make python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /workspace/apps/api/release/package.json ./package.json
COPY --from=builder /workspace/apps/api/release/package-lock.json ./package-lock.json
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

FROM node:22-bookworm-slim AS api

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    OA_DATABASE_PATH=/app/data/oa.sqlite \
    OA_TIME_ZONE=Asia/Shanghai \
    OA_DEMO_SEED=false \
    OA_SWAGGER_ENABLED=false

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=api-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/apps/api/release/server.js ./server.js
COPY --from=builder --chown=node:node /workspace/apps/api/release/roster-import.js ./roster-import.js
COPY --from=builder --chown=node:node /workspace/apps/api/release/package.json ./package.json
COPY --from=builder --chown=node:node /workspace/apps/api/release/package-lock.json ./package-lock.json
COPY deploy/docker/api-entrypoint.sh /usr/local/bin/oa-api-entrypoint

RUN node roster-import.js --help >/dev/null \
    && chmod 755 /usr/local/bin/oa-api-entrypoint \
    && mkdir -p /app/data \
    && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/oa-api-entrypoint"]
CMD ["node", "server.js"]

FROM nginx:1.28-alpine AS web

COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -q -O - http://127.0.0.1/api/v1/health >/dev/null || exit 1
