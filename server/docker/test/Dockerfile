# Build from the monorepo root:
#   docker build -f server/docker/test/Dockerfile -t sugarcube-server:test .
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY client/schema/package.json ./client/schema/
COPY server/package.json ./server/
COPY server-core/package.json ./server-core/
COPY tests/package.json ./tests/

RUN npm ci

COPY client/schema ./client/schema
COPY server-core ./server-core
COPY server ./server

RUN npm run build -w @sugarcube/schema \
 && npm run build -w @sugarcube/server-core \
 && npm run build -w @sugarcube/server \
 && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/schema ./client/schema
COPY --from=build /app/server-core ./server-core
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/db ./server/db

WORKDIR /app/server

EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js"]
