# Build from the monorepo root:
#   docker build -f admin/docker/test/Dockerfile -t sugarcube-admin:test .
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY admin/package.json ./admin/
COPY client/package.json ./client/
COPY client/schema/package.json ./client/schema/
COPY server/package.json ./server/
COPY server-core/package.json ./server-core/
COPY tests/package.json ./tests/

RUN npm ci

COPY client ./client
COPY admin ./admin
COPY admin/config/test/.env /app/admin/.env

RUN npm run build -w @sugarcube/schema \
 && npm run build -w @sugarcube/admin

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/admin/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
