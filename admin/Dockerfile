# syntax=docker/dockerfile:1
FROM docker.io/library/node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9 --quiet

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build

FROM docker.io/library/nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
