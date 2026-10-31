# Build from the monorepo root:
#   docker build -f client/docker/test/Dockerfile -t sugarcube-client:test .
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY client/schema/package.json ./client/schema/
COPY server/package.json ./server/
COPY server-core/package.json ./server-core/
COPY tests/package.json ./tests/

RUN npm ci

COPY client ./client
COPY client/config/test/.env /app/client/.env

RUN npm run build -w @sugarcube/client

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/client/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
